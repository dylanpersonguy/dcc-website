"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Play,
  Pause,
  Trash2,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  ArrowLeftRight,
  Send,
  Flame,
  Sparkles,
  Bell,
  TrendingUp,
  Blocks,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  loadAutomations,
  cancelAutomation,
  pauseAutomation,
  resumeAutomation,
  deleteAutomation,
  tickAutomations,
  formatNextRun,
  formatAutomationType,
  type Automation,
  type AutomationType,
  type AutomationStatus,
} from "@/lib/automations";
import { processCommand } from "@/lib/terminal";
import { useWallet } from "@/lib/wallet-context";

/* ─── Icon map ─── */
function AutoIcon({ type }: { type: AutomationType }) {
  const map: Record<string, React.ComponentType<{ className?: string }>> = {
    "scheduled-swap": ArrowLeftRight,
    "scheduled-send": Send,
    "scheduled-burn": Flame,
    "scheduled-mint": Sparkles,
    "price-alert": TrendingUp,
    "price-trigger-swap": Zap,
    "balance-alert": Bell,
    "block-monitor": Blocks,
    "telegram-price": MessageSquare,
    "telegram-summary": MessageSquare,
    "telegram-tx-alert": Bell,
    "recurring-report": Clock,
  };
  const Icon = map[type] || Clock;
  return <Icon className="w-3.5 h-3.5" />;
}

