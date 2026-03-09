"use client";

import { useState } from "react";
import { Link2, Check, X, Sparkles } from "lucide-react";
import { suggestInternalLinksAction, updateLinkRuleStatus } from "@/lib/actions/blog";

interface LinkRule {
  id: string;
  anchorText: string;
  placementHint: string;
  relevanceScore: number;
  status: string;
  toPost: { id: string; title: string; slug: string };
}

export function InternalLinkManager({
  postId,
  rules,
}: {
  postId: string;
  rules: LinkRule[];
}) {
  const [linkRules, setLinkRules] = useState(rules);
  const [loading, setLoading] = useState(false);

  async function handleSuggest() {
    setLoading(true);
    try {
      await suggestInternalLinksAction(postId);
      // Reload would be needed to see new rules — for now just signal success
    } catch {
      // noop
    }
    setLoading(false);
  }

  async function handleAction(ruleId: string, status: "APPROVED" | "REJECTED" | "INSERTED") {
    try {
      await updateLinkRuleStatus(ruleId, status);
      setLinkRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, status } : r))
      );
    } catch {
      // noop
    }
  }

  const statusColors: Record<string, string> = {
    SUGGESTED: "bg-blue-500/20 text-blue-300",
    APPROVED: "bg-green-500/20 text-green-300",
    REJECTED: "bg-red-500/20 text-red-300",
    INSERTED: "bg-purple-500/20 text-purple-300",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <Link2 className="w-4 h-4" /> Internal Links
        </p>
        <button
          type="button"
          onClick={handleSuggest}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs hover:bg-primary/30 disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {loading ? "Suggesting..." : "AI Suggest Links"}
        </button>
      </div>

      {linkRules.length === 0 ? (
        <p className="text-xs text-foreground/50">No link rules yet. Use AI to suggest internal links.</p>
      ) : (
        <div className="space-y-2">
          {linkRules.map((rule) => (
            <div
              key={rule.id}
              className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">
                  → {rule.toPost.title}
                </p>
                <p className="text-xs text-foreground/50">
                  Anchor: &quot;{rule.anchorText}&quot; · {rule.placementHint} · Score: {rule.relevanceScore}
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[rule.status] || ""}`}>
                {rule.status}
              </span>
              {rule.status === "SUGGESTED" && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleAction(rule.id, "APPROVED")}
                    className="p-1 rounded hover:bg-green-500/20 text-green-400"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(rule.id, "REJECTED")}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Internal Link Engine (Health Widget) ─── */

export function InternalLinkEngine({
  orphanStatus,
  linkScore,
  inboundCount,
  outboundCount,
  lastAudit,
}: {
  orphanStatus: string;
  linkScore: number;
  inboundCount: number;
  outboundCount: number;
  lastAudit?: string | null;
}) {
  const statusColors: Record<string, string> = {
    HEALTHY: "bg-green-500/20 text-green-300",
    AT_RISK: "bg-yellow-500/20 text-yellow-300",
    ORPHAN: "bg-red-500/20 text-red-300",
  };

  const scoreColor =
    linkScore >= 70 ? "bg-green-500" : linkScore >= 40 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Link Health</p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[orphanStatus] || ""}`}>
          {orphanStatus}
        </span>
      </div>

      <div>
        <div className="flex justify-between text-xs text-foreground/60 mb-1">
          <span>Link Score</span>
          <span>{linkScore}/100</span>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${scoreColor}`} style={{ width: `${linkScore}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-white/[0.03] rounded-lg text-center">
          <p className="text-foreground font-medium">{inboundCount}</p>
          <p className="text-foreground/50">Inbound</p>
        </div>
        <div className="p-2 bg-white/[0.03] rounded-lg text-center">
          <p className="text-foreground font-medium">{outboundCount}</p>
          <p className="text-foreground/50">Outbound</p>
        </div>
      </div>

      {lastAudit && (
        <p className="text-[10px] text-foreground/40">
          Last audit: {new Date(lastAudit).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
