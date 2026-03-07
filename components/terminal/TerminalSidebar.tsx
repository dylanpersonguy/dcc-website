"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Zap,
  Coins,
  ArrowLeftRight,
  Repeat,
  Send,
  Blocks,
  Globe,
  Search,
  Flame,
} from "lucide-react";
import type { TerminalMessage } from "@/lib/terminal";

interface SidebarProps {
  messages: TerminalMessage[];
  onSelectCommand: (cmd: string) => void;
}

/* ─── Collapsible section ─── */
function Section({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/[0.04]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <Icon className="w-3.5 h-3.5 text-muted/60" />
        <span className="text-[12px] font-semibold text-foreground uppercase tracking-wider flex-1 text-left">
          {title}
        </span>
        {open ? (
          <ChevronDown className="w-3 h-3 text-muted/40" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted/40" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Quick action button ─── */
function QuickAction({
  icon: Icon,
  label,
  command,
  color,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  command: string;
  color: string;
  onSelect: (cmd: string) => void;
}) {
  const colorClasses: Record<string, string> = {
    primary: "hover:text-primary hover:bg-primary/5 hover:border-primary/20",
    blue: "hover:text-blue-400 hover:bg-blue-400/5 hover:border-blue-400/20",
    green: "hover:text-green-400 hover:bg-green-400/5 hover:border-green-400/20",
    yellow: "hover:text-yellow-400 hover:bg-yellow-400/5 hover:border-yellow-400/20",
    purple: "hover:text-purple-400 hover:bg-purple-400/5 hover:border-purple-400/20",
    red: "hover:text-red-400 hover:bg-red-400/5 hover:border-red-400/20",
  };

  return (
    <button
      onClick={() => onSelect(command)}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-muted border border-transparent transition-all cursor-pointer ${colorClasses[color] || colorClasses.primary}`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-[12px] font-medium">{label}</span>
    </button>
  );
}

const QUICK_ACTIONS = [
  { icon: Blocks, label: "Block Height", command: "Block height", color: "blue" },
  { icon: Globe, label: "Network Status", command: "Network status", color: "blue" },
  { icon: Repeat, label: "Swap Pools", command: "List all pools", color: "green" },
  { icon: ArrowLeftRight, label: "Swap Quote", command: "Swap quote 1 DCC to wDAI", color: "yellow" },
  { icon: Send, label: "Send DCC", command: "Send 1 DCC to ", color: "primary" },
  { icon: Coins, label: "Create Token", command: "Create a token", color: "purple" },
  { icon: Flame, label: "Burn Tokens", command: "Burn tokens", color: "red" },
  { icon: Search, label: "Lookup TX", command: "Transaction info ", color: "blue" },
];

export default function TerminalSidebar({ messages, onSelectCommand }: SidebarProps) {
  // Extract user commands from messages
  const userMessages = messages
    .filter((m) => m.role === "user")
    .slice(-15)
    .reverse();

  return (
    <div className="h-full flex flex-col">
      {/* Quick Actions */}
      <Section title="Quick Actions" icon={Zap} defaultOpen={true}>
        <div className="space-y-0.5">
          {QUICK_ACTIONS.map((action, i) => (
            <QuickAction key={i} {...action} onSelect={onSelectCommand} />
          ))}
        </div>
      </Section>

      {/* History */}
      <Section title="History" icon={Clock} defaultOpen={true}>
        {userMessages.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-[11px] text-muted/40">No commands yet.</p>
            <p className="text-[10px] text-muted/30 mt-1">
              Try &quot;Block height&quot; or &quot;Help&quot;
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
            {userMessages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => onSelectCommand(msg.content)}
                className="w-full flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/[0.03] transition-colors group"
              >
                <span className="text-[11px] text-muted/30 mt-0.5 flex-shrink-0">{">"}</span>
                <span className="text-[11px] text-muted/60 group-hover:text-foreground/80 transition-colors line-clamp-2 leading-relaxed">
                  {msg.content}
                </span>
              </button>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
