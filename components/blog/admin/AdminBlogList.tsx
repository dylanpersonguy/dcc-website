"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { deleteBlogPost } from "@/lib/actions/blog";
import type { BlogPostListItem } from "@/lib/blog-types";
import { BLOG_CATEGORY_LABELS, BLOG_CATEGORY_ICONS } from "@/lib/blog-constants";
import type { BlogCategory } from "@/lib/blog-types";

interface AdminBlogListProps {
  initialPosts: BlogPostListItem[];
  stats: {
    total: number;
    published: number;
    drafts: number;
    totalViews: number;
    totalComments: number;
  };
}

export default function AdminBlogList({ initialPosts, stats }: AdminBlogListProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [filter, setFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const filtered = posts.filter((p) => {
    if (filter === "PUBLISHED" && p.status !== "PUBLISHED") return false;
    if (filter === "DRAFT" && p.status !== "DRAFT") return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function handleDelete(postId: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteBlogPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    });
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total Posts", value: stats.total },
          { label: "Published", value: stats.published },
          { label: "Drafts", value: stats.drafts },
          { label: "Total Views", value: stats.totalViews.toLocaleString() },
          { label: "Comments", value: stats.totalComments },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]"
          >
            <p className="text-foreground/50 text-sm">{s.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="flex gap-2">
          {(["ALL", "PUBLISHED", "DRAFT"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-background"
                  : "bg-white/[0.04] text-foreground/60 hover:bg-white/[0.08]"
              }`}
            >
              {f === "ALL" ? "All" : f === "PUBLISHED" ? "Published" : "Drafts"}
            </button>
          ))}
        </div>
        <Link
          href="/admin/blog/new"
          className="px-5 py-2.5 bg-primary text-background rounded-lg font-medium hover:bg-primary/90 transition-colors text-center"
        >
          + New Post
        </Link>
      </div>

      {/* Posts Table */}
      <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-foreground/50 font-medium">
                  Title
                </th>
                <th className="text-left px-4 py-3 text-foreground/50 font-medium hidden sm:table-cell">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-foreground/50 font-medium hidden md:table-cell">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-foreground/50 font-medium hidden lg:table-cell">
                  Views
                </th>
                <th className="text-left px-4 py-3 text-foreground/50 font-medium hidden lg:table-cell">
                  SEO
                </th>
                <th className="text-right px-4 py-3 text-foreground/50 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/blog/${post.id}/edit`}
                      className="text-foreground hover:text-primary transition-colors font-medium"
                    >
                      {post.title}
                    </Link>
                    {post.primaryKeyword && (
                      <p className="text-foreground/40 text-xs mt-0.5">
                        🔑 {post.primaryKeyword}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-foreground/60">
                      {BLOG_CATEGORY_ICONS[post.blogCategory as BlogCategory]}{" "}
                      {BLOG_CATEGORY_LABELS[post.blogCategory as BlogCategory]}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        post.status === "PUBLISHED"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-foreground/60">
                    {post.views.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {post.orphanStatus === "ORPHAN" && (
                      <span className="text-red-400 text-xs">Orphan</span>
                    )}
                    {post.cannibalizationRisk === "HIGH" && (
                      <span className="text-orange-400 text-xs ml-1">
                        Cannibalization
                      </span>
                    )}
                    {post.orphanStatus !== "ORPHAN" &&
                      post.cannibalizationRisk !== "HIGH" && (
                        <span className="text-green-400 text-xs">OK</span>
                      )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {post.status === "PUBLISHED" && (
                        <Link
                          href={`/blog/${post.slug}`}
                          className="text-foreground/40 hover:text-primary text-xs"
                          target="_blank"
                        >
                          View
                        </Link>
                      )}
                      <Link
                        href={`/admin/blog/${post.id}/edit`}
                        className="text-foreground/40 hover:text-primary text-xs"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(post.id, post.title)}
                        disabled={isPending}
                        className="text-red-400/60 hover:text-red-400 text-xs disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-foreground/40"
                  >
                    No posts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
