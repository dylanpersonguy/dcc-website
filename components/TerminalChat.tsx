"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  User,
  Loader2,
  ArrowUp,
} from "lucide-react";
import { processCommand, type TerminalMessage } from "@/lib/terminal";
import { useI18n } from "@/lib/i18n";
import { useWallet } from "@/lib/wallet-context";
import TerminalSettings, { DEFAULT_SETTINGS, type TerminalSettingsState } from "@/components/TerminalSettings";
import { TerminalDataCard } from "@/components/terminal/TerminalCards";

const SUGGESTED_ACTIONS = [
  { emoji: "📦", label: "What's the current block height?", command: "What's the current block height?" },
  { emoji: "🔍", label: "Show me the latest block details", command: "Show me the latest block" },
  { emoji: "💧", label: "List all liquidity pools", command: "List all liquidity pools" },
  { emoji: "🔄", label: "Get a swap quote for 1 DCC to wDAI", command: "Swap quote 1 DCC to wDAI" },
  { emoji: "🌐", label: "Show network status", command: "Network status" },
  { emoji: "✨", label: "Create a token on DecentralChain", command: "Create a token" },
  { emoji: "👛", label: "Check my wallet balance", command: "Wallet" },
  { emoji: "📖", label: "Show all available commands", command: "Help" },
];

/* ─── Typing dots animation ─── */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-blue-400"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.2, 0.7], y: [0, -4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
      <span className="text-[12px] text-muted/60 ml-2">🔗 Querying blockchain…</span>
    </div>
  );
}

/* ─── Follow-up suggestions based on response type ─── */
function FollowUpSuggestions({ type, data, onSelect }: { type?: string; data?: Record<string, unknown>; onSelect: (cmd: string) => void }) {
  const suggestions: Record<string, { label: string; cmd: string }[]> = {
    block: [
      { label: "📋 Show transactions", cmd: "Show transactions in that block" },
      { label: "⬅️ Previous block", cmd: "Show me the previous block" },
      { label: "🌐 Network status", cmd: "Network status" },
    ],
    "block-txs": [
      { label: "📦 Latest block", cmd: "Show latest block" },
      { label: "🌐 Network status", cmd: "Network status" },
    ],
    balance: [
      { label: "📊 Portfolio breakdown", cmd: "Portfolio" },
      { label: "📜 My transactions", cmd: "My transactions" },
      { label: "💸 Transfer DCC", cmd: "Send 1 DCC to " },
      { label: "💧 My positions", cmd: "Show my LP positions" },
    ],
    transaction: [
      { label: "📜 My transactions", cmd: "My transactions" },
      { label: "👛 My balance", cmd: "Wallet" },
      { label: "📦 Block height", cmd: "Block height" },
    ],
    network: [
      { label: "🔗 View peers", cmd: "Show connected peers" },
      { label: "📦 Latest block", cmd: "Show latest block" },
      { label: "⛏️ Validator info", cmd: "Top generators" },
    ],
    pool: [
      { label: "🔄 Swap quote", cmd: "Swap quote 1 DCC to wDAI" },
      { label: "📊 Pool stats", cmd: data?.poolKey ? `Pool stats ${data.poolKey}` : "List all pools" },
      { label: "💧 List all pools", cmd: "List all pools" },
    ],
    swap: [
      { label: "⚡ Execute swap", cmd: "Execute swap" },
      { label: "💧 List pools", cmd: "List all pools" },
      { label: "📜 My transactions", cmd: "My transactions" },
    ],
    automation: [
      { label: "🤖 My automations", cmd: "My automations" },
      { label: "🔄 Schedule a swap", cmd: "Swap 1 DCC to USDC every day for 7 days" },
      { label: "🔔 Price alert", cmd: "Alert me if DCC drops below $0.50" },
    ],
    bridge: [
      { label: "🚧 Bridge limits", cmd: "Bridge limits" },
      { label: "💰 Bridge fees", cmd: "Bridge fees" },
      { label: "📊 Bridge stats", cmd: "Bridge stats" },
    ],
    peers: [
      { label: "🌐 Network status", cmd: "Network status" },
      { label: "🖥️ Node version", cmd: "Node version" },
    ],
    text: [
      { label: "📖 Help", cmd: "Help" },
      { label: "📦 Block height", cmd: "Block height" },
      { label: "💧 List pools", cmd: "List all pools" },
    ],
    error: [
      { label: "📖 Help", cmd: "Help" },
      { label: "👛 My wallet", cmd: "Wallet" },
    ],
  };

  const items = suggestions[type || ""] || [];
  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.2 }}
      className="flex flex-wrap gap-1.5 mt-3"
    >
      {items.map((s, i) => (
        <motion.button
          key={i}
          onClick={() => onSelect(s.cmd)}
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 + i * 0.05 }}
          className="px-3 py-1.5 rounded-xl text-[11px] font-medium bg-white/[0.03] border border-white/[0.07] text-muted hover:text-foreground hover:border-primary/30 hover:bg-primary/5 hover:shadow-[0_0_12px_rgba(var(--color-primary-rgb,99,102,241),0.1)] transition-all cursor-pointer"
        >
          {s.label}
        </motion.button>
      ))}
    </motion.div>
  );
}

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/[0.06] text-primary text-[12px] font-mono">$1</code>')
    .replace(/\n/g, "<br />");
}

