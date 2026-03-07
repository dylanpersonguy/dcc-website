"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Zap, SlidersHorizontal } from "lucide-react";

export interface TerminalSettingsState {
  autoSign: boolean;
}

const DEFAULT_SETTINGS: TerminalSettingsState = {
  autoSign: false,
};

interface Props {
  settings: TerminalSettingsState;
  onSettingsChange: (s: TerminalSettingsState) => void;
}

export { DEFAULT_SETTINGS };

export default function TerminalSettings({ settings, onSettingsChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = (key: keyof TerminalSettingsState) => {
    onSettingsChange({ ...settings, [key]: !settings[key] });
  };

  return (
    <>
      {/* Gear trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-3.5 rounded-xl border border-white/[0.06] bg-surface/60 text-muted hover:text-foreground hover:border-primary/20 transition-all"
        aria-label="Terminal settings"
      >
        <SlidersHorizontal className="w-4 h-4" />
      </button>

      {/* Panel overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex justify-end"
            onClick={() => setIsOpen(false)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Side panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm bg-background border-l border-white/[0.06] shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-primary" />
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    Terminal Settings
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Settings list */}
              <div className="px-6 py-5 space-y-2">
                {/* Auto-Sign */}
                <SettingRow
                  icon={<Zap className="w-4 h-4" />}
                  label="Auto-Sign Transactions"
                  description="Automatically sign and broadcast transactions when you request a swap, transfer, or liquidity action — no separate confirmation command needed."
                  enabled={settings.autoSign}
                  onToggle={() => toggle("autoSign")}
                  color="yellow"
                />
              </div>

              {/* Footer note */}
              <div className="px-6 py-4 border-t border-white/[0.04]">
                <p className="text-[11px] text-muted/50 leading-relaxed">
                  Settings are stored for this session only and reset when you leave the page.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SettingRow({
  icon,
  label,
  description,
  enabled,
  onToggle,
  color = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
    red: "bg-red-500",
  };
  const dotColor = colorMap[color] || colorMap.primary;

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-colors">
      <div className="mt-0.5 text-muted">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px] font-medium text-foreground">{label}</span>
          {/* Toggle switch */}
          <button
            onClick={onToggle}
            className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
              enabled ? dotColor : "bg-white/[0.08]"
            }`}
            role="switch"
            aria-checked={enabled}
          >
            <span
              className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                enabled ? "translate-x-[18px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <p className="text-[12px] text-muted/70 leading-relaxed mt-1">{description}</p>
        {enabled && (
          <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 text-[11px] font-medium">
            <Zap className="w-3 h-3" /> Active
          </span>
        )}
      </div>
    </div>
  );
}
