const STAKING_API = process.env.NEXT_PUBLIC_STAKING_API || "https://staking.decentralchain.io/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchStaking(path: string): Promise<any> {
  const res = await fetch(`${STAKING_API}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Staking API ${res.status}`);
  return res.json();
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = Number(v); return isNaN(n) ? 0 : n; }
  return 0;
}

/* ─── Types ─── */

export interface ProtocolSnapshot {
  totalStaked: number;
  totalShares: number;
  exchangeRate: number;
  totalUsers: number;
  totalValidators: number;
  totalRewards: number;
  protocolFee: number;
  minDeposit: number;
  paused: boolean;
  timestamp: number;
}

export interface ExchangeRate {
  rate: number;
  inverse: number;
  timestamp: number;
}

export interface StakingValidator {
  address: string;
  name?: string;
  totalLeased: number;
  active: boolean;
}

export interface StakingUser {
  address: string;
  shares: number;
  deposited: number;
  currentValue: number;
  rewards: number;
}

export interface DepositEstimate {
  amountIn: number;
  sharesOut: number;
  exchangeRate: number;
  fee: number;
}

export interface WithdrawEstimate {
  sharesIn: number;
  amountOut: number;
  exchangeRate: number;
  fee: number;
  pendingDuration: string;
}

export interface PendingWithdrawal {
  requestId: string;
  address: string;
  shares: number;
  amount: number;
  requestedAt: number;
  status: string;
}

/* ─── Protocol ─── */

export async function getProtocolSnapshot(): Promise<ProtocolSnapshot> {
  const raw = await fetchStaking("/protocol/snapshot");
  return {
    totalStaked: num(raw.total_pooled_dcc),
    totalShares: num(raw.total_shares),
    exchangeRate: 1, // stDCC is always 1:1 with DCC
    totalUsers: 0, // not in snapshot endpoint
    totalValidators: num(raw.validator_count),
    totalRewards: num(raw.total_protocol_fees_dcc),
    protocolFee: 0,
    minDeposit: 0,
    paused: false,
    timestamp: raw.timestamp ? num(raw.timestamp) : Date.now(),
  };
}

export async function getSnapshotHistory(): Promise<ProtocolSnapshot[]> {
  const list = await fetchStaking("/protocol/snapshots");
  if (!Array.isArray(list)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return list.map((raw: any) => ({
    totalStaked: num(raw.total_pooled_dcc),
    totalShares: num(raw.total_shares),
    exchangeRate: 1, // stDCC is always 1:1 with DCC
    totalUsers: 0,
    totalValidators: num(raw.validator_count),
    totalRewards: num(raw.total_protocol_fees_dcc),
    protocolFee: 0,
    minDeposit: 0,
    paused: false,
    timestamp: raw.timestamp ? num(raw.timestamp) : Date.now(),
  }));
}

/* ─── Chain (live reads) ─── */

export async function getLiveExchangeRate(): Promise<ExchangeRate> {
  // stDCC is always 1:1 with DCC
  return {
    rate: 1,
    inverse: 1,
    timestamp: Date.now(),
  };
}

export async function getLiveProtocol(): Promise<Record<string, unknown>> {
  return fetchStaking("/chain/protocol");
}

export async function getValidators(): Promise<StakingValidator[]> {
  const raw = await fetchStaking("/chain/validators");
  if (!Array.isArray(raw)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.map((v: any) => ({
    address: v.address ?? "",
    name: v.name,
    totalLeased: num(v.total_leased ?? v.totalLeased),
    active: v.active ?? true,
  }));
}

export async function getStakingUser(address: string): Promise<StakingUser> {
  const raw = await fetchStaking(`/chain/users/${encodeURIComponent(address)}`);
  const deposited = num(raw.total_deposited ?? raw.deposited);
  const shares = num(raw.total_shares_minted ?? raw.shares);
  return {
    address: raw.address ?? address,
    shares,
    deposited,
    currentValue: deposited, // approximate; exchange-rate based calc could refine
    rewards: Math.max(0, deposited - num(raw.total_withdrawn ?? 0)),
  };
}

/* ─── Deposits & Withdrawals ─── */

export async function getUserDeposits(address: string): Promise<Record<string, unknown>[]> {
  return fetchStaking(`/deposits/${encodeURIComponent(address)}`);
}

export async function getUserWithdrawals(address: string): Promise<Record<string, unknown>[]> {
  return fetchStaking(`/withdrawals/${encodeURIComponent(address)}`);
}

export async function getPendingWithdrawals(): Promise<PendingWithdrawal[]> {
  return fetchStaking("/withdrawals/pending/all");
}

/* ─── Rewards ─── */

export async function getRewardHistory(): Promise<Record<string, unknown>[]> {
  return fetchStaking("/rewards");
}

/* ─── Estimators ─── */

export async function estimateDeposit(amount: number): Promise<DepositEstimate> {
  const res = await fetch(`${STAKING_API}/estimate/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error(`Estimate deposit ${res.status}`);
  const raw = await res.json();
  // API: { depositAmount, sharesToReceive, exchangeRate, dccPerStDcc, minDeposit, protocolPaused }
  return {
    amountIn: num(raw.depositAmount),
    sharesOut: num(raw.sharesToReceive),
    exchangeRate: 1, // stDCC is always 1:1 with DCC
    fee: 0, // API doesn't return a fee field for deposits
  };
}

export async function estimateWithdraw(shares: number): Promise<WithdrawEstimate> {
  const res = await fetch(`${STAKING_API}/estimate/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shares }),
  });
  if (!res.ok) throw new Error(`Estimate withdraw ${res.status}`);
  const raw = await res.json();
  // API: { sharesToBurn, dccToReceive, exchangeRate, dccPerStDcc, minWithdrawShares, protocolPaused }
  return {
    sharesIn: num(raw.sharesToBurn),
    amountOut: num(raw.dccToReceive),
    exchangeRate: 1, // stDCC is always 1:1 with DCC
    fee: 0,
    pendingDuration: "~7 days",
  };
}

