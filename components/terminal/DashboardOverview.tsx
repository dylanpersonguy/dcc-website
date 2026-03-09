"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Blocks,
  Globe,
  Users,
  Activity,
  ArrowLeftRight,
  Coins,
  Send,
  Flame,
  Copy,
  Check,
  RefreshCw,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Clock,
  Play,
  Pause,
  XCircle,
  Zap,
  Bell,
  MessageSquare,
  Plus,
} from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import {
  getBlockHeight,
  getLastBlockHeader,
  getConnectedPeers,
  getAddressBalance,
  getAssetBalances,
  getNodeVersion,
  type BlockHeader,
  type AddressBalance,
  type AssetBalance,
} from "@/lib/blockchain";
import {
  getProtocolSnapshot,
  getLiveExchangeRate,
  getValidators,
  getStakingUser,
  estimateDeposit,
  type ProtocolSnapshot,
  type ExchangeRate,
  type StakingValidator,
  type StakingUser,
  type DepositEstimate,
} from "@/lib/staking";
import { stakeDCC } from "@/lib/wallet";
import {
  loadAutomations,
  pauseAutomation,
  resumeAutomation,
  cancelAutomation,
  formatNextRun,
  formatAutomationType,
  type Automation,
  type AutomationType,
} from "@/lib/automations";

