const AMM_URL = "https://amm.decentralchain.io";

async function ammFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${AMM_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`AMM API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface AmmHealth {
  status: string;
  [key: string]: unknown;
}

export interface Pool {
  poolKey: string;
  token0: string;
  token1: string;
  reserve0: number;
  reserve1: number;
  tvl: number;
  feeBps: number;
  [key: string]: unknown;
}

export interface PoolStats {
  volume24h: number;
  volume7d: number;
  fees24h: number;
  apy: number;
  [key: string]: unknown;
}

export interface SwapRecord {
  [key: string]: unknown;
}

export interface SwapQuote {
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  fee: number;
  [key: string]: unknown;
}

export interface LiquidityEstimate {
  [key: string]: unknown;
}

export interface UserPosition {
  poolKey: string;
  lpTokens: number;
  share: number;
  [key: string]: unknown;
}

export interface TokenInfo {
  assetId: string;
  name: string;
  decimals: number;
  [key: string]: unknown;
}

export interface ProtocolStatus {
  [key: string]: unknown;
}

export async function getAmmHealth(): Promise<AmmHealth> {
  return ammFetch<AmmHealth>("/health");
}

export async function listPools(): Promise<Pool[]> {
  return ammFetch<Pool[]>("/pools");
}

export async function getPool(poolKey: string): Promise<Pool> {
  return ammFetch<Pool>(`/pools/${encodeURIComponent(poolKey)}`);
}

export async function getPoolPrice(
  poolKey: string
): Promise<{ price: number; [key: string]: unknown }> {
  return ammFetch(`/pools/${encodeURIComponent(poolKey)}/price`);
}

export async function getPoolStats(poolKey: string): Promise<PoolStats> {
  return ammFetch<PoolStats>(
    `/pools/${encodeURIComponent(poolKey)}/stats`
  );
}

export async function listRecentSwaps(): Promise<SwapRecord[]> {
  return ammFetch<SwapRecord[]>("/swaps");
}

export async function getSwapsByAddress(
  address: string
): Promise<SwapRecord[]> {
  return ammFetch<SwapRecord[]>(`/swaps/${encodeURIComponent(address)}`);
}

export async function getSwapQuote(
  tokenIn: string,
  tokenOut: string,
  amount: number
): Promise<SwapQuote> {
  return ammFetch<SwapQuote>(
    `/quote/swap?tokenIn=${encodeURIComponent(tokenIn)}&tokenOut=${encodeURIComponent(tokenOut)}&amount=${amount}`
  );
}

export async function getAddLiquidityEstimate(
  poolKey: string,
  amount0: number,
  amount1: number
): Promise<LiquidityEstimate> {
  return ammFetch<LiquidityEstimate>(
    `/quote/add-liquidity?poolKey=${encodeURIComponent(poolKey)}&amount0=${amount0}&amount1=${amount1}`
  );
}

export async function getRemoveLiquidityEstimate(
  poolKey: string,
  lpTokens: number
): Promise<LiquidityEstimate> {
  return ammFetch<LiquidityEstimate>(
    `/quote/remove-liquidity?poolKey=${encodeURIComponent(poolKey)}&lpTokens=${lpTokens}`
  );
}

export async function getUserPositions(
  address: string
): Promise<UserPosition[]> {
  return ammFetch<UserPosition[]>(
    `/user/${encodeURIComponent(address)}/positions`
  );
}

export async function getUserTokenBalance(
  address: string,
  assetId: string
): Promise<{ balance: number; [key: string]: unknown }> {
  return ammFetch(
    `/user/${encodeURIComponent(address)}/balance/${encodeURIComponent(assetId)}`
  );
}

export async function getTokenInfo(assetId: string): Promise<TokenInfo> {
  return ammFetch<TokenInfo>(`/token/${encodeURIComponent(assetId)}`);
}

export async function getProtocolStatus(): Promise<ProtocolStatus> {
  return ammFetch<ProtocolStatus>("/protocol/status");
}
