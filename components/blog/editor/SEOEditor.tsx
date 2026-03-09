"use client";

import { calculateSEOScore } from "@/lib/blog-utils";
import type { SEOScoreResult } from "@/lib/blog-types";

/* ─── SERP Preview ─── */

export function SERPPreview({
  title,
  url,
  description,
}: {
  title: string;
  url: string;
  description: string;
}) {
  const titleLen = title.length;
  const descLen = description.length;

  return (
    <div className="p-4 rounded-xl bg-white border border-gray-200 font-sans space-y-1">
      <p className="text-xs text-gray-500">{url || "decentralchain.io/blog/..."}</p>
      <h3 className="text-[#1a0dab] text-lg leading-snug line-clamp-1 cursor-pointer hover:underline">
        {title || "Page Title"}
        <span className={`ml-2 text-xs ${titleLen > 60 ? "text-red-500" : "text-green-600"}`}>
          ({titleLen}/60)
        </span>
      </h3>
      <p className="text-sm text-gray-600 line-clamp-2">
        {description || "Meta description will appear here..."}
        <span className={`ml-1 text-xs ${descLen > 155 ? "text-red-500" : "text-green-600"}`}>
          ({descLen}/155)
        </span>
      </p>
    </div>
  );
}

/* ─── SEO Score Card ─── */

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 80
      ? "bg-green-500"
      : score >= 50
      ? "bg-yellow-500"
      : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-foreground/70">
        <span>{label}</span>
        <span>{score}/100</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function SEOScoreCard({ score }: { score: SEOScoreResult }) {
  const overallColor =
    score.overall >= 80
      ? "text-green-400"
      : score.overall >= 50
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-4">
      <div className="flex items-center gap-3">
        <div
          className={`text-3xl font-bold ${overallColor}`}
        >
          {score.overall}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">SEO Score</p>
          <p className="text-xs text-foreground/50">
            {score.overall >= 80
              ? "Great"
              : score.overall >= 50
              ? "Needs work"
              : "Poor"}
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <ScoreBar label="Title" score={score.titleScore} />
        <ScoreBar label="Description" score={score.descriptionScore} />
        <ScoreBar label="Keyword Density" score={score.keywordDensity} />
        <ScoreBar label="Readability" score={score.readability} />
        <ScoreBar label="Internal Links" score={score.internalLinks} />
        <ScoreBar label="Heading Structure" score={score.headingStructure} />
      </div>

      {score.issues.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-red-400">Issues</p>
          {score.issues.map((issue, i) => (
            <p key={i} className="text-xs text-foreground/60">
              ⚠ {issue}
            </p>
          ))}
        </div>
      )}

      {score.suggestions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-yellow-400">Suggestions</p>
          {score.suggestions.map((s, i) => (
            <p key={i} className="text-xs text-foreground/60">
              💡 {s}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Social Preview Cards ─── */

export function SocialPreviewCards({
  title,
  description,
  image,
}: {
  title: string;
  description: string;
  image?: string;
}) {
  return (
    <div className="space-y-4">
      {/* Facebook / OG Preview */}
      <div>
        <p className="text-xs text-foreground/50 mb-2">Facebook / Open Graph</p>
        <div className="rounded-xl border border-gray-300 overflow-hidden bg-white max-w-md">
          <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="w-full h-full object-cover" />
            ) : (
              "No Image"
            )}
          </div>
          <div className="p-3">
            <p className="text-[10px] text-gray-500 uppercase">decentralchain.io</p>
            <p className="text-sm font-semibold text-gray-900 line-clamp-2">
              {title || "Post Title"}
            </p>
            <p className="text-xs text-gray-500 line-clamp-1">
              {description || "Description..."}
            </p>
          </div>
        </div>
      </div>

      {/* Twitter Preview */}
      <div>
        <p className="text-xs text-foreground/50 mb-2">Twitter / X</p>
        <div className="rounded-2xl border border-gray-300 overflow-hidden bg-white max-w-md">
          <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="w-full h-full object-cover" />
            ) : (
              "No Image"
            )}
          </div>
          <div className="p-3">
            <p className="text-sm font-semibold text-gray-900 line-clamp-2">
              {title || "Post Title"}
            </p>
            <p className="text-xs text-gray-500 line-clamp-2">
              {description || "Description..."}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">decentralchain.io</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── SEO Editor ─── */

export function SEOEditor({
  seoTitle,
  seoDescription,
  slug,
  primaryKeyword,
  excerpt,
  content,
  noindex,
  onSeoTitleChange,
  onSeoDescriptionChange,
  onNoindexChange,
}: {
  seoTitle: string;
  seoDescription: string;
  slug: string;
  primaryKeyword: string;
  excerpt: string;
  content: string;
  noindex: boolean;
  onSeoTitleChange: (v: string) => void;
  onSeoDescriptionChange: (v: string) => void;
  onNoindexChange: (v: boolean) => void;
}) {
  const seoScore = calculateSEOScore({
    title: seoTitle,
    seoTitle,
    seoDescription,
    primaryKeyword,
    content,
    excerpt,
    slug,
  } as never);

  const titleLen = seoTitle.length;
  const descLen = seoDescription.length;

  // Keyword placement checks
  const kw = primaryKeyword.toLowerCase();
  const checks = kw
    ? [
        { label: "In SEO title", pass: seoTitle.toLowerCase().includes(kw) },
        { label: "In meta description", pass: seoDescription.toLowerCase().includes(kw) },
        { label: "In URL slug", pass: slug.toLowerCase().includes(kw.replace(/\s+/g, "-")) },
        { label: "In first paragraph", pass: content.split("\n\n")[0]?.toLowerCase().includes(kw) || false },
        { label: "In excerpt", pass: excerpt.toLowerCase().includes(kw) },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="text-sm font-medium text-foreground/80 block mb-1">
          SEO Title
          <span className={`ml-2 text-xs ${titleLen > 60 ? "text-red-400" : titleLen > 50 ? "text-yellow-400" : "text-green-400"}`}>
            {titleLen}/60
          </span>
        </label>
        <input
          type="text"
          value={seoTitle}
          onChange={(e) => onSeoTitleChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-foreground text-sm focus:outline-none focus:border-primary/50"
          placeholder="SEO-optimized title (max 60 chars)"
        />
        <div className="mt-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              titleLen <= 60 ? "bg-green-500" : "bg-red-500"
            }`}
            style={{ width: `${Math.min(100, (titleLen / 60) * 100)}%` }}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium text-foreground/80 block mb-1">
          Meta Description
          <span className={`ml-2 text-xs ${descLen > 155 ? "text-red-400" : descLen >= 120 ? "text-green-400" : "text-yellow-400"}`}>
            {descLen}/155
          </span>
        </label>
        <textarea
          value={seoDescription}
          onChange={(e) => onSeoDescriptionChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-foreground text-sm resize-none focus:outline-none focus:border-primary/50"
          placeholder="Meta description (120-155 chars ideal)"
        />
        <div className="mt-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              descLen >= 120 && descLen <= 155
                ? "bg-green-500"
                : descLen > 155
                ? "bg-red-500"
                : "bg-yellow-500"
            }`}
            style={{ width: `${Math.min(100, (descLen / 155) * 100)}%` }}
          />
        </div>
      </div>

      {/* Keyword placement */}
      {checks.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground/80">Keyword Placement</p>
          {checks.map((c) => (
            <p key={c.label} className="text-xs text-foreground/60">
              {c.pass ? "✅" : "❌"} {c.label}
            </p>
          ))}
        </div>
      )}

      {/* Noindex */}
      <label className="flex items-center gap-2 text-sm text-foreground/70 cursor-pointer">
        <input
          type="checkbox"
          checked={noindex}
          onChange={(e) => onNoindexChange(e.target.checked)}
          className="rounded"
        />
        Noindex this page
      </label>

      {/* SERP Preview */}
      <div>
        <p className="text-sm font-medium text-foreground/80 mb-2">SERP Preview</p>
        <SERPPreview
          title={seoTitle || "Your Post Title"}
          url={`decentralchain.io/blog/${slug || "your-post-slug"}`}
          description={seoDescription || "Your meta description will appear here..."}
        />
      </div>

      {/* Score Card */}
      <SEOScoreCard score={seoScore} />
    </div>
  );
}
