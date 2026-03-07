"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, X, LogOut, Copy, Check, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";

export default function WalletConnect() {
  const { account, isConnected, connect, disconnect } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [seedInput, setSeedInput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSeed, setShowSeed] = useState(false);

  const handleConnect = () => {
    setError("");
    const phrase = seedInput.trim();
    if (!phrase) {
      setError("Please enter your seed phrase.");
      return;
    }
    const ok = connect(phrase);
    if (ok) {
      setSeedInput("");
      setIsOpen(false);
      setError("");
      setShowSeed(false);
    } else {
      setError("Invalid seed phrase. Please check and try again.");
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
    setSeedInput("");
    setError("");
    setShowSeed(false);
  };

  const copyAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortAddr = account?.address
    ? `${account.address.slice(0, 6)}…${account.address.slice(-4)}`
    : "";

  return (
    <>
      {/* Trigger button */}
      {isConnected ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          {shortAddr}
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-muted hover:text-foreground border border-white/[0.06] hover:border-primary/20 hover:bg-white/[0.03] transition-all"
        >
          <Wallet className="w-3.5 h-3.5" />
          Connect
        </button>
      )}

      {/* Modal overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => { setIsOpen(false); setError(""); setShowSeed(false); }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-background border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {isConnected ? "Wallet" : "Connect Wallet"}
                </h3>
                <button
                  onClick={() => { setIsOpen(false); setError(""); setShowSeed(false); }}
                  className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5">
                {isConnected && account ? (
                  /* Connected state */
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-surface/60 border border-white/[0.04]">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-muted mb-0.5">Address</p>
                        <p className="text-[14px] text-foreground font-mono truncate">
                          {account.address}
                        </p>
                      </div>
                      <button
                        onClick={copyAddress}
                        className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
                        title="Copy address"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={handleDisconnect}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[14px] font-medium text-red-400 border border-red-400/20 hover:bg-red-400/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Disconnect
                    </button>
                  </div>
                ) : (
                  /* Connect form */
                  <div className="space-y-4">
                    {/* Security warning */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[12px] text-yellow-500/90 leading-relaxed">
                        Your seed phrase is stored in memory only and never saved or transmitted.
                        Always verify you&apos;re on the correct website.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[13px] text-muted mb-2">
                        Seed Phrase
                      </label>
                      <div className="relative">
                        <textarea
                          value={seedInput}
                          onChange={(e) => { setSeedInput(e.target.value); setError(""); }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleConnect();
                            }
                          }}
                          placeholder="Enter your 15-word seed phrase…"
                          rows={3}
                          className="w-full bg-surface/60 border border-white/[0.06] rounded-xl px-4 py-3 pr-10 text-[14px] text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10 transition-all resize-none"
                          style={{ WebkitTextSecurity: showSeed ? "none" : "disc" } as React.CSSProperties}
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSeed(!showSeed)}
                          className="absolute right-3 top-3 p-1 text-muted hover:text-foreground transition-colors"
                        >
                          {showSeed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <p className="text-[13px] text-red-400">{error}</p>
                    )}

                    <button
                      onClick={handleConnect}
                      disabled={!seedInput.trim()}
                      className="btn-primary w-full !py-3 !text-[14px] disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                    >
                      Connect Wallet
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
