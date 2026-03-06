import {
  getBlockHeight,
  getLastBlockHeader,
  getBlockAtHeight,
  getConnectedPeers,
  getAddressBalance,
  getTransactionById,
  getNodeVersion,
  getPeersList,
  getBlockchainData,
} from "./blockchain";

export interface TerminalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: Record<string, unknown>;
  type?: "text" | "block" | "balance" | "transaction" | "network" | "peers" | "error";
  timestamp: number;
}

interface CommandMatch {
  handler: () => Promise<{ content: string; data?: Record<string, unknown>; type: TerminalMessage["type"] }>;
}

function extractAddress(input: string): string | null {
  const match = input.match(/\b(3[A-Za-z0-9]{34})\b/);
  return match ? match[1] : null;
}

function extractBlockHeight(input: string): number | null {
  const match = input.match(/\b(?:block\s*#?\s*|height\s*#?\s*|at\s+)(\d{1,10})\b/i);
  if (match) return parseInt(match[1], 10);
  const numMatch = input.match(/\b(\d{4,10})\b/);
  return numMatch ? parseInt(numMatch[1], 10) : null;
}

function extractTxId(input: string): string | null {
  const match = input.match(/\b([A-Za-z0-9]{43,44})\b/);
  return match ? match[1] : null;
}

function matchCommand(input: string): CommandMatch | null {
  const lower = input.toLowerCase().trim();

  // Block height
  if (
    /\b(block\s*height|current\s*height|how\s*(tall|high)|chain\s*height|latest\s*height|what.*height)\b/.test(lower) ||
    (lower.includes("height") && !lower.includes("block #"))
  ) {
    return {
      handler: async () => {
        const height = await getBlockHeight();
        return {
          content: `The current block height is **${height.toLocaleString()}**.`,
          data: { height },
          type: "text",
        };
      },
    };
  }

  // Latest / last block
  if (/\b(latest|last|newest|recent|current)\s*(block|header)\b/.test(lower) || lower === "latest block") {
    return {
      handler: async () => {
        const block = await getLastBlockHeader();
        return {
          content: `Here's the latest block:`,
          data: {
            height: block.height,
            id: block.id,
            transactions: block.transactionCount,
            generator: block.generator,
            size: `${(block.blocksize / 1024).toFixed(1)} KB`,
            timestamp: new Date(block.timestamp).toLocaleString(),
            totalFee: (block.totalFee / 1e8).toFixed(8) + " DCC",
          },
          type: "block",
        };
      },
    };
  }

  // Look up specific block by number
  const blockNum = extractBlockHeight(input);
  if (
    blockNum !== null &&
    /\b(block|show|get|lookup|look\s*up|find|fetch|info)\b/.test(lower)
  ) {
    return {
      handler: async () => {
        const block = await getBlockAtHeight(blockNum);
        return {
          content: `Block **#${blockNum.toLocaleString()}**:`,
          data: {
            height: block.height,
            id: block.id,
            transactions: block.transactionCount,
            generator: block.generator,
            size: `${(block.blocksize / 1024).toFixed(1)} KB`,
            timestamp: new Date(block.timestamp).toLocaleString(),
            totalFee: (block.totalFee / 1e8).toFixed(8) + " DCC",
          },
          type: "block",
        };
      },
    };
  }

  // Address balance
  const address = extractAddress(input);
  if (address) {
    return {
      handler: async () => {
        const bal = await getAddressBalance(address);
        return {
          content: `Balance for \`${address}\`:`,
          data: {
            address: bal.address,
            available: bal.available.toFixed(8) + " DCC",
            regular: bal.regular.toFixed(8) + " DCC",
            effective: bal.effective.toFixed(8) + " DCC",
            generating: bal.generating.toFixed(8) + " DCC",
          },
          type: "balance",
        };
      },
    };
  }

  // Transaction lookup
  const txId = extractTxId(input);
  if (txId && /\b(tx|transaction|transfer|lookup|look\s*up|find|show|get|info)\b/.test(lower)) {
    return {
      handler: async () => {
        const tx = await getTransactionById(txId);
        return {
          content: `Transaction details:`,
          data: {
            id: tx.id as string,
            type: tx.type as number,
            sender: tx.sender as string,
            fee: ((tx.fee as number) / 1e8).toFixed(8) + " DCC",
            timestamp: new Date(tx.timestamp as number).toLocaleString(),
            ...(tx.recipient ? { recipient: tx.recipient as string } : {}),
            ...(tx.amount ? { amount: ((tx.amount as number) / 1e8).toFixed(8) + " DCC" } : {}),
          },
          type: "transaction",
        };
      },
    };
  }

  // Network status / overview
  if (/\b(network|status|overview|stats|summary|how.*network|chain\s*status)\b/.test(lower)) {
    return {
      handler: async () => {
        const [data, version] = await Promise.all([
          getBlockchainData(),
          getNodeVersion().catch(() => "unknown"),
        ]);
        return {
          content: `Network overview:`,
          data: {
            blockHeight: data.height.toLocaleString(),
            txInLastBlock: data.txPerBlock,
            connectedPeers: data.connectedPeers,
            lastBlockTime: data.lastBlock
              ? new Date(data.lastBlock.timestamp).toLocaleString()
              : "N/A",
            nodeVersion: version,
          },
          type: "network",
        };
      },
    };
  }

  // Peers
  if (/\b(peers|nodes|connected|validators)\b/.test(lower)) {
    return {
      handler: async () => {
        const peers = await getPeersList();
        return {
          content: `**${peers.length}** peers connected to the network.`,
          data: {
            count: peers.length,
            peers: peers.slice(0, 10).map((p) => p.address),
          },
          type: "peers",
        };
      },
    };
  }

  // Node version
  if (/\b(version|node\s*version|software|client)\b/.test(lower)) {
    return {
      handler: async () => {
        const version = await getNodeVersion();
        return {
          content: `Node software version: **${version}**`,
          type: "text",
        };
      },
    };
  }

  // Help
  if (/\b(help|commands|what can|how to|guide|tutorial)\b/.test(lower)) {
    return {
      handler: async () => ({
        content: `Here's what I can do:\n\n` +
          `• **"What's the block height?"** — Current chain height\n` +
          `• **"Show latest block"** — Latest block details\n` +
          `• **"Show block #1000"** — Look up a specific block\n` +
          `• **"Balance of 3P..."** — Check an address balance\n` +
          `• **"Network status"** — Network overview & stats\n` +
          `• **"Show peers"** — Connected peer nodes\n` +
          `• **"Node version"** — Node software version\n` +
          `• **"Look up tx [id]"** — Transaction details`,
        type: "text",
      }),
    };
  }

  return null;
}

export async function processCommand(
  input: string
): Promise<Omit<TerminalMessage, "id" | "role" | "timestamp">> {
  const command = matchCommand(input);

  if (!command) {
    return {
      content:
        `I'm not sure what you're asking. Try something like:\n\n` +
        `• "What's the current block height?"\n` +
        `• "Show me the latest block"\n` +
        `• "Network status"\n` +
        `• "Balance of 3P..."\n\n` +
        `Type **"help"** for a full list of commands.`,
      type: "text",
    };
  }

  try {
    return await command.handler();
  } catch (err) {
    return {
      content: `Error: ${err instanceof Error ? err.message : "Something went wrong. Please try again."}`,
      type: "error",
    };
  }
}
