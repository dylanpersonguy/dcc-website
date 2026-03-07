"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  Clock,
  X,
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import TerminalChat from "@/components/TerminalChat";
import DashboardOverview from "@/components/terminal/DashboardOverview";
import WalletPanel from "@/components/terminal/WalletPanel";
import AutomationsPanel from "@/components/terminal/AutomationsPanel";
import WalletConnect from "@/components/WalletConnect";

type Tab = "dashboard" | "chat";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [pendingCommand, setPendingCommand] = useState<string | undefined>();
  const [showWallet, setShowWallet] = useState(true);
  const [showAutomations, setShowAutomations] = useState(true);

  const openChat = useCallback((command?: string) => {
    if (command === "__automations") {
      setActiveTab("chat");
      setShowAutomations(true);
      return;
    }
    setPendingCommand(command);
    setActiveTab("chat");
  }, []);

  // Clear pending command once consumed
  const clearPending = useCallback(() => {
    setPendingCommand(undefined);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* ─── Tab bar ─── */}
      <div className="flex items-center justify-between border-b border-white/[0.04] bg-background/60 backdrop-blur-sm px-4 md:px-6">
        <div className="flex items-center gap-1">
          {/* Logo — links to landing page */}
          <Link href="/" className="flex items-center gap-2 pr-4 mr-2 border-r border-white/[0.04] hover:opacity-80 transition-opacity">
            <Image src="/logo.png" alt="DCC" width={20} height={20} className="rounded" />
            <span className="text-[13px] font-heading font-semibold text-foreground hidden sm:block">DCC</span>
          </Link>

          {/* Dashboard tab */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors ${
              activeTab === "dashboard"
                ? "text-foreground"
                : "text-muted hover:text-foreground/80"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
            {activeTab === "dashboard" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>

          {/* Chat tab */}
          <button
            onClick={() => setActiveTab("chat")}
            className={`relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors ${
              activeTab === "chat"
                ? "text-foreground"
                : "text-muted hover:text-foreground/80"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>AI Chat</span>
            {activeTab === "chat" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        </div>

        {/* Right side — wallet connect + sidebar toggles */}
        <div className="flex items-center gap-2">
          {activeTab !== "dashboard" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={() => setShowAutomations((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
                title={showAutomations ? "Hide automations" : "Show automations"}
              >
                {showAutomations ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Automations</span>
              </button>
              <button
                onClick={() => setShowWallet((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
                title={showWallet ? "Hide wallet" : "Show wallet"}
              >
                {showWallet ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Wallet</span>
              </button>
              <button
                onClick={() => setActiveTab("dashboard")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Back to Dashboard
              </button>
            </motion.div>
          )}
          <WalletConnect />
        </div>
      </div>

      {/* ─── Tab content ─── */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <DashboardOverview onOpenChat={openChat} />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full flex"
            >
              {/* Automations sidebar (left) */}
              <AnimatePresence>
                {showAutomations && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 280, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="h-full border-r border-white/[0.04] bg-surface/30 overflow-hidden flex-shrink-0 hidden md:block"
                  >
                    <div className="w-[280px] h-full">
                      <AutomationsPanel onOpenChat={openChat} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat area */}
              <div className="flex-1 min-w-0 h-full">
                <TerminalChat initialCommand={pendingCommand} onCommandConsumed={clearPending} />
              </div>

              {/* Wallet sidebar (right) */}
              <AnimatePresence>
                {showWallet && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 280, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="h-full border-l border-white/[0.04] bg-surface/30 overflow-hidden flex-shrink-0 hidden md:block"
                  >
                    <div className="w-[280px] h-full">
                      <WalletPanel />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
