const NODE_URL = "https://mainnet-node.decentralchain.io";
const AMM_DAPP = "3Da7xwRRtXfkA46jaKTYb75Usd2ZNWdY6HX";

async function nodeFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${NODE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Node API error: ${res.status}`);
  return res.json() as Promise<T>;
}

interface DataEntry {
  key: string;
  type: string;
  value: string | number | boolean;
}

async function getDappData(): Promise<Map<string, string | number | boolean>> {
  const entries = await nodeFetch<DataEntry[]>(
    `/addresses/data/${AMM_DAPP}`
  );
  const map = new Map<string, string | number | boolean>();
  for (const e of entries) map.set(e.key, e.value);
  return map;
}

async function getAssetName(assetId: string): Promise<{ name: string; decimals: number }> {
  try {
    const info = await nodeFetch<{ name: string; decimals: number }>(
      `/assets/details/${encodeURIComponent(assetId)}`
    );
    return { name: info.name, decimals: info.decimals };
  } catch {
    return { name: assetId.slice(0, 8) + "…", decimals: 8 };
  }
}

export interface AmmHealth {
  status: string;
  [key: string]: unknown;
}

export interface Pool {
  poolKey: string;
  token0: string;
  token1: string;
  token0Name: string;
  token1Name: string;
  reserve0: number;
  reserve1: number;
  tvl: number;
  feeBps: number;
  swapCount?: number;
  lpSupply?: number;
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
  const data = await getDappData();
  return {
    status: data.has("v") ? "ok" : "unknown",
    contractVersion: data.get("v") as number,
    poolCount: (data.get("poolCount") as number) ?? 0,
    dApp: AMM_DAPP,
  };
}

export async function listPools(): Promise<Pool[]> {
  const data = await getDappData();
  const poolKeys: string[] = [];
  for (const [key] of data) {
    if (key.startsWith("pool:exists:") && data.get(key) === 1) {
      poolKeys.push(key.replace("pool:exists:", ""));
    }
  }

  const pools: Pool[] = [];
  const nameCache = new Map<string, { name: string; decimals: number }>();

  for (const pk of poolKeys) {
    const t0Id = data.get(`pool:t0:${pk}`) as string ?? "DCC";
    const t1Id = data.get(`pool:t1:${pk}`) as string ?? "?";
    const r0 = (data.get(`pool:r0:${pk}`) as number) ?? 0;
    const r1 = (data.get(`pool:r1:${pk}`) as number) ?? 0;
    const fee = (data.get(`pool:fee:${pk}`) as number) ?? 30;
    const swaps = (data.get(`pool:swaps:${pk}`) as number) ?? 0;
    const lpSupply = (data.get(`pool:lpSupply:${pk}`) as number) ?? 0;

    let t0Name = t0Id;
    if (t0Id !== "DCC") {
      if (!nameCache.has(t0Id)) nameCache.set(t0Id, await getAssetName(t0Id));
      t0Name = nameCache.get(t0Id)!.name;
    }
    const t0Decimals = t0Id === "DCC" ? 8 : (nameCache.get(t0Id)?.decimals ?? 8);

    let t1Name = t1Id;
    if (t1Id !== "DCC") {
      if (!nameCache.has(t1Id)) nameCache.set(t1Id, await getAssetName(t1Id));
      t1Name = nameCache.get(t1Id)!.name;
    }
    const t1Decimals = t1Id === "DCC" ? 8 : (nameCache.get(t1Id)?.decimals ?? 8);

    pools.push({
      poolKey: pk,
      token0: t0Id,
      token1: t1Id,
      token0Name: t0Name,
      token1Name: t1Name,
      reserve0: r0 / Math.pow(10, t0Decimals),
      reserve1: r1 / Math.pow(10, t1Decimals),
      tvl: 0,
      feeBps: fee,
      swapCount: swaps,
      lpSupply,
    });
  }
  return pools;
}

export async function getPool(poolKey: string): Promise<Pool> {
  const data = await getDappData();
  const t0Id = data.get(`pool:t0:${poolKey}`) as string ?? "DCC";
  const t1Id = data.get(`pool:t1:${poolKey}`) as string ?? "?";
  const r0 = (data.get(`pool:r0:${poolKey}`) as number) ?? 0;
  const r1 = (data.get(`pool:r1:${poolKey}`) as number) ?? 0;
  const fee = (data.get(`pool:fee:${poolKey}`) as number) ?? 30;
  const swaps = (data.get(`pool:swaps:${poolKey}`) as number) ?? 0;
  const lpSupply = (data.get(`pool:lpSupply:${poolKey}`) as number) ?? 0;

  const t0Info = t0Id !== "DCC" ? await getAssetName(t0Id) : { name: "DCC", decimals: 8 };
  const t1Info = t1Id !== "DCC" ? await getAssetName(t1Id) : { name: "DCC", decimals: 8 };

  return {
    poolKey,
    token0: t0Id,
    token1: t1Id,
    token0Name: t0Info.name,
    token1Name: t1Info.name,
    reserve0: r0 / Math.pow(10, t0Info.decimals),
    reserve1: r1 / Math.pow(10, t1Info.decimals),
    tvl: 0,
    feeBps: fee,
    swapCount: swaps,
    lpSupply,
  };
}

export async function getPoolPrice(
  poolKey: string
): Promise<{ price: number; [key: string]: unknown }> {
  const data = await getDappData();
  const r0 = (data.get(`pool:r0:${poolKey}`) as number) ?? 0;
  const r1 = (data.get(`pool:r1:${poolKey}`) as number) ?? 0;
  const price = r0 > 0 && r1 > 0 ? r1 / r0 : 0;
  return { price, reserve0: r0, reserve1: r1 };
}

export async function getPoolStats(poolKey: string): Promise<PoolStats> {
  const data = await getDappData();
  const vol0 = (data.get(`pool:volume0:${poolKey}`) as number) ?? 0;
  const vol1 = (data.get(`pool:volume1:${poolKey}`) as number) ?? 0;
  const fees0 = (data.get(`pool:fees0:${poolKey}`) as number) ?? 0;
  const fees1 = (data.get(`pool:fees1:${poolKey}`) as number) ?? 0;
  const swaps = (data.get(`pool:swaps:${poolKey}`) as number) ?? 0;
  return {
    volume24h: 0,
    volume7d: 0,
    fees24h: 0,
    apy: 0,
    totalVolume0: vol0 / 1e8,
    totalVolume1: vol1 / 1e8,
    totalFees0: fees0 / 1e8,
    totalFees1: fees1 / 1e8,
    totalSwaps: swaps,
  };
}

export async function listRecentSwaps(): Promise<SwapRecord[]> {
  // On-chain contract doesn't store individual swap history as queryable list
  // Return empty — swap events can be seen in blockchain transactions
  return [];
}

export async function getSwapsByAddress(
  address: string
): Promise<SwapRecord[]> {
  void address;
  return [];
}

export async function getSwapQuote(
  tokenIn: string,
  tokenOut: string,
  amount: number
): Promise<SwapQuote> {
  // Compute quote from on-chain reserves using constant-product formula
  const data = await getDappData();

  // Find matching pool
  let poolKey: string | null = null;
  for (const [key] of data) {
    if (!key.startsWith("pool:exists:")) continue;
    const pk = key.replace("pool:exists:", "");
    const t0 = data.get(`pool:t0:${pk}`) as string;
    const t1 = data.get(`pool:t1:${pk}`) as string;

    const t0Info = t0 !== "DCC" ? await getAssetName(t0) : { name: "DCC", decimals: 8 };
    const t1Info = t1 !== "DCC" ? await getAssetName(t1) : { name: "DCC", decimals: 8 };

    const matchesForward =
      (tokenIn === "DCC" || tokenIn === t0 || tokenIn.toUpperCase() === t0Info.name.toUpperCase()) &&
      (tokenOut === t1 || tokenOut === t1Info.name || tokenOut.toUpperCase() === t1Info.name.toUpperCase());
    const matchesReverse =
      (tokenOut === "DCC" || tokenOut === t0 || tokenOut.toUpperCase() === t0Info.name.toUpperCase()) &&
      (tokenIn === t1 || tokenIn === t1Info.name || tokenIn.toUpperCase() === t1Info.name.toUpperCase());

    if (matchesForward || matchesReverse) {
      poolKey = pk;
      break;
    }
  }

  if (!poolKey) {
    throw new Error(`No pool found for ${tokenIn}/${tokenOut}`);
  }

  const r0 = (data.get(`pool:r0:${poolKey}`) as number) ?? 0;
  const r1 = (data.get(`pool:r1:${poolKey}`) as number) ?? 0;
  const feeBps = (data.get(`pool:fee:${poolKey}`) as number) ?? 30;

  if (r0 === 0 || r1 === 0) {
    throw new Error(`Pool ${poolKey} has no liquidity`);
  }

  const t0 = data.get(`pool:t0:${poolKey}`) as string;
  const t1Id = data.get(`pool:t1:${poolKey}`) as string;
  const t0Info = t0 !== "DCC" ? await getAssetName(t0) : { name: "DCC", decimals: 8 };
  const t1Info = t1Id !== "DCC" ? await getAssetName(t1Id) : { name: "DCC", decimals: 8 };
  const isForward = tokenIn === "DCC" || tokenIn === t0 || tokenIn.toUpperCase() === t0Info.name.toUpperCase();

  const inReserve = isForward ? r0 : r1;
  const outReserve = isForward ? r1 : r0;
  const inDecimals = isForward ? t0Info.decimals : t1Info.decimals;
  const outDecimals = isForward ? t1Info.decimals : t0Info.decimals;

  const amountInRaw = amount * Math.pow(10, inDecimals);
  const feeAmount = amountInRaw * feeBps / 10000;
  const amountInAfterFee = amountInRaw - feeAmount;
  const amountOutRaw = (outReserve * amountInAfterFee) / (inReserve + amountInAfterFee);
  const outputAmount = amountOutRaw / Math.pow(10, outDecimals);
  const priceImpact = amountInAfterFee / (inReserve + amountInAfterFee);

  return {
    inputAmount: amount,
    outputAmount: parseFloat(outputAmount.toFixed(8)),
    priceImpact: parseFloat((priceImpact * 100).toFixed(4)),
    fee: parseFloat((feeAmount / Math.pow(10, inDecimals)).toFixed(8)),
    poolKey,
    feeBps,
  };
}

export async function getAddLiquidityEstimate(
  poolKey: string,
  amount0: number,
  amount1: number
): Promise<LiquidityEstimate> {
  const data = await getDappData();
  const r0 = (data.get(`pool:r0:${poolKey}`) as number) ?? 0;
  const r1 = (data.get(`pool:r1:${poolKey}`) as number) ?? 0;
  const lpSupply = (data.get(`pool:lpSupply:${poolKey}`) as number) ?? 0;
  return {
    amount0,
    amount1,
    estimatedLP: lpSupply > 0 ? Math.floor(Math.sqrt(amount0 * amount1)) : Math.floor(Math.sqrt(amount0 * 1e8 * amount1 * 1e8)) - 1000,
    currentReserve0: r0 / 1e8,
    currentReserve1: r1 / 1e8,
    currentLPSupply: lpSupply,
  };
}

export async function getRemoveLiquidityEstimate(
  poolKey: string,
  lpTokens: number
): Promise<LiquidityEstimate> {
  const data = await getDappData();
  const r0 = (data.get(`pool:r0:${poolKey}`) as number) ?? 0;
  const r1 = (data.get(`pool:r1:${poolKey}`) as number) ?? 0;
  const lpSupply = (data.get(`pool:lpSupply:${poolKey}`) as number) ?? 0;
  const share = lpSupply > 0 ? lpTokens / lpSupply : 0;
  return {
    lpTokens,
    share,
    estimatedAmount0: (r0 * share) / 1e8,
    estimatedAmount1: (r1 * share) / 1e8,
    currentLPSupply: lpSupply,
  };
}

export async function getUserPositions(
  address: string
): Promise<UserPosition[]> {
  const data = await getDappData();
  const positions: UserPosition[] = [];
  for (const [key, val] of data) {
    if (!key.startsWith("lp:") || key.endsWith(":LOCKED")) continue;
    // Format: lp:{poolKey}:{address}
    const parts = key.split(":");
    const addr = parts[parts.length - 1];
    if (addr !== address) continue;
    const poolKey = parts.slice(1, parts.length - 1).join(":");
    const lpTokens = val as number;
    const lpSupply = (data.get(`pool:lpSupply:${poolKey}`) as number) ?? 0;
    positions.push({
      poolKey,
      lpTokens,
      share: lpSupply > 0 ? lpTokens / lpSupply : 0,
    });
  }
  return positions;
}

export async function getUserTokenBalance(
  address: string,
  assetId: string
): Promise<{ balance: number; [key: string]: unknown }> {
  if (assetId === "DCC" || assetId === "") {
    const res = await nodeFetch<{ balance: number }>(
      `/addresses/balance/${encodeURIComponent(address)}`
    );
    return { balance: res.balance / 1e8 };
  }
  const res = await nodeFetch<{ balance: number }>(
    `/assets/balance/${encodeURIComponent(address)}/${encodeURIComponent(assetId)}`
  );
  return { balance: res.balance };
}

export async function getTokenInfo(assetId: string): Promise<TokenInfo> {
  const info = await nodeFetch<{ assetId: string; name: string; decimals: number; description: string }>(
    `/assets/details/${encodeURIComponent(assetId)}`
  );
  return {
    assetId: info.assetId,
    name: info.name,
    decimals: info.decimals,
  };
}

export async function getProtocolStatus(): Promise<ProtocolStatus> {
  const data = await getDappData();
  return {
    version: data.get("v") as number,
    admin: data.get("admin") as string,
    poolCount: data.get("poolCount") as number,
    defaultFeeBps: data.get("feeBpsDefault") as number,
    minLiquidity: data.get("minLiquidity") as number,
    dApp: AMM_DAPP,
  };
}
