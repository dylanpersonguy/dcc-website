"use client";

import { useState } from "react";
import { submitComment } from "@/lib/actions/blog";

export default function BlogCommentForm({ postId }: { postId: string }) {
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const fd = new FormData();
    fd.set("authorName", authorName);
    fd.set("authorEmail", authorEmail);
    fd.set("content", content);
    fd.set("website", ""); // honeypot

    try {
      const result = await submitComment(postId, fd);
      if (result.success) {
        setMessage({ type: "success", text: "Comment submitted! It will appear after moderation." });
        setAuthorName("");
        setAuthorEmail("");
        setContent("");
      } else {
        setMessage({ type: "error", text: result.error || "Failed to submit comment." });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred." });
    }
    setSubmitting(false);
  }

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-foreground text-sm focus:outline-none focus:border-primary/50";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Leave a Comment</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-foreground/60 block mb-1">Name *</label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            required
            maxLength={100}
            className={inputClass}
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="text-xs text-foreground/60 block mb-1">Email (optional)</label>
          <input
            type="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            className={inputClass}
            placeholder="your@email.com"
          />
        </div>
      </div>

      {/* Honeypot */}
      <input
        type="text"
        name="website"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div>
        <label className="text-xs text-foreground/60 block mb-1">Comment *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          maxLength={5000}
          rows={4}
          className={`${inputClass} resize-none`}
          placeholder="Write your comment..."
        />
        <p className="text-[10px] text-foreground/30 mt-1">{content.length}/5000</p>
      </div>

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/80 disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Comment"}
      </button>
    </form>
  );
}