/* ─── Helpers ─── */
function truncAddr(addr: string) {
  return addr.length <= 14 ? addr : `${addr.slice(0, 7)}…${addr.slice(-5)}`;
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }}
      className="p-1 rounded hover:bg-white/[0.06] text-muted hover:text-foreground transition-colors"
    >
      {ok ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

/* ─── Skeleton loader ─── */
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/* ─── Stat card ─── */
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay = 0,
  loading = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  color: string;
  delay?: number;
  loading?: boolean;
}) {
  const colorMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    blue: "text-blue-400 bg-blue-400/10",
    green: "text-green-400 bg-green-400/10",
    yellow: "text-yellow-400 bg-yellow-400/10",
    purple: "text-purple-400 bg-purple-400/10",
  };
  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={{ delay: delay * 0.06, duration: 0.35 }}
      className="glass-card !p-4 flex items-start gap-3"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color] || colorMap.primary}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted/50 font-medium">{label}</p>
        {loading ? (
          <>
            <Skeleton className="h-6 w-20 mt-1" />
            {sub && <Skeleton className="h-3 w-14 mt-1.5" />}
          </>
        ) : (
          <>
            <p className="text-[18px] font-heading font-bold text-foreground tabular-nums leading-tight mt-0.5">
              {value}
            </p>
            {sub && <p className="text-[11px] text-muted/50 mt-0.5 truncate">{sub}</p>}
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Quick action button ─── */
function QuickAction({
  icon: Icon,
  label,
  desc,
  color,
  onClick,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  color: string;
  onClick: () => void;
  delay?: number;
}) {
  const colorMap: Record<string, string> = {
    primary: "group-hover:text-primary group-hover:border-primary/20",
    blue: "group-hover:text-blue-400 group-hover:border-blue-400/20",
    green: "group-hover:text-green-400 group-hover:border-green-400/20",
    yellow: "group-hover:text-yellow-400 group-hover:border-yellow-400/20",
    purple: "group-hover:text-purple-400 group-hover:border-purple-400/20",
    red: "group-hover:text-red-400 group-hover:border-red-400/20",
  };
  return (
    <motion.button
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={{ delay: delay * 0.05, duration: 0.3 }}
      onClick={onClick}
      className={`glass-card !p-4 flex items-center gap-3 text-left cursor-pointer group transition-all ${colorMap[color] || ""}`}
    >
      <div className="w-9 h-9 rounded-xl bg-white/[0.03] flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.06] transition-colors">
        <Icon className="w-4 h-4 text-muted group-hover:text-inherit transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted/50 truncate">{desc}</p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-muted/30 group-hover:text-inherit transition-colors flex-shrink-0" />
    </motion.button>
  );
}

/* ═══════════════════════════════════════════ */
/* Dashboard Overview                          */
/* ═══════════════════════════════════════════ */
interface DashboardOverviewProps {
  onOpenChat: (command?: string) => void;
}

export default function DashboardOverview({ onOpenChat }: DashboardOverviewProps) {
  const { account, isConnected, getSeed } = useWallet();

  // Network stats
  const [height, setHeight] = useState<number | null>(null);
  const [lastBlock, setLastBlock] = useState<BlockHeader | null>(null);
  const [peers, setPeers] = useState<number | null>(null);
  const [nodeVer, setNodeVer] = useState<string>("");

  // Staking protocol data
  const [snapshot, setSnapshot] = useState<ProtocolSnapshot | null>(null);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [validators, setValidators] = useState<StakingValidator[]>([]);
  const [stakingUser, setStakingUser] = useState<StakingUser | null>(null);
  const [stakingOnline, setStakingOnline] = useState(false);

  // Staking modal
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [stakeAmount, setStakeAmount] = useState("");
  const [stakeEstimate, setStakeEstimate] = useState<DepositEstimate | null>(null);
  const [stakeLoading, setStakeLoading] = useState(false);
  const [stakeEstimating, setStakeEstimating] = useState(false);
  const [stakeResult, setStakeResult] = useState<{ success: boolean; message: string } | null>(null);

  // Automations
  const [automations, setAutomations] = useState<Automation[]>([]);
  const refreshAutomations = useCallback(() => setAutomations(loadAutomations()), []);

  // Wallet data
  const [balance, setBalance] = useState<AddressBalance | null>(null);
  const [tokens, setTokens] = useState<AssetBalance[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNetwork = useCallback(async () => {
    try {
      const [h, block, p, ver] = await Promise.all([
        getBlockHeight(),
        getLastBlockHeader(),
        getConnectedPeers(),
        getNodeVersion().catch(() => ""),
      ]);
      setHeight(h);
      setLastBlock(block);
      setPeers(p);
      setNodeVer(ver);
    } catch { /* silent */ }
  }, []);

  const fetchStaking = useCallback(async () => {
    try {
      const [snap, rate, vals] = await Promise.all([
        getProtocolSnapshot(),
        getLiveExchangeRate(),
        getValidators(),
      ]);
      setSnapshot(snap);
      setExchangeRate(rate);
      setValidators(vals);
      setStakingOnline(true);
    } catch {
      setStakingOnline(false);
    }
  }, []);

  const fetchStakingUser = useCallback(async () => {
    if (!account?.address) return;
    try {
      const user = await getStakingUser(account.address);
      setStakingUser(user);
    } catch { setStakingUser(null); }
  }, [account?.address]);

  // Estimate deposit when amount changes
  useEffect(() => {
    const amt = parseFloat(stakeAmount);
    if (!amt || amt <= 0) { setStakeEstimate(null); return; }
    setStakeEstimating(true);
    const t = setTimeout(() => {
      estimateDeposit(amt * 1e8).then(est => {
        setStakeEstimate(est);
        setStakeEstimating(false);
      }).catch(() => {
        setStakeEstimate(null);
        setStakeEstimating(false);
      });
    }, 400);
    return () => clearTimeout(t);
  }, [stakeAmount]);

  const fetchWallet = useCallback(async () => {
    if (!account?.address) return;
    setLoading(true);
    try {
      const [bal, assets] = await Promise.all([
        getAddressBalance(account.address),
        getAssetBalances(account.address),
      ]);
      setBalance(bal);
      setTokens(assets);
    } catch { /* silent */ }
    setLoading(false);
  }, [account?.address]);

  const handleStake = useCallback(async () => {
    const seed = getSeed();
    const amt = parseFloat(stakeAmount);
    if (!seed || !amt || amt <= 0) return;
    setStakeLoading(true);
    setStakeResult(null);
    try {
      const result = await stakeDCC(seed, amt);
      if (result.success) {
        setStakeResult({ success: true, message: `Staked ${amt} DCC successfully! TX: ${result.id.slice(0, 12)}…` });
        setStakeAmount("");
        setStakeEstimate(null);
        fetchStaking();
        fetchStakingUser();
        fetchWallet();
      } else {
        setStakeResult({ success: false, message: result.error || "Transaction failed" });
      }
    } catch (err) {
      setStakeResult({ success: false, message: err instanceof Error ? err.message : "Staking failed" });
    }
    setStakeLoading(false);
  }, [stakeAmount, getSeed, fetchStaking, fetchStakingUser, fetchWallet]);

  useEffect(() => {
    fetchNetwork();
    fetchStaking();
    const iv = setInterval(() => { fetchNetwork(); fetchStaking(); }, 15000);
    return () => clearInterval(iv);
  }, [fetchNetwork, fetchStaking]);

  useEffect(() => {
    refreshAutomations();
    const iv = setInterval(refreshAutomations, 5000);
    return () => clearInterval(iv);
  }, [refreshAutomations]);

  useEffect(() => {
    if (isConnected) { fetchWallet(); fetchStakingUser(); }
  }, [isConnected, fetchWallet, fetchStakingUser]);

  const quickActions = [
    { icon: ArrowLeftRight, label: "Swap Tokens", desc: "Trade DCC for other tokens", color: "yellow", command: "Swap quote 1 DCC to wDAI" },
    { icon: Send, label: "Send DCC", desc: "Transfer tokens to an address", color: "primary", command: "Send 1 DCC to " },
    { icon: Coins, label: "Create Token", desc: "Issue a new token on-chain", color: "purple", command: "Create a token" },
    { icon: Flame, label: "Burn Tokens", desc: "Permanently destroy tokens", color: "red", command: "Burn tokens" },
    { icon: Activity, label: "Liquidity Pools", desc: "View & manage pools", color: "green", command: "List all liquidity pools" },
    { icon: Blocks, label: "Block Explorer", desc: "Query blocks & transactions", color: "blue", command: "Show me the latest block" },
    { icon: Clock, label: "Automations", desc: "Schedule recurring tasks", color: "primary", command: "__automations" },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-6 space-y-8">

        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Image src="/logo.png" alt="DCC" width={28} height={28} className="rounded-lg" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground">Dashboard</h1>
              <p className="text-[12px] text-muted/50">DecentralChain Mainnet</p>
            </div>
          </div>
          <button
            onClick={() => { fetchNetwork(); fetchStaking(); if (isConnected) { fetchWallet(); fetchStakingUser(); } }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </motion.div>

        {/* ─── Wallet Overview (if connected) ─── */}
        {isConnected && account && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card !p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="font-heading text-[14px] font-semibold text-foreground">Wallet</span>
                <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-medium">Connected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[12px] text-muted/60">{truncAddr(account.address)}</span>
                <CopyBtn text={account.address} />
              </div>
            </div>

            {/* Balance row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted/40 font-medium">Available</p>
                {balance ? (
                  <p className="text-[20px] font-heading font-bold text-foreground tabular-nums">
                    {balance.available.toFixed(4)}
                  </p>
                ) : (
                  <Skeleton className="h-7 w-28 mt-1" />
                )}
                <p className="text-[11px] text-primary font-medium">DCC</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted/40 font-medium">Regular</p>
                {balance ? (
                  <p className="text-[16px] font-heading font-semibold text-foreground/80 tabular-nums">
                    {balance.regular.toFixed(4)}
                  </p>
                ) : (
                  <Skeleton className="h-5 w-24 mt-1" />
                )}
                <p className="text-[11px] text-muted/50">DCC</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted/40 font-medium">Effective</p>
                {balance ? (
                  <p className="text-[16px] font-heading font-semibold text-foreground/80 tabular-nums">
                    {balance.effective.toFixed(4)}
                  </p>
                ) : (
                  <Skeleton className="h-5 w-24 mt-1" />
                )}
                <p className="text-[11px] text-muted/50">DCC</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted/40 font-medium">Generating</p>
                {balance ? (
                  <p className="text-[16px] font-heading font-semibold text-foreground/80 tabular-nums">
                    {balance.generating.toFixed(4)}
                  </p>
                ) : (
                  <Skeleton className="h-5 w-24 mt-1" />
                )}
                <p className="text-[11px] text-muted/50">DCC</p>
              </div>
            </div>

            {/* Token list */}
            {tokens.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                <p className="text-[10px] uppercase tracking-wider text-muted/40 font-medium mb-2">
                  Assets ({tokens.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {tokens.slice(0, 8).map((t) => {
                    const name = t.issueTransaction?.name || t.assetId.slice(0, 8);
                    const dec = t.issueTransaction?.decimals ?? 8;
                    const amt = t.balance / Math.pow(10, dec);
                    return (
                      <div key={t.assetId} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 rounded-full bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                            <span className="text-[8px] font-bold text-muted/50 uppercase">{name.slice(0, 2)}</span>
                          </div>
                          <span className="text-[12px] text-foreground/70 truncate">{name}</span>
                        </div>
                        <span className="text-[12px] font-mono text-foreground/60 tabular-nums ml-2">
                          {amt < 0.0001 ? amt.toExponential(2) : amt.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </span>
                      </div>
                    );
                  })}
                  {tokens.length > 8 && (
                    <p className="text-[11px] text-muted/40 px-2 py-1">+{tokens.length - 8} more</p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Not connected prompt ─── */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card !p-5 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-muted/50" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-foreground mb-0.5">Connect your wallet</p>
              <p className="text-[12px] text-muted/50">Use the Connect Wallet button in the navbar to see your DCC balance, tokens, and interact with the blockchain.</p>
            </div>
          </motion.div>
        )}

        {/* ─── DCC Staking ─── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Coins className="w-4 h-4 text-primary" />
            <h2 className="font-heading text-[14px] font-semibold text-foreground">DCC Staking</h2>
            <div className={`w-1.5 h-1.5 rounded-full ${stakingOnline ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            {exchangeRate && (
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-mono tabular-nums">
                1 stDCC = {exchangeRate.rate.toFixed(6)} DCC
              </span>
            )}
            <button
              onClick={() => { setStakeResult(null); setShowStakeModal(true); }}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-black text-[12px] font-semibold hover:bg-primary/90 transition-colors"
            >
              <Coins className="w-3.5 h-3.5" />
              Stake DCC
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={Coins}
              label="Total Staked"
              value={snapshot ? `${(snapshot.totalStaked / 1e8).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              sub="DCC"
              color="primary"
              delay={0}
              loading={!snapshot && stakingOnline}
            />
            <StatCard
              icon={TrendingUp}
              label="Exchange Rate"
              value={exchangeRate ? exchangeRate.rate.toFixed(4) : "—"}
              sub="stDCC → DCC"
              color="green"
              delay={1}
              loading={!exchangeRate && stakingOnline}
            />
            <StatCard
              icon={Users}
              label="Stakers"
              value={snapshot ? snapshot.totalUsers.toLocaleString() : "—"}
              sub="Total users"
              color="purple"
              delay={2}
              loading={!snapshot && stakingOnline}
            />
            <StatCard
              icon={Activity}
              label="Validators"
              value={snapshot ? snapshot.totalValidators.toString() : validators.length > 0 ? validators.filter(v => v.active).length.toString() : "—"}
              sub="Active"
              color="blue"
              delay={3}
              loading={!snapshot && !validators.length && stakingOnline}
            />
          </div>
        </div>

        {/* ─── Staking Details ─── */}
        {(snapshot || validators.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card !p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-green-400" />
              <h3 className="font-heading text-[14px] font-semibold text-foreground">Protocol Details</h3>
              {snapshot && !snapshot.paused && (
                <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-medium">Live</span>
              )}
              {snapshot?.paused && (
                <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 text-[10px] font-medium">Paused</span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[12px]">
              <div>
                <p className="text-muted/40 text-[10px] uppercase tracking-wider font-medium">Total Rewards</p>
                <p className="font-mono text-foreground/70 mt-0.5 text-[14px] font-semibold">
                  {snapshot ? (snapshot.totalRewards / 1e8).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"} DCC
                </p>
              </div>
              <div>
                <p className="text-muted/40 text-[10px] uppercase tracking-wider font-medium">Protocol Fee</p>
                <p className="font-mono text-foreground/70 mt-0.5 text-[14px] font-semibold">
                  {snapshot ? `${(snapshot.protocolFee / 100).toFixed(1)}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted/40 text-[10px] uppercase tracking-wider font-medium">Min Deposit</p>
                <p className="font-mono text-foreground/70 mt-0.5 text-[14px] font-semibold">
                  {snapshot ? `${(snapshot.minDeposit / 1e8).toFixed(2)} DCC` : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted/40 text-[10px] uppercase tracking-wider font-medium">Block Height</p>
                <p className="font-mono text-foreground/70 mt-0.5 text-[14px] font-semibold">
                  {height ? height.toLocaleString() : "—"}
                </p>
                {lastBlock && <p className="text-[10px] text-muted/40">{timeAgo(lastBlock.timestamp)}</p>}
              </div>
            </div>

            {/* Validators list */}
            {validators.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                <p className="text-[10px] uppercase tracking-wider text-muted/40 font-medium mb-2">
                  Validators ({validators.filter(v => v.active).length} active)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {validators.slice(0, 6).map((v) => (
                    <div key={v.address} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${v.active ? "bg-green-400" : "bg-muted/30"}`} />
                        <span className="text-[12px] text-foreground/70 truncate font-mono">{v.name || truncAddr(v.address)}</span>
                      </div>
                      <span className="text-[11px] font-mono text-foreground/50 tabular-nums ml-2">
                        {(v.totalLeased / 1e8).toLocaleString(undefined, { maximumFractionDigits: 0 })} DCC
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User staking position */}
            {isConnected && stakingUser && stakingUser.shares > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                <p className="text-[10px] uppercase tracking-wider text-muted/40 font-medium mb-2">Your Position</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-muted/40 text-[10px] uppercase tracking-wider font-medium">Staked</p>
                    <p className="font-mono text-foreground/70 mt-0.5 font-semibold">
                      {(stakingUser.deposited / 1e8).toFixed(4)} DCC
                    </p>
                  </div>
                  <div>
                    <p className="text-muted/40 text-[10px] uppercase tracking-wider font-medium">stDCC Shares</p>
                    <p className="font-mono text-foreground/70 mt-0.5 font-semibold">
                      {(stakingUser.shares / 1e8).toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted/40 text-[10px] uppercase tracking-wider font-medium">Current Value</p>
                    <p className="font-mono text-green-400 mt-0.5 font-semibold">
                      {(stakingUser.currentValue / 1e8).toFixed(4)} DCC
                    </p>
                  </div>
                  <div>
                    <p className="text-muted/40 text-[10px] uppercase tracking-wider font-medium">Rewards</p>
                    <p className="font-mono text-primary mt-0.5 font-semibold">
                      +{(stakingUser.rewards / 1e8).toFixed(4)} DCC
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Automations ─── */}
        {automations.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted/50" />
                <h2 className="font-heading text-[14px] font-semibold text-foreground">Automations</h2>
                {automations.filter(a => a.status === "active").length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-medium">
                    {automations.filter(a => a.status === "active").length} active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenChat("__automations")}
                  className="flex items-center gap-1 text-[11px] text-muted/50 hover:text-foreground transition-colors"
                >
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {automations.slice(0, 6).map((auto, i) => {
                const statusColor: Record<string, string> = {
                  active: "bg-green-400",
                  paused: "bg-yellow-400",
                  completed: "bg-blue-400",
                  failed: "bg-red-400",
                  cancelled: "bg-muted/30",
                };
                const typeIconMap: Record<string, React.ComponentType<{className?: string}>> = {
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
                const TypeIcon = typeIconMap[auto.action.type] || Clock;
                const isTerminal = auto.status === "completed" || auto.status === "cancelled" || auto.status === "failed";
                return (
                  <motion.div
                    key={auto.id}
                    variants={fadeUp}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className={`glass-card !p-4 ${isTerminal ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                        <TypeIcon className="w-3.5 h-3.5 text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor[auto.status]}`} />
                          <span className="text-[13px] font-medium text-foreground truncate">{auto.name}</span>
                        </div>
                        <p className="text-[11px] text-muted/40 truncate">{auto.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted/40">
                          <span>{auto.runCount}{auto.schedule.maxRuns ? `/${auto.schedule.maxRuns}` : ""} runs</span>
                          {auto.nextRunAt && <span>Next: {formatNextRun(auto)}</span>}
                          <span className="capitalize">{auto.status}</span>
                        </div>
                      </div>
                    </div>
                    {!isTerminal && (
                      <div className="flex items-center gap-1 mt-3 pt-2 border-t border-white/[0.04]">
                        <button
                          onClick={() => { auto.status === "active" ? pauseAutomation(auto.id) : resumeAutomation(auto.id); refreshAutomations(); }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
                        >
                          {auto.status === "active" ? <><Pause className="w-2.5 h-2.5" /> Pause</> : <><Play className="w-2.5 h-2.5" /> Resume</>}
                        </button>
                        <button
                          onClick={() => { cancelAutomation(auto.id); refreshAutomations(); }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-muted hover:text-red-400 transition-colors"
                        >
                          <XCircle className="w-2.5 h-2.5" /> Stop
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
              {/* New automation card */}
              <motion.button
                variants={fadeUp}
                initial="initial"
                animate="animate"
                transition={{ delay: Math.min(automations.length, 6) * 0.04, duration: 0.3 }}
                onClick={() => onOpenChat()}
                className="glass-card !p-4 flex flex-col items-center justify-center gap-2 text-center cursor-pointer group hover:border-primary/20 transition-colors min-h-[100px]"
              >
                <div className="w-8 h-8 rounded-xl bg-white/[0.03] flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Plus className="w-4 h-4 text-muted/30 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-[11px] text-muted/40 group-hover:text-foreground/60 transition-colors">New Automation</p>
              </motion.button>
            </div>
          </div>
        )}

        {/* ─── Quick Actions ─── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-muted/50" />
            <h2 className="font-heading text-[14px] font-semibold text-foreground">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.map((qa, i) => (
              <QuickAction
                key={i}
                icon={qa.icon}
                label={qa.label}
                desc={qa.desc}
                color={qa.color}
                onClick={() => onOpenChat(qa.command)}
                delay={i}
              />
            ))}
          </div>
        </div>

      </div>

      {/* ─── Stake DCC Modal ─── */}
      <AnimatePresence>
        {showStakeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowStakeModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 rounded-2xl bg-[var(--card)] border border-white/[0.06] shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Coins className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading text-[16px] font-bold text-foreground">Stake DCC</h3>
                    <p className="text-[11px] text-muted/50">Liquid staking — receive stDCC</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStakeModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted hover:text-foreground transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                {!isConnected ? (
                  <div className="text-center py-6">
                    <Wallet className="w-8 h-8 text-muted/30 mx-auto mb-3" />
                    <p className="text-[14px] text-foreground font-medium mb-1">Wallet not connected</p>
                    <p className="text-[12px] text-muted/50">Connect your wallet to stake DCC</p>
                  </div>
                ) : (
                  <>
                    {/* Amount input */}
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-muted/50 font-medium mb-1.5 block">
                        Amount to Stake
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="any"
                          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-[16px] font-mono text-foreground placeholder:text-muted/30 focus:outline-none focus:border-primary/40 transition-colors"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-muted/50">DCC</span>
                          {balance && (
                            <button
                              onClick={() => setStakeAmount(Math.max(0, balance.available - 0.01).toFixed(4))}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                            >
                              MAX
                            </button>
                          )}
                        </div>
                      </div>
                      {balance && (
                        <p className="text-[11px] text-muted/40 mt-1.5">
                          Available: <span className="text-foreground/60 font-mono">{balance.available.toFixed(4)} DCC</span>
                        </p>
                      )}
                    </div>

                    {/* Estimate preview */}
                    {stakeEstimating && (
                      <div className="flex items-center gap-2 text-[12px] text-muted/50">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Estimating...
                      </div>
                    )}
                    {stakeEstimate && !stakeEstimating && (
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 space-y-2">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-muted/50">You will receive</span>
                          <span className="font-mono text-foreground font-semibold">
                            {(stakeEstimate.sharesOut / 1e8).toFixed(4)} stDCC
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-muted/50">Exchange rate</span>
                          <span className="font-mono text-foreground/70">
                            1 DCC = {(1 / stakeEstimate.exchangeRate).toFixed(6)} stDCC
                          </span>
                        </div>
                        {stakeEstimate.fee > 0 && (
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="text-muted/50">Protocol fee</span>
                            <span className="font-mono text-foreground/70">
                              {(stakeEstimate.fee / 1e8).toFixed(4)} DCC
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Result message */}
                    {stakeResult && (
                      <div className={`rounded-xl p-3 text-[12px] ${stakeResult.success ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                        {stakeResult.message}
                      </div>
                    )}

                    {/* Min deposit warning */}
                    {snapshot && parseFloat(stakeAmount) > 0 && parseFloat(stakeAmount) < snapshot.minDeposit / 1e8 && (
                      <p className="text-[11px] text-yellow-400">
                        Minimum deposit: {(snapshot.minDeposit / 1e8).toFixed(2)} DCC
                      </p>
                    )}

                    {/* Stake button */}
                    <button
                      onClick={handleStake}
                      disabled={
                        stakeLoading ||
                        !parseFloat(stakeAmount) ||
                        parseFloat(stakeAmount) <= 0 ||
                        (balance ? parseFloat(stakeAmount) > balance.available : true) ||
                        (snapshot ? parseFloat(stakeAmount) < snapshot.minDeposit / 1e8 : false)
                      }
                      className="w-full py-3 rounded-xl bg-primary text-black font-heading font-bold text-[14px] hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {stakeLoading ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Staking...</>
                      ) : (
                        <><Coins className="w-4 h-4" /> Stake DCC</>
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
