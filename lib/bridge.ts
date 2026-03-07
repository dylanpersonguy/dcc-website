const BRIDGE_URL = "https://bridge.decentralchain.io";

async function bridgeFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BRIDGE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Bridge API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface BridgeHealth {
  status: string;
  [key: string]: unknown;
}

export interface BridgeLimits {
  minDeposit: number;
  maxDeposit: number;
  [key: string]: unknown;
}

export interface BridgeFees {
  [key: string]: unknown;
}

export interface BridgeQuote {
  inputAmount: number;
  outputAmount: number;
  fee: number;
  [key: string]: unknown;
}

export interface BridgeOrder {
  id: string;
  status: string;
  [key: string]: unknown;
}

export interface BridgeStats {
  [key: string]: unknown;
}

export async function getBridgeHealth(): Promise<BridgeHealth> {
  return bridgeFetch<BridgeHealth>("/health");
}

export async function getBridgeLimits(): Promise<BridgeLimits> {
  return bridgeFetch<BridgeLimits>("/deposit/limits");
}

export async function getBridgeFees(): Promise<BridgeFees> {
  return bridgeFetch<BridgeFees>("/fees");
}

export async function getBridgeQuote(
  amount: number,
  token: string = "SOL"
): Promise<BridgeQuote> {
  return bridgeFetch<BridgeQuote>(
    `/fees/quote?amount=${amount}&token=${encodeURIComponent(token)}`
  );
}

export async function getBridgeOrderHistory(
  dccAddress: string
): Promise<BridgeOrder[]> {
  return bridgeFetch<BridgeOrder[]>(
    `/history/${encodeURIComponent(dccAddress)}`
  );
}

export async function getBridgeOrderById(id: string): Promise<BridgeOrder> {
  return bridgeFetch<BridgeOrder>(`/${encodeURIComponent(id)}`);
}

export async function getBridgeStats(): Promise<BridgeStats> {
  return bridgeFetch<BridgeStats>("/stats");
}
