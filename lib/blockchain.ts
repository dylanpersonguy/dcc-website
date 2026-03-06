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
