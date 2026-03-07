"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Coins,
  Eye,
  EyeOff,
} from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import {
  getAddressBalance,
  getAssetBalances,
  type AddressBalance,
  type AssetBalance,
} from "@/lib/blockchain";

function truncateAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-white/[0.06] transition-colors text-muted hover:text-foreground">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export default function WalletPanel() {
  const { account, isConnected } = useWallet();
  const [balance, setBalance] = useState<AddressBalance | null>(null);
  const [tokens, setTokens] = useState<AssetBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAssets, setShowAssets] = useState(true);
  const [hideSmall, setHideSmall] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  const fetchBalances = useCallback(async () => {
    if (!account?.address) return;
    setLoading(true);
    try {
      const [bal, assets] = await Promise.all([
        getAddressBalance(account.address),
        getAssetBalances(account.address),
      ]);
      setBalance(bal);
      setTokens(assets);
      setLastRefresh(Date.now());
    } catch {
      // silent fail — will show stale data
    } finally {
      setLoading(false);
    }
  }, [account?.address]);

  // Fetch on connect + auto-refresh every 30s
  useEffect(() => {
    if (!isConnected || !account?.address) {
      setBalance(null);
      setTokens([]);
      return;
    }
    fetchBalances();
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [isConnected, account?.address, fetchBalances]);

  const filteredTokens = hideSmall
    ? tokens.filter((t) => {
        const dec = t.issueTransaction?.decimals ?? 8;
        return t.balance / Math.pow(10, dec) >= 1;
      })
    : tokens;

  if (!isConnected) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted" />
            <span className="font-heading text-[13px] font-semibold text-foreground">Wallet</span>
          </div>
        </div>
        {/* Not connected state */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
            <Wallet className="w-6 h-6 text-muted/50" />
          </div>
          <p className="text-[13px] text-muted mb-1">No wallet connected</p>
          <p className="text-[11px] text-muted/50 leading-relaxed">
            Connect your wallet using the button in the navbar to see balances and interact with the chain.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="font-heading text-[13px] font-semibold text-foreground">Wallet</span>
            <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-medium">
              Connected
            </span>
          </div>
          <button
            onClick={fetchBalances}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-muted hover:text-foreground disabled:opacity-30"
            title="Refresh balances"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Address */}
        <div className="px-4 py-3 border-b border-white/[0.04]">
          <p className="text-[10px] uppercase tracking-wider text-muted/50 font-medium mb-1.5">Address</p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-foreground/80">
              {truncateAddress(account?.address || "")}
            </span>
            <CopyButton text={account?.address || ""} />
          </div>
        </div>

        {/* DCC Balance */}
        <div className="px-4 py-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Coins className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-[13px] font-semibold text-foreground">DCC</span>
            <span className="ml-auto text-[14px] font-semibold text-foreground tabular-nums">
              {balance ? balance.available.toFixed(4) : "—"}
            </span>
          </div>
          {balance && (
            <div className="space-y-1.5 pl-8">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted/60">Available</span>
                <span className="text-[11px] text-foreground/70 font-mono tabular-nums">{balance.available.toFixed(8)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted/60">Regular</span>
                <span className="text-[11px] text-foreground/70 font-mono tabular-nums">{balance.regular.toFixed(8)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted/60">Effective</span>
                <span className="text-[11px] text-foreground/70 font-mono tabular-nums">{balance.effective.toFixed(8)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted/60">Generating</span>
                <span className="text-[11px] text-foreground/70 font-mono tabular-nums">{balance.generating.toFixed(8)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Token balances */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowAssets((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted/50 font-medium hover:text-muted transition-colors"
            >
              {showAssets ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Assets {filteredTokens.length > 0 && `(${filteredTokens.length})`}
            </button>
            <button
              onClick={() => setHideSmall((v) => !v)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted/50 hover:text-muted hover:bg-white/[0.03] transition-colors"
              title={hideSmall ? "Show all tokens" : "Hide small balances"}
            >
              {hideSmall ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {hideSmall ? "Show all" : "Hide small"}
            </button>
          </div>

          <AnimatePresence>
            {showAssets && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {filteredTokens.length === 0 ? (
                  <p className="text-[11px] text-muted/40 text-center py-4">
                    {tokens.length === 0 ? "No other tokens" : "All tokens hidden"}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredTokens.map((token) => {
                      const name = token.issueTransaction?.name || token.assetId.slice(0, 8);
                      const dec = token.issueTransaction?.decimals ?? 8;
                      const amount = token.balance / Math.pow(10, dec);
                      return (
                        <div
                          key={token.assetId}
                          className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                              <span className="text-[9px] font-bold text-muted/60 uppercase">
                                {name.slice(0, 2)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium text-foreground/80 truncate">
                                {name}
                              </p>
                              <p className="text-[10px] text-muted/40 font-mono truncate">
                                {token.assetId.slice(0, 8)}…
                              </p>
                            </div>
                          </div>
                          <span className="text-[12px] font-mono text-foreground/70 tabular-nums flex-shrink-0 ml-2">
                            {amount < 0.0001 ? amount.toExponential(2) : amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Last refresh */}
        {lastRefresh > 0 && (
          <div className="px-4 py-2 border-t border-white/[0.04]">
            <p className="text-[10px] text-muted/30 text-center">
              Updated {new Date(lastRefresh).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
