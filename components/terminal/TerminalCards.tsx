"use client";

import { motion } from "framer-motion";
import {
  Blocks,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Globe,
  ArrowLeftRight,
  Droplets,
  Zap,
  Copy,
  Check,
  TrendingUp,
  Clock,
  Hash,
  Server,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Coins,
} from "lucide-react";
import { useState, type ReactNode } from "react";

/* ─── shared helpers ─── */
const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 rounded hover:bg-white/[0.06] text-muted/60 hover:text-muted transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function Stat({ label, value, icon, color = "primary" }: { label: string; value: string; icon?: ReactNode; color?: string }) {
  const colorClasses: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    green: "text-green-400 bg-green-400/10",
    yellow: "text-yellow-400 bg-yellow-400/10",
    red: "text-red-400 bg-red-400/10",
    blue: "text-blue-400 bg-blue-400/10",
    purple: "text-purple-400 bg-purple-400/10",
  };
  return (
    <motion.div variants={fadeUp} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02]">
      {icon && (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[color] || colorClasses.primary}`}>
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted/70 font-medium">{label}</p>
        <p className="text-[13px] text-foreground font-mono truncate">{value}</p>
      </div>
    </motion.div>
  );
}

function CardShell({ children, accent = "primary" }: { children: ReactNode; accent?: string }) {
  const borderColor: Record<string, string> = {
    primary: "border-primary/20",
    green: "border-green-500/20",
    yellow: "border-yellow-500/20",
    red: "border-red-500/20",
    blue: "border-blue-500/20",
    purple: "border-purple-500/20",
  };
  const glowColor: Record<string, string> = {
    primary: "shadow-primary/5",
    green: "shadow-green-500/5",
    yellow: "shadow-yellow-500/5",
    red: "shadow-red-500/5",
    blue: "shadow-blue-500/5",
    purple: "shadow-purple-500/5",
  };
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className={`mt-3 rounded-xl border ${borderColor[accent] || borderColor.primary} bg-white/[0.015] overflow-hidden shadow-lg ${glowColor[accent] || glowColor.primary} hover:shadow-xl transition-shadow duration-300`}
    >
      {children}
    </motion.div>
  );
}

function CardHeader({ icon, title, badge, emoji }: { icon: ReactNode; title: string; badge?: ReactNode; emoji?: string }) {
  return (
    <motion.div variants={fadeUp} className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] bg-white/[0.01]">
      <div className="flex items-center gap-2">
        {emoji && <span className="text-sm">{emoji}</span>}
        {icon}
        <span className="text-[12px] font-semibold uppercase tracking-wider text-muted">{title}</span>
      </div>
      {badge}
    </motion.div>
  );
}

/* ─── BLOCK CARD ─── */
export function BlockCard({ data }: { data: Record<string, unknown> }) {
  return (
    <CardShell accent="blue">
      <CardHeader
        icon={<Blocks className="w-3.5 h-3.5 text-blue-400" />}
        title="Block"
        emoji="📦"        badge={
          data.height ? (
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[11px] font-mono font-medium">
              #{String(data.height)}
            </span>
          ) : undefined
        }
      />
      <div className="p-3 grid grid-cols-2 gap-2">
        {data.height != null && <Stat label="Height" value={String(data.height)} icon={<Hash className="w-3.5 h-3.5" />} color="blue" />}
        {data.timestamp != null && <Stat label="Time" value={String(data.timestamp)} icon={<Clock className="w-3.5 h-3.5" />} color="purple" />}
        {data.transactionCount != null && <Stat label="Transactions" value={String(data.transactionCount)} icon={<Zap className="w-3.5 h-3.5" />} color="yellow" />}
        {data.blocksize != null && <Stat label="Size" value={String(data.blocksize) + " B"} icon={<Server className="w-3.5 h-3.5" />} color="primary" />}
        {data.generator != null && (
          <motion.div variants={fadeUp} className="col-span-2 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.02]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-400/10 text-green-400">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted/70 font-medium">Generator</p>
              <div className="flex items-center gap-1">
                <p className="text-[12px] text-foreground font-mono truncate">{String(data.generator)}</p>
                <CopyBtn text={String(data.generator)} />
              </div>
            </div>
          </motion.div>
        )}
        {data.id != null && (
          <motion.div variants={fadeUp} className="col-span-2 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.02]">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted/70 font-medium">Block ID</p>
              <div className="flex items-center gap-1">
                <p className="text-[11px] text-muted font-mono truncate">{String(data.id)}</p>
                <CopyBtn text={String(data.id)} />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </CardShell>
  );
}

/* ─── BALANCE CARD ─── */
export function BalanceCard({ data }: { data: Record<string, unknown> }) {
  const address = data.address as string | undefined;
  const entries = Object.entries(data).filter(([k]) => !["address", "totalTokens", "lpPositions", "dccBalance", "tokens"].includes(k));
  const dccEntries = entries.filter(([k]) => k.startsWith("DCC_"));
  const tokenEntries = entries.filter(([k]) => !k.startsWith("DCC_"));

  // If this has a 'tokens' array (portfolio view), show bar chart
  const tokens = data.tokens as Array<{ name: string; amount: number }> | undefined;

  return (
    <CardShell accent="green">
      <CardHeader
        icon={<Wallet className="w-3.5 h-3.5 text-green-400" />}
        title={tokens ? "Portfolio" : "Wallet"}
        emoji="👛"        badge={
          tokens ? (
            <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[11px] font-medium">
              {data.totalTokens ? `${data.totalTokens} tokens` : "Connected"}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[11px] font-medium">
              Connected
            </span>
          )
        }
      />
      <div className="p-3 space-y-2">
        {address && (
          <motion.div variants={fadeUp} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted/70 font-medium">Address</p>
              <div className="flex items-center gap-1">
                <p className="text-[12px] text-foreground font-mono truncate">{address}</p>
                <CopyBtn text={address} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Portfolio donut + bar chart */}
        {tokens && tokens.length > 0 && (() => {
          const total = tokens.reduce((s, t) => s + t.amount, 0);
          const COLORS = ["#6366f1", "#34d399", "#60a5fa", "#a78bfa", "#facc15", "#f87171", "#22d3ee", "#fb923c"];
          const slices = tokens.slice(0, 8);
          let cumulativePct = 0;
          const donutData = slices.map((t, i) => {
            const pct = total > 0 ? (t.amount / total) * 100 : 0;
            const offset = cumulativePct;
            cumulativePct += pct;
            return { ...t, pct, offset, color: COLORS[i % COLORS.length] };
          });
          return (
            <motion.div variants={fadeUp} className="space-y-3 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted/50 font-medium">Distribution</p>
              {/* Donut chart */}
              <div className="flex items-center gap-4">
                <svg viewBox="0 0 36 36" className="w-24 h-24 flex-shrink-0">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                  {donutData.map((d, i) => (
                    <motion.circle
                      key={d.name}
                      cx="18" cy="18" r="15.9"
                      fill="none"
                      stroke={d.color}
                      strokeWidth="3"
                      strokeDasharray={`${d.pct} ${100 - d.pct}`}
                      strokeDashoffset={`${25 - d.offset}`}
                      strokeLinecap="round"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.8 }}
                      transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
                    />
                  ))}
                </svg>
                <div className="flex-1 space-y-1">
                  {donutData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-[10px]">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-muted truncate flex-1">{d.name}</span>
                      <span className="text-muted/60 font-mono">{d.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Bar chart */}
              {slices.map((t, i) => {
                const maxAmount = Math.max(...tokens.map(tk => tk.amount));
                const barWidth = maxAmount > 0 ? Math.max((t.amount / maxAmount) * 100, 2) : 0;
                const colors = ["bg-primary", "bg-green-400", "bg-blue-400", "bg-purple-400", "bg-yellow-400", "bg-red-400", "bg-cyan-400", "bg-orange-400"];
                return (
                  <motion.div
                    key={t.name}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "100%" }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-[11px] font-medium text-muted w-16 shrink-0 truncate">{t.name}</span>
                    <div className="flex-1 bg-white/[0.04] rounded-full h-2.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ delay: 0.2 + i * 0.05, duration: 0.4, ease: "easeOut" }}
                        className={`h-full rounded-full ${colors[i % colors.length]}/60`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted/70 w-20 text-right shrink-0">
                      {t.amount >= 1000 ? t.amount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : t.amount.toFixed(4)}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          );
        })()}

        {/* DCC balances */}
        {dccEntries.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {dccEntries.map(([key, val]) => (
              <Stat
                key={key}
                label={key.replace("DCC_", "")}
                value={String(val)}
                icon={<Coins className="w-3.5 h-3.5" />}
                color="green"
              />
            ))}
          </div>
        )}

        {/* Other tokens */}
        {tokenEntries.length > 0 && (
          <>
            <motion.div variants={fadeUp} className="px-3 pt-2">
              <p className="text-[10px] uppercase tracking-wider text-muted/50 font-medium">Tokens</p>
            </motion.div>
            <div className="grid grid-cols-2 gap-2">
              {tokenEntries.map(([key, val]) => (
                <Stat key={key} label={key} value={String(val)} icon={<Coins className="w-3.5 h-3.5" />} color="purple" />
              ))}
            </div>
          </>
        )}

        {/* LP positions count */}
        {data.lpPositions != null && Number(data.lpPositions) > 0 && (
          <Stat label="LP Positions" value={String(data.lpPositions)} icon={<Droplets className="w-3.5 h-3.5" />} color="blue" />
        )}
      </div>
    </CardShell>
  );
}

/* ─── TRANSACTION CARD ─── */
export function TransactionCard({ data }: { data: Record<string, unknown> }) {
  const isSuccess = data.status === "Broadcast" || data.status === "confirmed";
  return (
    <CardShell accent={isSuccess ? "green" : "yellow"}>
      <CardHeader
        icon={<ArrowUpRight className="w-3.5 h-3.5 text-green-400" />}
        title="Transaction"
        emoji="📝"        badge={
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${isSuccess ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
            {String(data.status || "Pending")}
          </span>
        }
      />
      <div className="p-3 space-y-2">
        {data.txId != null && (
          <motion.div variants={fadeUp} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted/70 font-medium">TX ID</p>
              <div className="flex items-center gap-1">
                <p className="text-[11px] text-foreground font-mono truncate">{String(data.txId)}</p>
                <CopyBtn text={String(data.txId)} />
              </div>
            </div>
          </motion.div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(data)
            .filter(([k]) => !["txId", "status"].includes(k))
            .map(([key, val]) => (
              <Stat key={key} label={formatLabel(key)} value={String(val)} />
            ))}
        </div>
      </div>
    </CardShell>
  );
}

/* ─── TRANSACTION HISTORY CARD (with filters) ─── */
export function TransactionHistoryCard({ data }: { data: Record<string, unknown> }) {
  const txs = (data.transactions ?? []) as Array<{
    id: string; type: string; typeId?: number; timestamp: number;
    time: string; fee: string; amount?: string; recipient?: string; sender?: string;
  }>;
  const address = data.address as string | undefined;
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const uniqueTypes = Array.from(new Set(txs.map(t => t.type)));
  const filtered = txs.filter(t => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (t.id?.toLowerCase().includes(s) || t.type?.toLowerCase().includes(s) || t.recipient?.toLowerCase().includes(s) || t.sender?.toLowerCase().includes(s));
    }
    return true;
  });

  return (
    <CardShell accent="green">
      <CardHeader
        icon={<ArrowUpRight className="w-3.5 h-3.5 text-green-400" />}
        title="Transaction History"
        emoji="📜"
        badge={
          <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[11px] font-mono font-medium">
            {filtered.length}/{txs.length}
          </span>
        }
      />
      <div className="p-3 space-y-2">
        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] text-muted outline-none focus:border-primary/30"
          >
            <option value="all">All types</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="text"
            placeholder="Search ID or address…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] text-foreground placeholder:text-muted/40 outline-none focus:border-primary/30 min-w-0"
          />
        </div>

        {/* Address */}
        {address && (
          <motion.div variants={fadeUp} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted/70 font-medium">Address</p>
              <div className="flex items-center gap-1">
                <p className="text-[12px] text-foreground font-mono truncate">{address}</p>
                <CopyBtn text={address} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Transaction list */}
        <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
          {filtered.map((tx, i) => (
            <motion.div
              key={tx.id || i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              className="rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    tx.type === "Transfer" ? "bg-green-500/10 text-green-400" :
                    tx.type === "Invoke Script" ? "bg-purple-500/10 text-purple-400" :
                    tx.type === "Data" ? "bg-yellow-500/10 text-yellow-400" :
                    "bg-white/[0.06] text-muted"
                  }`}>
                    {tx.type}
                  </span>
                  {tx.amount && <span className="text-[11px] font-mono text-green-400">{tx.amount} DCC</span>}
                </div>
                <span className="text-[10px] text-muted/50">{tx.time}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted/50 font-mono truncate">{tx.id}</span>
                {tx.id && <CopyBtn text={tx.id} />}
              </div>
              {tx.recipient && (
                <span className="text-[10px] text-muted/40">→ {tx.recipient.slice(0, 12)}…</span>
              )}
              <span className="text-[10px] text-muted/30 ml-2">Fee: {tx.fee}</span>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <p className="text-[11px] text-muted/30 text-center py-4">No transactions match filters</p>
          )}
        </div>
      </div>
    </CardShell>
  );
}

