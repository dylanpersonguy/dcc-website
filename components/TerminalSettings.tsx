"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, SlidersHorizontal, Palette } from "lucide-react";

export type ChatTheme = "default" | "hacker" | "retro" | "midnight" | "amber";

export interface TerminalSettingsState {
  autoSign: boolean;
  chatTheme: ChatTheme;
}

const SETTINGS_KEY = "dcc-terminal-settings";

const DEFAULT_SETTINGS: TerminalSettingsState = {
  autoSign: true,
  chatTheme: "default",
};

export function loadPersistedSettings(): TerminalSettingsState {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function persistSettings(s: TerminalSettingsState) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch { /* quota exceeded */ }
}

const THEME_OPTIONS: { id: ChatTheme; label: string; preview: string; dot: string }[] = [
  { id: "default", label: "Default", preview: "Standard terminal look", dot: "bg-primary" },
  { id: "hacker", label: "Hacker", preview: "Green on black, matrix style", dot: "bg-green-400" },
  { id: "retro", label: "Retro", preview: "Synthwave neon pink", dot: "bg-pink-400" },
  { id: "midnight", label: "Midnight", preview: "Deep blue calm", dot: "bg-sky-400" },
  { id: "amber", label: "Amber", preview: "Warm amber terminal", dot: "bg-amber-400" },
];

interface Props {
  settings: TerminalSettingsState;
  onSettingsChange: (s: TerminalSettingsState) => void;
}

export { DEFAULT_SETTINGS };

export default function TerminalSettings({ settings, onSettingsChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = (key: keyof TerminalSettingsState) => {
    if (typeof settings[key] === "boolean") {
      onSettingsChange({ ...settings, [key]: !settings[key] });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Gear trigger */}
      <button
        ref={btnRef}
        onClick={() => setIsOpen((o) => !o)}
        className="p-3.5 rounded-xl border border-foreground/[0.06] bg-surface/60 text-muted hover:text-foreground hover:border-primary/20 transition-all"
        aria-label="Terminal settings"
      >
        <SlidersHorizontal className="w-4 h-4" />
      </button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 w-[320px] rounded-xl border border-foreground/[0.08] bg-background shadow-2xl z-[90]"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-foreground/[0.04]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span className="font-heading text-[13px] font-semibold text-foreground">
                Terminal Settings
              </span>
            </div>

            {/* Auto-Sign toggle */}
            <div className="px-4 py-3 border-b border-foreground/[0.04]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-muted" />
                  <span className="text-[13px] font-medium text-foreground">
                    Auto-Sign Transactions
                  </span>
                </div>
                <button
                  onClick={() => toggle("autoSign")}
                  className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                    settings.autoSign ? "bg-yellow-500" : "bg-foreground/[0.08]"
                  }`}
                  role="switch"
                  aria-checked={settings.autoSign}
                >
                  <span
                    className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      settings.autoSign ? "translate-x-[18px]" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-muted/60 leading-relaxed mt-1.5 pl-[30px]">
                Automatically sign &amp; broadcast swaps, transfers, and liquidity actions.
              </p>
              {settings.autoSign && (
                <span className="inline-flex items-center gap-1 mt-2 ml-[30px] px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 text-[11px] font-medium">
                  <Zap className="w-3 h-3" /> Active
                </span>
              )}
            </div>

            {/* Chat Theme picker */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2.5 mb-2.5">
                <Palette className="w-4 h-4 text-muted" />
                <span className="text-[13px] font-medium text-foreground">Chat Theme</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {THEME_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onSettingsChange({ ...settings, chatTheme: t.id })}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                      settings.chatTheme === t.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-foreground/[0.04] border border-transparent"
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${t.dot}`} />
                    <div className="min-w-0">
                      <p className={`text-[12px] font-medium ${settings.chatTheme === t.id ? "text-foreground" : "text-muted"}`}>
                        {t.label}
                      </p>
                      <p className="text-[10px] text-muted/50 truncate">{t.preview}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-foreground/[0.04]">
              <p className="text-[10px] text-muted/40 leading-relaxed">
                Settings are saved across sessions.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