/* ─── Health ─── */

export async function getStakingHealth(): Promise<{ status: string }> {
  return fetchStaking("/health");
}

/* ─── Users ─── */

export interface TopUser {
  address: string;
  shares: number;
  deposited: number;
  currentValue: number;
  rewards: number;
}

export async function getTopUsers(): Promise<TopUser[]> {
  const raw = await fetchStaking("/users");
  if (!Array.isArray(raw)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.map((u: any) => {
    const deposited = num(u.total_deposited ?? u.deposited);
    const withdrawn = num(u.total_withdrawn ?? 0);
    const shares = num(u.total_shares_minted ?? u.shares);
    return {
      address: u.address ?? "",
      shares,
      deposited,
      currentValue: deposited - withdrawn,
      rewards: 0,
    };
  });
}

export async function getIndexedUser(address: string): Promise<StakingUser> {
  const raw = await fetchStaking(`/users/${encodeURIComponent(address)}`);
  const deposited = num(raw.total_deposited ?? raw.deposited);
  const shares = num(raw.total_shares_minted ?? raw.shares);
  return {
    address: raw.address ?? address,
    shares,
    deposited,
    currentValue: deposited - num(raw.total_withdrawn ?? 0),
    rewards: 0,
  };
}

/* ─── Chain extras ─── */

export async function getChainHeight(): Promise<{ height: number }> {
  return fetchStaking("/chain/height");
}

export async function getChainBalance(address: string): Promise<{ address: string; balance: number }> {
  return fetchStaking(`/chain/balance/${encodeURIComponent(address)}`);
}

export async function getChainWithdrawal(requestId: string): Promise<PendingWithdrawal> {
  return fetchStaking(`/chain/withdrawals/${encodeURIComponent(requestId)}`);
}

export async function getSingleValidator(address: string): Promise<StakingValidator> {
  return fetchStaking(`/chain/validators/${encodeURIComponent(address)}`);
}

/* ─── Tx Builders ─── */

export async function buildDepositTx(senderPublicKey: string, amount: number): Promise<Record<string, unknown>> {
  const res = await fetch(`${STAKING_API}/tx/build/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senderPublicKey, amount }),
  });
  if (!res.ok) throw new Error(`Build deposit tx ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function buildRequestWithdrawTx(senderPublicKey: string, shares: number): Promise<Record<string, unknown>> {
  const res = await fetch(`${STAKING_API}/tx/build/request-withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senderPublicKey, shares }),
  });
  if (!res.ok) throw new Error(`Build request-withdraw tx ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function buildClaimWithdrawTx(senderPublicKey: string, requestId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${STAKING_API}/tx/build/claim-withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senderPublicKey, requestId }),
  });
  if (!res.ok) throw new Error(`Build claim-withdraw tx ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

/* ─── Estimators extra ─── */

export interface RewardFeeEstimate {
  rewardAmount: number;
  protocolFee: number;
  netReward: number;
}

export async function estimateRewardFee(amount: number): Promise<RewardFeeEstimate> {
  const res = await fetch(`${STAKING_API}/estimate/reward-fee`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error(`Estimate reward fee ${res.status}`);
  return res.json() as Promise<RewardFeeEstimate>;
}

/* ─── Broadcast ─── */

export async function broadcastTx(signedTx: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${STAKING_API}/tx/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signedTx),
  });
  if (!res.ok) throw new Error(`Broadcast tx ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function getTxStatus(txId: string): Promise<{ status: string; confirmations?: number }> {
  return fetchStaking(`/tx/status/${encodeURIComponent(txId)}`);
}