/* ─── NETWORK CARD ─── */
export function NetworkCard({ data }: { data: Record<string, unknown> }) {
  return (
    <CardShell accent="primary">
      <CardHeader
        icon={<Globe className="w-3.5 h-3.5 text-primary" />}
        title="Network Status"
        emoji="🌐"        badge={
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-green-400"
          />
        }
      />
      <div className="p-3 grid grid-cols-2 gap-2">
        {Object.entries(data).map(([key, val]) => (
          <Stat
            key={key}
            label={formatLabel(key)}
            value={String(val)}
            icon={key.includes("height") ? <Blocks className="w-3.5 h-3.5" /> : key.includes("peer") ? <Globe className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            color={key.includes("height") ? "blue" : key.includes("peer") ? "green" : "primary"}
          />
        ))}
      </div>
    </CardShell>
  );
}

/* ─── PEERS CARD ─── */
export function PeersCard({ data }: { data: Record<string, unknown> }) {
  const peers = data.peers as string[] | undefined;
  const count = data.connectedPeers ?? data.count ?? (peers?.length ?? 0);
  return (
    <CardShell accent="green">
      <CardHeader
        icon={<Globe className="w-3.5 h-3.5 text-green-400" />}
        title="Connected Peers"
        emoji="🔗"        badge={
          <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[11px] font-mono font-medium">
            {String(count)}
          </span>
        }
      />
      {peers && (
        <motion.div variants={fadeUp} className="p-3">
          <div className="flex flex-wrap gap-1.5">
            {peers.map((p, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-white/[0.03] border border-white/[0.06] text-muted hover:text-foreground hover:border-primary/20 transition-colors"
              >
                {p}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}
    </CardShell>
  );
}

/* ─── BRIDGE CARD ─── */
export function BridgeCard({ data }: { data: Record<string, unknown> }) {
  return (
    <CardShell accent="purple">
      <CardHeader
        icon={<ArrowLeftRight className="w-3.5 h-3.5 text-purple-400" />}
        title="Bridge"
        emoji="🌉"        badge={
          data.status ? (
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${data.status === "healthy" || data.status === "ok" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
              {String(data.status)}
            </span>
          ) : undefined
        }
      />
      <div className="p-3 grid grid-cols-2 gap-2">
        {Object.entries(data).map(([key, val]) => (
          <Stat
            key={key}
            label={formatLabel(key)}
            value={String(val)}
            icon={key.includes("fee") ? <Coins className="w-3.5 h-3.5" /> : key.includes("min") || key.includes("max") ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
            color="purple"
          />
        ))}
      </div>
    </CardShell>
  );
}

/* ─── POOL CARD ─── */
export function PoolCard({ data }: { data: Record<string, unknown> }) {
  return (
    <CardShell accent="blue">
      <CardHeader
        icon={<Droplets className="w-3.5 h-3.5 text-blue-400" />}
        title="Liquidity Pool"
        emoji="💧"      />
      <div className="p-3 grid grid-cols-2 gap-2">
        {Object.entries(data).map(([key, val]) => (
          <Stat
            key={key}
            label={formatLabel(key)}
            value={String(val)}
            icon={key.includes("reserve") ? <Droplets className="w-3.5 h-3.5" /> : key.includes("fee") ? <Coins className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            color={key.includes("reserve") ? "blue" : key.includes("fee") ? "yellow" : "primary"}
          />
        ))}
      </div>
    </CardShell>
  );
}

/* ─── SWAP CARD ─── */
export function SwapCard({ data, onCancelSwap }: { data: Record<string, unknown>; onCancelSwap?: (msgId: string) => void }) {
  const isExecuted = !!data.txId;
  const isPending = !!data.pendingSwap;
  const countdown = typeof data.countdown === "number" ? data.countdown : undefined;
  const isCancelled = data.status === "Cancelled";
  const isFailed = data.status === "Failed";
  const accent = isExecuted ? "green" : isCancelled || isFailed ? "red" : isPending ? "yellow" : "yellow";
  const msgId = typeof data.msgId === "string" ? data.msgId : undefined;
  return (
    <CardShell accent={accent}>
      <CardHeader
        icon={<ArrowLeftRight className="w-3.5 h-3.5 text-yellow-400" />}
        title={isExecuted ? "Swap Executed" : isPending ? "Swap Pending" : "Swap Quote"}
        emoji={isExecuted ? "⚡" : isPending ? "⏳" : "🔄"}        badge={
          isExecuted ? (
            <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[11px] font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {String(data.status || "Confirmed")}
            </span>
          ) : isPending && countdown != null ? (
            <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 text-[11px] font-mono font-medium animate-pulse">
              Executing in {countdown}s…
            </span>
          ) : isCancelled ? (
            <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[11px] font-medium">
              Cancelled
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 text-[11px] font-medium">
              Quote
            </span>
          )
        }
      />
      <div className="p-3 space-y-2">
        {/* Countdown progress bar */}
        {isPending && countdown != null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-400"
                initial={{ width: "100%" }}
                animate={{ width: `${(countdown / 5) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {onCancelSwap && msgId && (
              <button
                onClick={() => onCancelSwap(msgId)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                ✕ Cancel Swap
              </button>
            )}
          </motion.div>
        )}
        {data.txId != null && (
          <motion.div variants={fadeUp} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted/70 font-medium">TX ID</p>
              <div className="flex items-center gap-1">
                <p className="text-[11px] text-foreground font-mono truncate">{String(data.txId)}</p>
                <CopyBtn text={String(data.txId)} />
              </div>
            </div>
          </motion.div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(data)
            .filter(([k]) => !["txId", "pendingSwap", "countdown", "msgId"].includes(k))
            .map(([key, val]) => (
              <Stat
                key={key}
                label={formatLabel(key)}
                value={String(val)}
                icon={key.includes("input") ? <ArrowUpRight className="w-3.5 h-3.5" /> : key.includes("output") ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                color={key.includes("input") ? "yellow" : key.includes("output") ? "green" : "primary"}
              />
            ))}
        </div>
      </div>
    </CardShell>
  );
}

/* ─── ERROR CARD ─── */
export function ErrorCard({ data }: { data: Record<string, unknown> }) {
  return (
    <CardShell accent="red">
      <CardHeader
        icon={<XCircle className="w-3.5 h-3.5 text-red-400" />}
        title="Error"
        emoji="❌"      />
      <div className="p-3 grid grid-cols-1 gap-2">
        {Object.entries(data).map(([key, val]) => (
          <Stat key={key} label={formatLabel(key)} value={String(val)} color="red" />
        ))}
      </div>
    </CardShell>
  );
}

/* ─── BLOCK TRANSACTIONS CARD ─── */
export function BlockTransactionsCard({ data }: { data: Record<string, unknown> }) {
  const txs = (data.transactions ?? []) as Record<string, string>[];
  const blockHeight = data.blockHeight;
  const blockId = data.blockId as string | undefined;

  return (
    <CardShell accent="blue">
      <CardHeader
        icon={<Blocks className="w-3.5 h-3.5 text-blue-400" />}
        title="Block Transactions"
        emoji="📋"        badge={
          blockHeight != null ? (
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[11px] font-mono font-medium">
              #{String(blockHeight)} &middot; {txs.length} tx{txs.length !== 1 ? "s" : ""}
            </span>
          ) : undefined
        }
      />
      <div className="p-3 space-y-2">
        {/* Block metadata row */}
        <div className="grid grid-cols-2 gap-2">
          {data.generator != null && <Stat label="Generator" value={String(data.generator).slice(0, 16) + "…"} icon={<Shield className="w-3.5 h-3.5" />} color="green" />}
          {data.timestamp != null && <Stat label="Time" value={String(data.timestamp)} icon={<Clock className="w-3.5 h-3.5" />} color="purple" />}
          {data.totalFee != null && <Stat label="Total Fee" value={String(data.totalFee)} icon={<Coins className="w-3.5 h-3.5" />} color="yellow" />}
        </div>

        {blockId != null && (
          <motion.div variants={fadeUp} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted/70 font-medium">Block ID</p>
              <div className="flex items-center gap-1">
                <p className="text-[11px] text-muted font-mono truncate">{blockId}</p>
                <CopyBtn text={blockId} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Transactions */}
        {txs.length > 0 && (
          <motion.div variants={fadeUp} className="pt-1">
            <p className="text-[10px] uppercase tracking-wider text-muted/50 font-medium px-1 mb-2">Transactions</p>
            <div className="space-y-2">
              {txs.map((tx, i) => (
                <motion.div
                  key={tx.id || i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.25 }}
                  className="rounded-lg border border-white/[0.04] bg-white/[0.01] overflow-hidden"
                >
                  {/* TX header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.03] bg-white/[0.01]">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded flex items-center justify-center bg-blue-400/10 text-blue-400 text-[10px] font-bold">
                        {i + 1}
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        tx.type === "Transfer" ? "bg-green-500/10 text-green-400" :
                        tx.type === "Invoke Script" ? "bg-purple-500/10 text-purple-400" :
                        tx.type === "Data" ? "bg-yellow-500/10 text-yellow-400" :
                        tx.type === "Mass Transfer" ? "bg-blue-500/10 text-blue-400" :
                        "bg-white/[0.06] text-muted"
                      }`}>
                        {tx.type}
                      </span>
                    </div>
                    {tx.time && <span className="text-[10px] text-muted/50 font-mono">{tx.time}</span>}
                  </div>
                  {/* TX body */}
                  <div className="px-3 py-2 space-y-1.5">
                    {tx.id && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted/60 uppercase w-10 flex-shrink-0">ID</span>
                        <span className="text-[11px] text-foreground font-mono truncate flex-1">{tx.id}</span>
                        <CopyBtn text={tx.id} />
                      </div>
                    )}
                    {tx.sender && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted/60 uppercase w-10 flex-shrink-0">From</span>
                        <span className="text-[11px] text-foreground font-mono truncate flex-1">{tx.sender}</span>
                        <CopyBtn text={tx.sender} />
                      </div>
                    )}
                    {tx.recipient && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted/60 uppercase w-10 flex-shrink-0">To</span>
                        <span className="text-[11px] text-foreground font-mono truncate flex-1">{tx.recipient}</span>
                        <CopyBtn text={tx.recipient} />
                      </div>
                    )}
                    <div className="flex items-center gap-3 pt-0.5">
                      {tx.amount && (
                        <span className="text-[11px] font-mono text-green-400">{tx.amount}</span>
                      )}
                      {tx.fee && (
                        <span className="text-[10px] font-mono text-muted/50">Fee: {tx.fee}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {txs.length === 0 && (
          <motion.div variants={fadeUp} className="px-3 py-4 text-center text-[12px] text-muted/50">
            No transactions in this block.
          </motion.div>
        )}
      </div>
    </CardShell>
  );
}

/* ─── GENERIC FALLBACK ─── */
export function GenericDataCard({ data }: { data: Record<string, unknown> }) {
  return (
    <CardShell>
      <div className="p-3 space-y-1">
        {Object.entries(data).map(([key, value], i) => {
          if (key === "peers" && Array.isArray(value)) {
            return (
              <motion.div key={key} variants={fadeUp} className={`px-3 py-2.5 rounded-lg ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                <p className="text-[10px] text-muted/70 uppercase tracking-wider font-medium mb-1.5">{formatLabel(key)}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(value as string[]).map((p, pi) => (
                    <span key={pi} className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/[0.04] text-muted">{p}</span>
                  ))}
                </div>
              </motion.div>
            );
          }
          return (
            <motion.div
              key={key}
              variants={fadeUp}
              className={`px-3 py-2.5 rounded-lg flex items-center justify-between ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}
            >
              <span className="text-[10px] text-muted/70 uppercase tracking-wider font-medium">{formatLabel(key)}</span>
              <span className="text-[13px] text-foreground font-mono break-all text-right max-w-[60%]">{String(value)}</span>
            </motion.div>
          );
        })}
      </div>
    </CardShell>
  );
}

/* ─── TOKEN DETAIL CARD ─── */
export function TokenDetailCard({ data }: { data: Record<string, unknown> }) {
  const name = data.name as string || "Unknown";
  const assetId = data.assetId as string || "";
  const description = data.description as string || "";
  const quantity = data.quantity as number || 0;
  const decimals = data.decimals as number || 0;
  const reissuable = data.reissuable as boolean;
  const issuer = data.issuer as string || "";
  const issueHeight = data.issueHeight as number || 0;
  const supply = quantity / Math.pow(10, decimals);

  return (
    <CardShell accent="purple">
      <CardHeader
        icon={<Coins className="w-3.5 h-3.5 text-purple-400" />}
        title={name}
        emoji="🪙"
        badge={
          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-[11px] font-medium">
            Token
          </span>
        }
      />
      <div className="p-3 space-y-2">
        {assetId && (
          <motion.div variants={fadeUp} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted/70 font-medium">Asset ID</p>
              <div className="flex items-center gap-1">
                <p className="text-[12px] text-foreground font-mono truncate">{assetId}</p>
                <CopyBtn text={assetId} />
              </div>
            </div>
          </motion.div>
        )}
        {description && (
          <Stat label="Description" value={description} icon={<Hash className="w-3.5 h-3.5" />} color="purple" />
        )}
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="Total Supply"
            value={supply >= 1e6 ? `${(supply / 1e6).toFixed(2)}M` : supply.toLocaleString(undefined, { maximumFractionDigits: decimals })}
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            color="blue"
          />
          <Stat
            label="Decimals"
            value={String(decimals)}
            icon={<Hash className="w-3.5 h-3.5" />}
            color="primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="Reissuable"
            value={reissuable ? "Yes" : "No"}
            icon={reissuable ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            color={reissuable ? "green" : "red"}
          />
          {issueHeight > 0 && (
            <Stat
              label="Issue Height"
              value={issueHeight.toLocaleString()}
              icon={<Blocks className="w-3.5 h-3.5" />}
              color="yellow"
            />
          )}
        </div>
        {issuer && (
          <motion.div variants={fadeUp} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted/70 font-medium">Issuer</p>
              <div className="flex items-center gap-1">
                <p className="text-[12px] text-foreground font-mono truncate">{issuer}</p>
                <CopyBtn text={issuer} />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </CardShell>
  );
}

/* ─── ROUTER ─── */
export function TerminalDataCard({ type, data, onCancelSwap }: { type?: string; data: Record<string, unknown>; onCancelSwap?: (msgId: string) => void }) {
  switch (type) {
    case "block":
      return <BlockCard data={data} />;
    case "block-txs":
      return <BlockTransactionsCard data={data} />;
    case "balance":
      return <BalanceCard data={data} />;
    case "transaction":
      return <TransactionCard data={data} />;
    case "tx-history":
      return <TransactionHistoryCard data={data} />;
    case "network":
      return <NetworkCard data={data} />;
    case "peers":
      return <PeersCard data={data} />;
    case "bridge":
      return <BridgeCard data={data} />;
    case "pool":
      return <PoolCard data={data} />;
    case "swap":
      return <SwapCard data={data} onCancelSwap={onCancelSwap} />;
    case "token-detail":
      return <TokenDetailCard data={data} />;
    case "error":
      return <ErrorCard data={data} />;
    default:
      return <GenericDataCard data={data} />;
  }
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
