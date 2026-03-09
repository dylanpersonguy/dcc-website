"use client";

import { useEffect } from "react";
import { incrementPostViews } from "@/lib/actions/blog";

export default function ViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    const key = `blog_viewed_${postId}`;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(key)) return;

    sessionStorage.setItem(key, "1");
    incrementPostViews(postId).catch(() => {});
  }, [postId]);

  return null;
}
