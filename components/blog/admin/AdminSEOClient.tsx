"use client";

import { useState, useTransition } from "react";
import { runSiteAudit, getSitemapHealth } from "@/lib/actions/seo";

interface AuditResult {
  totalIndexablePages: number;
  noindexPages: number;
  orphanPosts: number;
  thinPosts: number;
  missingTitles: number;
  missingDescriptions: number;
  missingImages: number;
  duplicateKeywords: { keyword: string; posts: { id: string; title: string }[] }[];
  avgSeoScore: number;
  postScores: { id: string; title: string; slug: string; score: number }[];
}

interface SitemapHealth {
  publishedPosts: number;
  drafts: number;
  noindexPosts: number;
  categories: number;
  activeRedirects: number;
  totalSitemapUrls: number;
}

export default function AdminSEOClient() {
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [sitemap, setSitemap] = useState<SitemapHealth | null>(null);
  const [activeTab, setActiveTab] = useState<"audit" | "sitemap">("audit");
  const [isPending, startTransition] = useTransition();

  function handleRunAudit() {
    startTransition(async () => {
      const result = await runSiteAudit();
      setAudit(result);
    });
  }

  function handleSitemapHealth() {
    startTransition(async () => {
      const result = await getSitemapHealth();
      setSitemap(result);
    });
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "audit"
              ? "bg-primary text-background"
              : "bg-white/[0.04] text-foreground/60 hover:bg-white/[0.08]"
          }`}
        >
          Site Audit
        </button>
        <button
          onClick={() => setActiveTab("sitemap")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "sitemap"
              ? "bg-primary text-background"
              : "bg-white/[0.04] text-foreground/60 hover:bg-white/[0.08]"
          }`}
        >
          Sitemap Health
        </button>
      </div>

      {/* Site Audit Tab */}
      {activeTab === "audit" && (
        <div>
          <button
            onClick={handleRunAudit}
            disabled={isPending}
            className="px-5 py-2.5 bg-primary text-background rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 mb-6"
          >
            {isPending ? "Running Audit..." : "Run Site Audit"}
          </button>

          {audit && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Indexable Pages", value: audit.totalIndexablePages, color: "text-green-400" },
                  { label: "Orphan Pages", value: audit.orphanPosts, color: audit.orphanPosts > 0 ? "text-red-400" : "text-green-400" },
                  { label: "Thin Content", value: audit.thinPosts, color: audit.thinPosts > 0 ? "text-yellow-400" : "text-green-400" },
                  { label: "Avg SEO Score", value: `${audit.avgSeoScore}%`, color: audit.avgSeoScore >= 80 ? "text-green-400" : audit.avgSeoScore >= 60 ? "text-yellow-400" : "text-red-400" },
                  { label: "Missing Titles", value: audit.missingTitles, color: audit.missingTitles > 0 ? "text-red-400" : "text-green-400" },
                  { label: "Missing Descriptions", value: audit.missingDescriptions, color: audit.missingDescriptions > 0 ? "text-red-400" : "text-green-400" },
                  { label: "Missing Images", value: audit.missingImages, color: audit.missingImages > 0 ? "text-yellow-400" : "text-green-400" },
                  { label: "Duplicate Keywords", value: audit.duplicateKeywords.length, color: audit.duplicateKeywords.length > 0 ? "text-orange-400" : "text-green-400" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]"
                  >
                    <p className="text-foreground/50 text-sm">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Per-Post Scores */}
              <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <h3 className="font-medium text-foreground">Post SEO Scores</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left px-4 py-2 text-foreground/50 font-medium">
                          Post
                        </th>
                        <th className="text-left px-4 py-2 text-foreground/50 font-medium">
                          Score
                        </th>
                        <th className="text-left px-4 py-2 text-foreground/50 font-medium">
                          Issues
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.postScores
                        .sort((a, b) => a.score - b.score)
                        .map((post) => (
                          <tr
                            key={post.id}
                            className="border-b border-white/[0.04]"
                          >
                            <td className="px-4 py-2">
                              <a
                                href={`/admin/blog/${post.id}/edit`}
                                className="text-foreground hover:text-primary"
                              >
                                {post.title}
                              </a>
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className={`font-mono font-medium ${
                                  post.score >= 80
                                    ? "text-green-400"
                                    : post.score >= 60
                                    ? "text-yellow-400"
                                    : "text-red-400"
                                }`}
                              >
                                {post.score}%
                              </span>
                            </td>
                            <td className="px-4 py-2 text-foreground/50">
                              {post.score >= 80 ? "No major issues" : post.score >= 60 ? "Needs improvement" : "Critical issues"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sitemap Health Tab */}
      {activeTab === "sitemap" && (
        <div>
          <button
            onClick={handleSitemapHealth}
            disabled={isPending}
            className="px-5 py-2.5 bg-primary text-background rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 mb-6"
          >
            {isPending ? "Checking..." : "Check Sitemap Health"}
          </button>

          {sitemap && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Published Posts", value: sitemap.publishedPosts },
                { label: "Draft Posts", value: sitemap.drafts },
                { label: "Noindex Posts", value: sitemap.noindexPosts },
                { label: "Categories", value: sitemap.categories },
                { label: "Active Redirects", value: sitemap.activeRedirects },
                { label: "Total Sitemap URLs", value: sitemap.totalSitemapUrls },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]"
                >
                  <p className="text-foreground/50 text-sm">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <a
              href="/blog/sitemap.xml"
              target="_blank"
              className="text-primary hover:underline text-sm"
            >
              View sitemap.xml →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
