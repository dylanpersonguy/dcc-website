"use client";

import { useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { analyzeCompetitorGapsAction } from "@/lib/actions/blog";

export function CompetitorIntelligence({
  postId,
  competitorUrls,
  existingReport,
  snapshotDate,
  onUrlsChange,
}: {
  postId?: string;
  competitorUrls: string[];
  existingReport?: string | null;
  snapshotDate?: string | null;
  onUrlsChange: (urls: string[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(existingReport || "");

  async function handleAnalyze() {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await analyzeCompetitorGapsAction(postId);
      if (res.success) setReport(res.report);
    } catch (e) {
      setReport(`Error: ${e instanceof Error ? e.message : "Failed"}`);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-foreground/60" />
        <p className="text-sm font-medium text-foreground">Competitor Intelligence</p>
      </div>

      <div>
        <label className="text-xs text-foreground/60 block mb-1">Competitor URLs (one per line)</label>
        <textarea
          value={competitorUrls.join("\n")}
          onChange={(e) => onUrlsChange(e.target.value.split("\n").filter(Boolean))}
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-foreground text-xs font-mono resize-none focus:outline-none focus:border-primary/50"
          placeholder="https://competitor1.com/article&#10;https://competitor2.com/article"
        />
      </div>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={loading || !postId || competitorUrls.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs hover:bg-primary/30 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
        {loading ? "Analyzing..." : "Run Gap Analysis"}
      </button>

      {snapshotDate && (
        <p className="text-[10px] text-foreground/40">
          Last analysis: {new Date(snapshotDate).toLocaleDateString()}
        </p>
      )}

      {report && (
        <pre className="text-xs text-foreground/70 bg-white/[0.03] p-3 rounded-lg overflow-auto max-h-64 whitespace-pre-wrap">
          {report}
        </pre>
      )}
    </div>
  );
}