/* ─── Download helper for export feature ─── */
function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface TerminalChatProps {
  initialCommand?: string;
  onCommandConsumed?: () => void;
}

const HISTORY_KEY = "dcc-chat-history";
const MAX_PERSISTED = 200;

function loadPersistedMessages(): TerminalMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as TerminalMessage[]) : [];
  } catch {
    return [];
  }
}

function persistMessages(msgs: TerminalMessage[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs.slice(-MAX_PERSISTED)));
  } catch { /* quota exceeded — silently ignore */ }
}

export default function TerminalChat({ initialCommand, onCommandConsumed }: TerminalChatProps) {
  const { t } = useI18n();
  const { account, isConnected, getSeed } = useWallet();
  const [messages, setMessages] = useState<TerminalMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<TerminalSettingsState>(DEFAULT_SETTINGS);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasHandledInitial = useRef(false);
  const hasLoadedHistory = useRef(false);

  // Restore chat history from localStorage on mount
  useEffect(() => {
    if (!hasLoadedHistory.current) {
      hasLoadedHistory.current = true;
      const saved = loadPersistedMessages();
      if (saved.length > 0) setMessages(saved);
    }
  }, []);

  // Persist messages when they change
  useEffect(() => {
    if (messages.length > 0) persistMessages(messages);
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Command history for up/down arrow navigation
  const commandHistory = useRef<string[]>([]);
  const historyIndex = useRef(-1);

  // Slash command shortcuts
  const slashCommands: Record<string, string> = {
    "/help": "Help",
    "/clear": "Clear history",
    "/wallet": "Wallet",
    "/portfolio": "Portfolio",
    "/pools": "List all pools",
    "/height": "Block height",
    "/status": "Network status",
    "/macros": "My macros",
    "/contacts": "My contacts",
    "/watchlist": "My watchlist",
    "/nfts": "My NFTs",
    "/fees": "Fee estimate",
    "/export": "Export chat",
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K — clear chat
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setMessages([]);
        localStorage.removeItem(HISTORY_KEY);
        return;
      }
      // Ctrl+L — focus input
      if ((e.metaKey || e.ctrlKey) && e.key === "l") {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      // Escape — clear input
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        e.preventDefault();
        setInput("");
        historyIndex.current = -1;
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Handle export downloads and clear history when special messages arrive
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.data) return;
    const d = last.data as Record<string, unknown>;

    // Clear history
    if (d.clearHistory) {
      setTimeout(() => {
        setMessages([]);
        localStorage.removeItem(HISTORY_KEY);
      }, 500);
      return;
    }

    if (!d.exportType) return;

    const format = String(d.format || "csv");
    const ts = new Date().toISOString().slice(0, 10);

    if (d.exportType === "chat") {
      if (format === "json") {
        triggerDownload(`dcc-chat-${ts}.json`, JSON.stringify(messages, null, 2), "application/json");
      } else {
        const rows = ["timestamp,role,content", ...messages.map(m =>
          `${new Date(m.timestamp).toISOString()},${m.role},"${m.content.replace(/"/g, '""')}"`
        )];
        triggerDownload(`dcc-chat-${ts}.csv`, rows.join("\n"), "text/csv");
      }
    } else if (d.exportType === "portfolio" && Array.isArray(d.holdings)) {
      if (format === "json") {
        triggerDownload(`dcc-portfolio-${ts}.json`, JSON.stringify(d.holdings, null, 2), "application/json");
      } else {
        const rows = ["asset,balance", ...(d.holdings as { asset: string; balance: number }[]).map(h => `${h.asset},${h.balance}`)];
        triggerDownload(`dcc-portfolio-${ts}.csv`, rows.join("\n"), "text/csv");
      }
    } else if (d.exportType === "transactions" && Array.isArray(d.transactions)) {
      if (format === "json") {
        triggerDownload(`dcc-transactions-${ts}.json`, JSON.stringify(d.transactions, null, 2), "application/json");
      } else {
        const txs = d.transactions as Record<string, unknown>[];
        const rows = ["id,type,timestamp,amount,fee", ...txs.map(tx =>
          `${tx.id},${tx.type},${tx.timestamp},${tx.amount ?? ""},${tx.fee ?? ""}`
        )];
        triggerDownload(`dcc-transactions-${ts}.csv`, rows.join("\n"), "text/csv");
      }
    }
  }, [messages]);

  const handleSubmit = async (text?: string) => {
    let value = (text || input).trim();
    if (!value || isLoading) return;

    // Track command history for up arrow
    commandHistory.current = [value, ...commandHistory.current.filter(c => c !== value)].slice(0, 50);
    historyIndex.current = -1;

    // Resolve slash commands
    const slashCmd = slashCommands[value.toLowerCase()];
    if (slashCmd) value = slashCmd;

    // Batch operations — split on && or ;
    const commands = value.includes("&&") ? value.split("&&").map(c => c.trim()).filter(Boolean)
      : value.includes(";") && !value.includes("auto-sign") ? value.split(";").map(c => c.trim()).filter(Boolean)
      : [value];

    if (commands.length > 1) {
      const userMsg: TerminalMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: value,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      const results: TerminalMessage[] = [];
      for (const cmd of commands) {
        const result = await processCommand(cmd, {
          isConnected,
          address: account?.address,
          seed: getSeed(),
        }, {
          autoSign: settings.autoSign,
        }, [...messages, userMsg, ...results]);

        const assistantMsg: TerminalMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `**[${commands.indexOf(cmd) + 1}/${commands.length}]** ${result.content}`,
          data: result.data,
          type: result.type,
          timestamp: Date.now(),
        };
        results.push(assistantMsg);
        setMessages((prev) => [...prev, assistantMsg]);
      }

      setIsLoading(false);
      inputRef.current?.focus();
      return;
    }

    const userMsg: TerminalMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const result = await processCommand(value, {
      isConnected,
      address: account?.address,
      seed: getSeed(),
    }, {
      autoSign: settings.autoSign,
    }, messages);

    const assistantMsg: TerminalMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: result.content,
      data: result.data,
      type: result.type,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, assistantMsg]);

    // If the response is a macro run trigger, execute the commands sequentially
    if (result.data && (result.data as Record<string, unknown>).runMacro && Array.isArray((result.data as Record<string, unknown>).commands)) {
      const macroCmds = (result.data as Record<string, unknown>).commands as string[];
      const macroResults: TerminalMessage[] = [];
      for (const cmd of macroCmds) {
        const r = await processCommand(cmd, {
          isConnected,
          address: account?.address,
          seed: getSeed(),
        }, { autoSign: settings.autoSign }, [...messages, userMsg, assistantMsg, ...macroResults]);
        const msg: TerminalMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `**[${macroCmds.indexOf(cmd) + 1}/${macroCmds.length}]** ${r.content}`,
          data: r.data,
          type: r.type,
          timestamp: Date.now(),
        };
        macroResults.push(msg);
        setMessages((prev) => [...prev, msg]);
      }
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  // Handle initial command from dashboard quick actions
  useEffect(() => {
    if (initialCommand && !hasHandledInitial.current) {
      hasHandledInitial.current = true;
      if (initialCommand.endsWith(" ")) {
        setInput(initialCommand);
        inputRef.current?.focus();
      } else {
        handleSubmit(initialCommand);
      }
      onCommandConsumed?.();
    }
  }); // intentionally no deps — runs each render to catch new initialCommands

  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="max-w-[760px] mx-auto">
          {/* Welcome state */}
          <AnimatePresence>
            {showWelcome && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="pt-8"
              >
                {/* Greeting */}
                <div className="flex items-start gap-4 mb-8">
                  <motion.div
                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/10"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Image src="/logo.png" alt="DCC" width={32} height={32} className="rounded-xl" />
                  </motion.div>
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground mb-1">
                      👋 gm, how can I help?
                    </h2>
                    <p className="text-[13px] text-muted/60">
                      {t.terminal.subtitle}
                    </p>
                  </div>
                </div>

                {/* Suggested actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {SUGGESTED_ACTIONS.map((action, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.04 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSubmit(action.command)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-left text-muted hover:text-foreground hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all group cursor-pointer"
                    >
                      <span className="text-lg group-hover:scale-110 transition-transform">{action.emoji}</span>
                      <span className="text-[13px]">{action.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message list */}
          <div className="space-y-5">
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: idx === messages.length - 1 ? 0.05 : 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/15 to-blue-500/15 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm shadow-primary/5"
                  >
                    <Bot className="w-4 h-4 text-primary" />
                  </motion.div>
                )}
                <div
                  className={`max-w-[85%] md:max-w-[80%] ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-primary/12 to-primary/6 border border-primary/20 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm shadow-primary/5"
                      : "bg-gradient-to-br from-surface-elevated/60 to-surface-elevated/30 border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm"
                  }`}
                >
                  <div
                    className={`text-[14px] leading-relaxed ${
                      msg.role === "user" ? "text-foreground" : "text-foreground/90"
                    }`}
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                  />
                  {msg.data && <TerminalDataCard type={msg.type} data={msg.data} />}
                  {msg.role === "assistant" && (
                    <FollowUpSuggestions type={msg.type} data={msg.data} onSelect={handleSubmit} />
                  )}
                  <div className="text-[10px] text-muted/30 mt-2.5 select-none flex items-center gap-1.5">
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    {msg.role === "user" && <span className="text-primary/40">✓</span>}
                  </div>
                </div>
                {msg.role === "user" && (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="w-8 h-8 rounded-xl bg-gradient-to-br from-secondary/15 to-purple-500/15 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm shadow-secondary/5"
                  >
                    <User className="w-4 h-4 text-secondary" />
                  </motion.div>
                )}
              </motion.div>
            ))}

            {/* Loading indicator */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="flex gap-3 justify-start"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/15 to-blue-500/15 flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary/5">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Bot className="w-4 h-4 text-primary" />
                    </motion.div>
                  </div>
                  <div className="bg-gradient-to-br from-surface-elevated/60 to-surface-elevated/30 border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <TypingIndicator />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-white/[0.06] bg-background/80 backdrop-blur-xl px-4 md:px-6 py-4">
        <div className="max-w-[760px] mx-auto">
          <div className="flex items-center gap-2">
            <TerminalSettings settings={settings} onSettingsChange={setSettings} />
            <div className="relative flex-1 group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-blue-500/10 to-purple-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300" />
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                  // Up arrow — navigate command history
                  if (e.key === "ArrowUp" && !e.shiftKey) {
                    if (commandHistory.current.length > 0) {
                      e.preventDefault();
                      const nextIdx = Math.min(historyIndex.current + 1, commandHistory.current.length - 1);
                      historyIndex.current = nextIdx;
                      setInput(commandHistory.current[nextIdx]);
                    }
                  }
                  // Down arrow — navigate command history
                  if (e.key === "ArrowDown" && !e.shiftKey) {
                    e.preventDefault();
                    if (historyIndex.current > 0) {
                      historyIndex.current -= 1;
                      setInput(commandHistory.current[historyIndex.current]);
                    } else {
                      historyIndex.current = -1;
                      setInput("");
                    }
                  }
                }}
                placeholder="✨ Ask anything about the blockchain..."
                disabled={isLoading}
                rows={1}
                className="relative w-full resize-none bg-surface/60 border border-white/[0.08] rounded-xl pl-4 pr-12 py-3.5 text-[14px] text-foreground placeholder:text-muted/40 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10 transition-all disabled:opacity-50"
              />
              <motion.button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isLoading}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gradient-to-br from-foreground to-foreground/80 text-background flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/10 transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </motion.button>
            </div>
          </div>
          <p className="text-[10px] text-muted/25 mt-2 text-center">
            {t.terminal.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