function StatusDot({ status }: { status: AutomationStatus }) {
  const colors: Record<AutomationStatus, string> = {
    active: "bg-green-400",
    paused: "bg-yellow-400",
    completed: "bg-blue-400",
    failed: "bg-red-400",
    cancelled: "bg-muted/30",
  };
  return <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors[status]}`} />;
}

/* ─── Compact sidebar automation item ─── */
function SidebarAutoItem({
  automation,
  onRefresh,
}: {
  automation: Automation;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isTerminal = automation.status === "completed" || automation.status === "cancelled" || automation.status === "failed";

  const typeColor: Record<string, string> = {
    "scheduled-swap": "text-yellow-400 bg-yellow-400/10",
    "scheduled-send": "text-primary bg-primary/10",
    "scheduled-burn": "text-red-400 bg-red-400/10",
    "scheduled-mint": "text-purple-400 bg-purple-400/10",
    "price-alert": "text-green-400 bg-green-400/10",
    "price-trigger-swap": "text-orange-400 bg-orange-400/10",
    "balance-alert": "text-blue-400 bg-blue-400/10",
    "block-monitor": "text-blue-400 bg-blue-400/10",
    "telegram-price": "text-cyan-400 bg-cyan-400/10",
    "telegram-summary": "text-cyan-400 bg-cyan-400/10",
    "telegram-tx-alert": "text-cyan-400 bg-cyan-400/10",
    "recurring-report": "text-muted bg-white/[0.04]",
  };

  return (
    <div className={`${isTerminal ? "opacity-50" : ""}`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors text-left group"
      >
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColor[automation.action.type] || "text-muted bg-white/[0.04]"}`}>
          <AutoIcon type={automation.action.type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <StatusDot status={automation.status} />
            <span className="text-[12px] font-medium text-foreground truncate">{automation.name}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted/40 mt-0.5">
            <span>{automation.runCount}{automation.schedule.maxRuns ? `/${automation.schedule.maxRuns}` : ""}</span>
            {automation.nextRunAt && <span>Next: {formatNextRun(automation)}</span>}
          </div>
        </div>
        {expanded ? <ChevronDown className="w-3 h-3 text-muted/30" /> : <ChevronRight className="w-3 h-3 text-muted/30" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 ml-8 space-y-1.5">
              <p className="text-[10px] text-muted/50 leading-relaxed">{automation.description}</p>
              {automation.schedule.timeOfDay && (
                <p className="text-[10px] text-muted/40">⏰ {automation.schedule.timeOfDay}</p>
              )}
              {automation.condition && (
                <p className="text-[10px] text-yellow-400/70">📊 {automation.condition.direction} ${automation.condition.threshold}</p>
              )}
              {automation.telegram && (
                <p className="text-[10px] text-cyan-400/70">📱 Telegram connected</p>
              )}
              {/* Last run */}
              {automation.runs.length > 0 && (
                <div className="text-[10px] text-muted/40">
                  Last: {new Date(automation.runs[automation.runs.length - 1].timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {automation.runs[automation.runs.length - 1].success ? " ✓" : " ✗"}
                </div>
              )}
              {/* Controls */}
              <div className="flex items-center gap-1 pt-1">
                {!isTerminal && (
                  <button
                    onClick={() => { automation.status === "active" ? pauseAutomation(automation.id) : resumeAutomation(automation.id); onRefresh(); }}
                    className="px-2 py-1 rounded text-[10px] text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
                  >
                    {automation.status === "active" ? <><Pause className="w-2.5 h-2.5 inline mr-0.5" /> Pause</> : <><Play className="w-2.5 h-2.5 inline mr-0.5" /> Resume</>}
                  </button>
                )}
                {!isTerminal && (
                  <button
                    onClick={() => { cancelAutomation(automation.id); onRefresh(); }}
                    className="px-2 py-1 rounded text-[10px] text-muted hover:text-red-400 transition-colors"
                  >
                    <XCircle className="w-2.5 h-2.5 inline mr-0.5" /> Stop
                  </button>
                )}
                <button
                  onClick={() => {
                    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 2500); return; }
                    deleteAutomation(automation.id); onRefresh();
                  }}
                  className={`px-2 py-1 rounded text-[10px] transition-colors ${confirmDelete ? "text-red-400 bg-red-400/10" : "text-muted hover:text-red-400"}`}
                >
                  <Trash2 className="w-2.5 h-2.5 inline mr-0.5" /> {confirmDelete ? "Sure?" : "Del"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/* AutomationsPanel — Sidebar version          */
/* ═══════════════════════════════════════════ */

interface AutomationsPanelProps {
  onOpenChat: (command?: string) => void;
}

export default function AutomationsPanel({ onOpenChat }: AutomationsPanelProps) {
  const { account, isConnected, getSeed } = useWallet();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(() => {
    setAutomations(loadAutomations());
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 5000);
    return () => clearInterval(iv);
  }, [refresh]);

  // Automation tick engine — runs every 30s
  useEffect(() => {
    const executeCommand = async (command: string) => {
      const result = await processCommand(command, {
        isConnected,
        address: account?.address,
        seed: getSeed(),
      }, { autoSign: true });
      return result.content;
    };

    tickRef.current = setInterval(() => {
      tickAutomations(executeCommand).then(refresh);
    }, 30_000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isConnected, account?.address, getSeed, refresh]);

  const filtered = automations.filter((a) => {
    if (filter === "active") return a.status === "active" || a.status === "paused";
    if (filter === "done") return a.status === "completed" || a.status === "failed" || a.status === "cancelled";
    return true;
  });

  const activeCount = automations.filter((a) => a.status === "active").length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-3 border-b border-white/[0.04]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-heading text-[13px] font-semibold text-foreground">Automations</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[9px] font-medium">
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={() => onOpenChat("Swap 1 DCC to USDC every day for 7 days")}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted hover:text-primary transition-colors"
            title="Create automation via chat"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mini filter */}
        {automations.length > 0 && (
          <div className="flex items-center gap-0.5">
            {(["all", "active", "done"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  filter === f ? "bg-white/[0.06] text-foreground" : "text-muted/50 hover:text-muted"
                }`}
              >
                {f === "all" ? `All (${automations.length})` : f === "active" ? "Active" : "Done"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {automations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
              <Clock className="w-4.5 h-4.5 text-muted/30" />
            </div>
            <p className="text-[12px] text-muted/50 mb-0.5">No automations</p>
            <p className="text-[10px] text-muted/30 mb-3 leading-relaxed">
              Use the chat to create scheduled swaps, price alerts, and more.
            </p>
            <div className="space-y-0.5 w-full">
              {[
                { label: "DCA swap daily", cmd: "Swap 1 DCC to USDC every day for 7 days" },
                { label: "Price alert", cmd: "Alert me if DCC drops below $0.50" },
                { label: "Recurring send", cmd: "Send 10 DCC to 3P... every week" },
              ].map((ex, i) => (
                <button
                  key={i}
                  onClick={() => onOpenChat(ex.cmd)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[11px] text-muted/60 hover:text-foreground hover:bg-white/[0.03] transition-all group"
                >
                  <span className="text-muted/20 group-hover:text-primary text-[10px]">{">"}</span>
                  <span className="truncate">{ex.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-1">
            <AnimatePresence mode="popLayout">
              {filtered.map((auto) => (
                <SidebarAutoItem key={auto.id} automation={auto} onRefresh={refresh} />
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <p className="text-[11px] text-muted/30 text-center py-4">No {filter} automations</p>
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      {automations.length > 0 && (
        <div className="px-3 py-2 border-t border-white/[0.04]">
          <p className="text-[9px] text-muted/25 text-center leading-relaxed">
            Automations run while this tab is open. Engine checks every 30s.
          </p>
        </div>
      )}
    </div>
  );
}
