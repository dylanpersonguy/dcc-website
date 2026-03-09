"use client";

import { useState } from "react";
import { Link2, Twitter, Linkedin, MessageCircle, Check } from "lucide-react";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  function openPopup(href: string) {
    window.open(href, "share", "width=600,height=400,scrollbars=yes");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  }

  const btnClass =
    "flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors text-sm text-foreground/80";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className={btnClass}
        onClick={() =>
          openPopup(
            `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`
          )
        }
      >
        <Twitter className="w-4 h-4" /> Twitter
      </button>
      <button
        className={btnClass}
        onClick={() =>
          openPopup(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
          )
        }
      >
        <Linkedin className="w-4 h-4" /> LinkedIn
      </button>
      <button
        className={btnClass}
        onClick={() =>
          openPopup(
            `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`
          )
        }
      >
        <MessageCircle className="w-4 h-4" /> Reddit
      </button>
      <button className={btnClass} onClick={copyLink}>
        {copied ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Link2 className="w-4 h-4" />
        )}
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}
