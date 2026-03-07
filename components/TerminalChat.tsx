"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Terminal as TerminalIcon,
  Bot,
  User,
  Loader2,
  ArrowRight,
  Blocks,
  Wallet,
  Activity,
  HelpCircle,
  ArrowLeftRight,
  Repeat,
} from "lucide-react";
import { processCommand, type TerminalMessage } from "@/lib/terminal";
import { useI18n } from "@/lib/i18n";
import { useWallet } from "@/lib/wallet-context";
import TerminalSettings, { DEFAULT_SETTINGS, type TerminalSettingsState } from "@/components/TerminalSettings";

const SUGGESTED_COMMANDS = [
  { icon: Blocks, label: "Block Height", command: "What's the current block height?" },
  { icon: Activity, label: "Latest Block", command: "Show me the latest block" },
  { icon: ArrowLeftRight, label: "Bridge", command: "Tell me about the SOL to DCC bridge" },
  { icon: Repeat, label: "Swap Pools", command: "List all liquidity pools" },
  { icon: Wallet, label: "My Wallet", command: "Wallet" },
  { icon: HelpCircle, label: "All Commands", command: "Help" },
];

function DataCard({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="mt-3 rounded-lg border border-white/[0.06] overflow-hidden">
      {Object.entries(data).map(([key, value], i) => {
        if (key === "peers" && Array.isArray(value)) {
          return (
            <div
              key={key}
              className={`px-4 py-2.5 flex flex-col gap-1 ${
                i % 2 === 0 ? "bg-white/[0.02]" : ""
              }`}
            >
              <span className="text-[11px] text-muted uppercase tracking-wider font-medium">
                {formatKey(key)}
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(value as string[]).map((p: string, pi: number) => (
                  <span
                    key={pi}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/[0.04] text-muted"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          );
        }
        return (
          <div
            key={key}
            className={`px-4 py-2.5 flex items-center justify-between ${
              i % 2 === 0 ? "bg-white/[0.02]" : ""
            }`}
          >
            <span className="text-[11px] text-muted uppercase tracking-wider font-medium">
              {formatKey(key)}
            </span>
            <span className="text-[13px] text-foreground font-mono break-all text-right max-w-[60%]">
              {String(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/[0.06] text-primary text-[12px] font-mono">$1</code>')
    .replace(/\n/g, "<br />");
}

export default function TerminalChat() {
  const { t } = useI18n();
  const { account, isConnected, getSeed } = useWallet();
  const [messages, setMessages] = useState<TerminalMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<TerminalSettingsState>(DEFAULT_SETTINGS);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (text?: string) => {
    const value = (text || input).trim();
    if (!value || isLoading) return;

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
    });

    const assistantMsg: TerminalMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: result.content,
      data: result.data,
      type: result.type,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setIsLoading(false);
    inputRef.current?.focus();
  };

  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-72px)]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-[800px] mx-auto">
          {/* Welcome state */}
          <AnimatePresence>
            {showWelcome && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center min-h-[60vh] text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Image src="/logo.png" alt="DCC" width={48} height={48} className="rounded-lg" />
                </div>
                <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
                  {t.terminal.title}
                </h2>
                <p className="text-muted text-[15px] max-w-md mb-8 leading-relaxed">
                  {t.terminal.subtitle}
                </p>

                {/* Suggested commands */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 w-full max-w-lg">
                  {SUGGESTED_COMMANDS.map((cmd, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.08 }}
                      onClick={() => handleSubmit(cmd.command)}
                      className="glass-card !p-3 flex flex-col items-center gap-2 text-center cursor-pointer hover:!border-primary/20 group"
                    >
                      <cmd.icon className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                      <span className="text-[12px] text-muted group-hover:text-foreground transition-colors font-medium">
                        {cmd.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message list */}
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] md:max-w-[70%] ${
                    msg.role === "user"
                      ? "bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-md px-4 py-3"
                      : "bg-surface-elevated/50 border border-white/[0.04] rounded-2xl rounded-tl-md px-4 py-3"
                  }`}
                >
                  <div
                    className={`text-[14px] leading-relaxed ${
                      msg.role === "user" ? "text-foreground" : "text-foreground/90"
                    }`}
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(msg.content),
                    }}
                  />
                  {msg.data && <DataCard data={msg.data} />}
                  <div className="text-[10px] text-muted/50 mt-2">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-secondary" />
                  </div>
                )}
              </motion.div>
            ))}

            {/* Loading indicator */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-3 justify-start"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-surface-elevated/50 border border-white/[0.04] rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <span className="text-[13px] text-muted">
                        {t.terminal.querying}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-white/[0.04] bg-background/80 backdrop-blur-xl px-4 md:px-8 py-4">
        <div className="max-w-[800px] mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex items-center gap-3"
          >
            <div className="flex-1 relative">
              <TerminalIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.terminal.placeholder}
                disabled={isLoading}
                className="w-full bg-surface/60 border border-white/[0.06] rounded-xl pl-11 pr-4 py-3.5 text-[14px] text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10 transition-all disabled:opacity-50"
              />
            </div>
            <TerminalSettings settings={settings} onSettingsChange={setSettings} />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="btn-primary !p-3.5 !rounded-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          <p className="text-[11px] text-muted/40 mt-2 text-center">
            {t.terminal.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
