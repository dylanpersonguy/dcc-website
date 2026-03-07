const NODE_URL = "https://mainnet-node.decentralchain.io";

export interface BlockHeader {
  height: number;
  timestamp: number;
  transactionCount: number;
  generator: string;
  id: string;
  blocksize: number;
  totalFee: number;
  version: number;
}

export interface BlockchainData {
  height: number;
  lastBlock: BlockHeader | null;
  txPerBlock: number;
  connectedPeers: number;
}

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${NODE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Node API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getBlockHeight(): Promise<number> {
  const data = await fetchJSON<{ height: number }>("/blocks/height");
  return data.height;
}

/** Quick health check — returns true if the node responds */
export async function checkNodeHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${NODE_URL}/blocks/height`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getLastBlockHeader(): Promise<BlockHeader> {
  const raw = await fetchJSON<Record<string, unknown>>("/blocks/headers/last");
  return {
    height: raw.height as number,
    timestamp: raw.timestamp as number,
    transactionCount: raw.transactionCount as number,
    generator: raw.generator as string,
    id: raw.id as string,
    blocksize: raw.blocksize as number,
    totalFee: raw.totalFee as number,
    version: raw.version as number,
  };
}

export async function getConnectedPeers(): Promise<number> {
  const data = await fetchJSON<{ peers: unknown[] }>("/peers/connected");
  return data.peers.length;
}

export async function getBlockchainData(): Promise<BlockchainData> {
  const [header, peers] = await Promise.all([
    getLastBlockHeader(),
    getConnectedPeers().catch(() => 0),
  ]);

  return {
    height: header.height,
    lastBlock: header,
    txPerBlock: header.transactionCount,
    connectedPeers: peers,
  };
}

// ——— Terminal-specific endpoints ———

export interface AddressBalance {
  address: string;
  regular: number;
  available: number;
  effective: number;
  generating: number;
}

export async function getAddressBalance(
  address: string
): Promise<AddressBalance> {
  const data = await fetchJSON<Record<string, unknown>>(
    `/addresses/balance/details/${encodeURIComponent(address)}`
  );
  return {
    address: data.address as string,
    regular: (data.regular as number) / 1e8,
    available: (data.available as number) / 1e8,
    effective: (data.effective as number) / 1e8,
    generating: (data.generating as number) / 1e8,
  };
}

export async function getBlockAtHeight(
  height: number
): Promise<BlockHeader> {
  const raw = await fetchJSON<Record<string, unknown>>(
    `/blocks/headers/at/${height}`
  );
  return {
    height: raw.height as number,
    timestamp: raw.timestamp as number,
    transactionCount: raw.transactionCount as number,
    generator: raw.generator as string,
    id: raw.id as string,
    blocksize: raw.blocksize as number,
    totalFee: raw.totalFee as number,
    version: raw.version as number,
  };
}

export interface BlockTransaction {
  id: string;
  type: number;
  sender: string;
  senderPublicKey: string;
  fee: number;
  feeAssetId: string | null;
  timestamp: number;
  version: number;
  recipient?: string;
  amount?: number;
  assetId?: string | null;
  attachment?: string;
  proofs?: string[];
  [key: string]: unknown;
}

export interface FullBlock extends BlockHeader {
  transactions: BlockTransaction[];
}

export async function getFullBlockAtHeight(height: number): Promise<FullBlock> {
  const raw = await fetchJSON<Record<string, unknown>>(`/blocks/at/${height}`);
  const txs = (raw.transactions as Record<string, unknown>[]) || [];
  return {
    height: raw.height as number,
    timestamp: raw.timestamp as number,
    transactionCount: raw.transactionCount as number,
    generator: raw.generator as string,
    id: raw.id as string,
    blocksize: raw.blocksize as number,
    totalFee: raw.totalFee as number,
    version: raw.version as number,
    transactions: txs.map((tx) => ({
      id: tx.id as string,
      type: tx.type as number,
      sender: tx.sender as string,
      senderPublicKey: (tx.senderPublicKey as string) || "",
      fee: tx.fee as number,
      feeAssetId: (tx.feeAssetId as string | null) ?? null,
      timestamp: tx.timestamp as number,
      version: tx.version as number,
      recipient: tx.recipient as string | undefined,
      amount: tx.amount as number | undefined,
      assetId: tx.assetId as string | null | undefined,
      attachment: tx.attachment as string | undefined,
      proofs: tx.proofs as string[] | undefined,
    })),
  };
}

export async function getTransactionById(
  txId: string
): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(
    `/transactions/info/${encodeURIComponent(txId)}`
  );
}

export interface AssetBalance {
  assetId: string;
  balance: number;
  issueTransaction?: {
    name: string;
    description: string;
    decimals: number;
  } | null;
}

export async function getAssetBalances(
  address: string
): Promise<AssetBalance[]> {
  const data = await fetchJSON<{ balances: AssetBalance[] }>(
    `/assets/balance/${encodeURIComponent(address)}`
  );
  const balances = data.balances ?? [];

  // Resolve names for tokens missing issueTransaction
  const missing = balances.filter(b => !b.issueTransaction?.name);
  if (missing.length > 0) {
    const details = await Promise.allSettled(
      missing.map(b =>
        fetchJSON<{ assetId: string; name?: string; description?: string; decimals?: number }>(
          `/assets/details/${encodeURIComponent(b.assetId)}`
        )
      )
    );
    const detailMap = new Map<string, { name: string; description: string; decimals: number }>();
    for (const r of details) {
      if (r.status === "fulfilled" && r.value.name) {
        detailMap.set(r.value.assetId, {
          name: r.value.name,
          description: r.value.description ?? "",
          decimals: r.value.decimals ?? 0,
        });
      }
    }
    for (const b of balances) {
      if (!b.issueTransaction?.name) {
        const d = detailMap.get(b.assetId);
        if (d) b.issueTransaction = d;
      }
    }
  }

  return balances;
}

export async function getNodeVersion(): Promise<string> {
  const data = await fetchJSON<{ version: string }>("/node/version");
  return data.version;
}

export async function getPeersList(): Promise<
  Array<{ address: string; declaredAddress: string }>
> {
  const data = await fetchJSON<{
    peers: Array<{ address: string; declaredAddress: string }>;
  }>("/peers/connected");
  return data.peers;
}

/**
 * Fetch recent transactions for an address (last N txs from the node).
 */
export async function getAddressTransactions(
  address: string,
  limit = 50,
): Promise<Array<Record<string, unknown>>> {
  const data = await fetchJSON<Array<Record<string, unknown>>>(
    `/transactions/address/${encodeURIComponent(address)}/limit/${Math.min(limit, 100)}`
  );
  // The endpoint returns an array wrapping an array
  return Array.isArray(data[0]) ? (data[0] as Array<Record<string, unknown>>) : (Array.isArray(data) ? data : []);
}

/**
 * Fetch active leases for an address.
 */
export async function getActiveLeases(
  address: string,
): Promise<Array<Record<string, unknown>>> {
  const data = await fetchJSON<Array<Record<string, unknown>>>(
    `/leasing/active/${encodeURIComponent(address)}`
  );
  return Array.isArray(data) ? data : [];
}

/**
 * Get generating balance (minimum balance over last 1000 blocks).
 */
export async function getGeneratingBalance(
  address: string,
): Promise<number> {
  const data = await fetchJSON<{ address: string; balance: number }>(
    `/addresses/effectiveBalance/${encodeURIComponent(address)}`
  );
  return data.balance / 1e8;
}

/**
 * Read data entries from a dApp (smart contract) address.
 */
export async function getAddressData(
  address: string,
): Promise<Array<{ key: string; type: string; value: string | number | boolean }>> {
  return fetchJSON<Array<{ key: string; type: string; value: string | number | boolean }>>(
    `/addresses/data/${encodeURIComponent(address)}`
  );
}

/**
 * Get script info for an address (whether it has a script, complexity, etc.).
 */
export async function getScriptInfo(
  address: string,
): Promise<Record<string, unknown>> {
  return fetchJSON<Record<string, unknown>>(
    `/addresses/scriptInfo/${encodeURIComponent(address)}`
  );
}

/**
 * Fetch NFTs owned by an address (1-of-1 non-reissuable tokens).
 */
export async function getNFTs(
  address: string,
  limit = 100,
): Promise<Array<Record<string, unknown>>> {
  try {
    const data = await fetchJSON<Array<Record<string, unknown>>>(
      `/assets/nft/${encodeURIComponent(address)}/limit/${Math.min(limit, 1000)}`
    );
    return Array.isArray(data) ? data : [];
  } catch {
    // Fallback: filter asset balances for NFT-like tokens
    const assets = await getAssetBalances(address);
    return assets
      .filter(a => a.balance === 1 && a.issueTransaction?.decimals === 0)
      .map(a => ({ assetId: a.assetId, name: a.issueTransaction?.name, description: a.issueTransaction?.description }));
  }
}
