"use client";

import { analyzeReadability } from "@/lib/blog-utils";

export function ReadabilityAnalysis({ content }: { content: string }) {
  const analysis = analyzeReadability(content);
  const scoreColor =
    analysis.score >= 60
      ? "text-green-400"
      : analysis.score >= 40
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
      <div className="flex items-center gap-3">
        <div className={`text-2xl font-bold ${scoreColor}`}>
          {analysis.score}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Flesch Reading Ease</p>
          <p className="text-xs text-foreground/50">{analysis.gradeLevel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2 bg-white/[0.03] rounded-lg">
          <p className="text-foreground/50">Avg Sentence Length</p>
          <p className="text-foreground font-medium">{analysis.avgSentenceLength} words</p>
        </div>
        <div className="p-2 bg-white/[0.03] rounded-lg">
          <p className="text-foreground/50">Avg Word Length</p>
          <p className="text-foreground font-medium">{analysis.avgWordLength} chars</p>
        </div>
        <div className="p-2 bg-white/[0.03] rounded-lg">
          <p className="text-foreground/50">Passive Voice</p>
          <p className="text-foreground font-medium">{analysis.passiveVoiceCount} instances</p>
        </div>
      </div>

      {analysis.suggestions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-yellow-400">Suggestions</p>
          {analysis.suggestions.map((s, i) => (
            <p key={i} className="text-xs text-foreground/60">💡 {s}</p>
          ))}
        </div>
      )}
    </div>
  );
}
