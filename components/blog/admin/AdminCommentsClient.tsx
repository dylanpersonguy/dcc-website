"use client";

import { useState, useTransition } from "react";
import { moderateComment, deleteComment, markCommentRead } from "@/lib/actions/blog";
import type { BlogComment } from "@/lib/blog-types";

interface AdminCommentsClientProps {
  initialComments: BlogComment[];
}

export default function AdminCommentsClient({ initialComments }: AdminCommentsClientProps) {
  const [comments, setComments] = useState(initialComments);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [isPending, startTransition] = useTransition();

  const filtered = comments.filter((c) => {
    if (filter === "ALL") return true;
    return c.status === filter;
  });

  const pendingCount = comments.filter((c) => c.status === "PENDING").length;

  function handleModerate(commentId: string, action: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      await moderateComment(commentId, action);
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, status: action, isRead: true } : c
        )
      );
    });
  }

  function handleDelete(commentId: string) {
    if (!confirm("Delete this comment permanently?")) return;
    startTransition(async () => {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    });
  }

  function handleMarkRead(commentId: string) {
    startTransition(async () => {
      await markCommentRead(commentId);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, isRead: true } : c))
      );
    });
  }

  return (
    <div>
      {/* Filter Bar */}
      <div className="flex gap-2 mb-6">
        {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-background"
                : "bg-white/[0.04] text-foreground/60 hover:bg-white/[0.08]"
            }`}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            {f === "PENDING" && pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {filtered.map((comment) => (
          <div
            key={comment.id}
            className={`bg-white/[0.02] rounded-xl border p-5 ${
              !comment.isRead
                ? "border-primary/30 bg-primary/[0.02]"
                : "border-white/[0.06]"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium text-foreground">
                    {comment.authorName}
                  </span>
                  {comment.authorEmail && (
                    <span className="text-foreground/40 text-sm">
                      {comment.authorEmail}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      comment.status === "PENDING"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : comment.status === "APPROVED"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {comment.status}
                  </span>
                  {!comment.isRead && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                      New
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/50 mb-2">
                  On: <strong>{comment.postTitle}</strong> ·{" "}
                  {new Date(comment.createdAt).toLocaleDateString()}
                </p>
                <p className="text-foreground/80 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>

              <div className="flex flex-col gap-2 flex-shrink-0">
                {comment.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => handleModerate(comment.id, "APPROVED")}
                      disabled={isPending}
                      className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleModerate(comment.id, "REJECTED")}
                      disabled={isPending}
                      className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
                {!comment.isRead && (
                  <button
                    onClick={() => handleMarkRead(comment.id)}
                    disabled={isPending}
                    className="px-3 py-1.5 bg-white/[0.04] text-foreground/50 rounded-lg text-xs hover:bg-white/[0.08] transition-colors disabled:opacity-50"
                  >
                    Mark Read
                  </button>
                )}
                <button
                  onClick={() => handleDelete(comment.id)}
                  disabled={isPending}
                  className="px-3 py-1.5 text-red-400/60 hover:text-red-400 text-xs disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-foreground/40">
            No comments to display.
          </div>
        )}
      </div>
    </div>
  );
}
