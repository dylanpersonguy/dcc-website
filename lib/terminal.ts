import {
  getBlockHeight,
  getLastBlockHeader,
  getBlockAtHeight,
  getFullBlockAtHeight,
  getConnectedPeers,
  getAddressBalance,
  getAssetBalances,
  getTransactionById,
  getNodeVersion,
  getPeersList,
  getBlockchainData,
  getAddressTransactions,
  getActiveLeases,
  getGeneratingBalance,
  getAddressData,
  getScriptInfo,
  getNFTs,
  type BlockTransaction,
} from "./blockchain";
import {
  getBridgeHealth,
  getBridgeLimits,
  getBridgeFees,
  getBridgeQuote,
  getBridgeOrderHistory,
  getBridgeOrderById,
  getBridgeStats,
} from "./bridge";
import {
  getAmmHealth,
  listPools,
  getPool,
  getPoolPrice,
  getPoolStats,
  listRecentSwaps,
  getSwapsByAddress,
  getSwapQuote,
  getUserPositions,
  getUserTokenBalance,
  getTokenInfo,
  getProtocolStatus,
} from "./amm";
import {
  executeSwap,
  addLiquidity,
  removeLiquidity,
  createPool,
  sendTransfer,
  createToken,
  mintToken,
  burnToken,
  startLease,
  stopLease,
  type TxResult,
} from "./wallet";
import {
  parseAutomation,
  createAutomation,
  getActiveAutomations,
  loadAutomations,
  cancelAutomation,
  pauseAutomation,
  resumeAutomation,
  deleteAutomation,
  formatAutomationType,
  formatNextRun,
} from "./automations";
import { buildContext, resolveReferences, type ConversationContext } from "./chat-memory";
import { loadAddressBook, addContact, removeContact, resolveContactName } from "./address-book";
import { loadWatchlist, addToWatchlist, removeFromWatchlist, type WatchlistItem } from "./watchlist";
import { loadMacros, saveMacro, deleteMacro, getMacro } from "./macros";
import {
  getProtocolSnapshot,
  getLiveExchangeRate,
  getValidators,
  getStakingUser,
  getStakingHealth,
  estimateDeposit,
  estimateWithdraw,
  getUserDeposits,
  getUserWithdrawals,
  getPendingWithdrawals,
  getRewardHistory,
  getTopUsers,
  getSnapshotHistory,
  getLiveProtocol,
  type ProtocolSnapshot,
  type StakingValidator,
  type StakingUser,
} from "./staking";
import { stakeDCC } from "./wallet";

export interface TerminalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: Record<string, unknown>;
  type?: "text" | "block" | "block-txs" | "balance" | "transaction" | "network" | "peers" | "bridge" | "pool" | "swap" | "automation" | "error";
  timestamp: number;
}

interface CommandMatch {
  handler: () => Promise<{ content: string; data?: Record<string, unknown>; type: TerminalMessage["type"] }>;
}

interface WalletInfo {
  isConnected: boolean;
  address?: string;
  seed?: string | null;
}

export interface TerminalOptions {
  autoSign?: boolean;
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

function extractAmount(input: string): number | null {
  const match = input.match(/\b(\d+(?:\.\d+)?)\s*(?:sol|usdc|usdt|dcc|tokens?)?\b/i);
  return match ? parseFloat(match[1]) : null;
}

function extractToken(input: string): string {
  if (/\busdc\b/i.test(input)) return "USDC";
  if (/\busdt\b/i.test(input)) return "USDT";
  if (/\bsol\b/i.test(input)) return "SOL";
  if (/\bdcc\b/i.test(input)) return "DCC";
  return "SOL";
}

function extractPoolKey(input: string): string | null {
  const match = input.match(/\b([A-Za-z0-9]+_[A-Za-z0-9]+)\b/);
  return match ? match[1] : null;
}

function extractAssetId(input: string): string | null {
  const match = input.match(/\b([A-HJ-NP-Za-km-z1-9]{32,44})\b/);
  return match ? match[1] : null;
}

/** Words to ignore when extracting token names from swap commands */
const SWAP_STOP_WORDS = new Set([
  "swap", "trade", "exchange", "execute", "confirm", "send", "do", "perform",
  "quote", "estimate", "preview", "calculate", "price",
  "how", "much", "the", "a", "an", "of", "with", "from", "my",
  "tokens", "token", "coins", "coin",
]);

/**
 * Extract token pair from swap-like commands.
 * Matches patterns like:
 *   "swap 100 DCC to USDT"
 *   "swap 1 MyToken for Raybean"
 *   "trade 50 USDC into SOL"
 *   "exchange MyToken to Raybean"
 * Returns [tokenIn, tokenOut] uppercased, or null if not found.
 */
function extractSwapTokens(input: string): [string, string] | null {
  // Pattern 1: "X TokenA to/for/into TokenB" — most common
  const pairMatch = input.match(
    /\b([A-Za-z][A-Za-z0-9]{0,20})\s+(?:to|for|into|→|->)\s+([A-Za-z][A-Za-z0-9]{0,20})\b/i
  );
  if (pairMatch) {
    const a = pairMatch[1];
    const b = pairMatch[2];
    if (!SWAP_STOP_WORDS.has(a.toLowerCase()) && !SWAP_STOP_WORDS.has(b.toLowerCase())) {
      return [a.toUpperCase(), b.toUpperCase()];
    }
  }

  // Pattern 2: number before tokenA — "swap 100 DCC to USDT"
  const numPairMatch = input.match(
    /\b\d+(?:\.\d+)?\s+([A-Za-z][A-Za-z0-9]{0,20})\s+(?:to|for|into|→|->)\s+([A-Za-z][A-Za-z0-9]{0,20})\b/i
  );
  if (numPairMatch) {
    return [numPairMatch[1].toUpperCase(), numPairMatch[2].toUpperCase()];
  }

  // Pattern 3: slash pair — "swap DCC/USDT"
  const slashMatch = input.match(/\b([A-Za-z][A-Za-z0-9]{0,20})\s*[\/]\s*([A-Za-z][A-Za-z0-9]{0,20})\b/);
  if (slashMatch) {
    return [slashMatch[1].toUpperCase(), slashMatch[2].toUpperCase()];
  }

  // Fallback: find all capitalized/token-like words that aren't stop words
  const words = input.match(/\b[A-Za-z][A-Za-z0-9]{0,20}\b/g) ?? [];
  const candidates = words.filter(w => !SWAP_STOP_WORDS.has(w.toLowerCase()) && !/^\d+$/.test(w));
  if (candidates.length >= 2) {
    return [candidates[0].toUpperCase(), candidates[1].toUpperCase()];
  }

  return null;
}

/**
 * Resolve a token ticker/name (e.g. "USDC", "Solana") to its on-chain asset ID and decimals.
 * Returns {assetId: null, decimals: 8} for the native DCC token. Throws if unresolvable.
 */
async function resolveToken(
  name: string,
  walletAddress?: string,
): Promise<{ assetId: string | null; decimals: number }> {
  const upper = name.toUpperCase();
  if (upper === "DCC") return { assetId: null, decimals: 8 };

  // 1) Check user's wallet balances for a matching token name
  if (walletAddress) {
    const balances = await getAssetBalances(walletAddress);
    for (const b of balances) {
      const tokenName = b.issueTransaction?.name;
      if (tokenName && tokenName.toUpperCase() === upper) {
        return { assetId: b.assetId, decimals: b.issueTransaction?.decimals ?? 8 };
      }
    }
    // Also try partial / contains match (e.g. "Solana" matching "Solana")
    for (const b of balances) {
      const tokenName = b.issueTransaction?.name;
      if (
        tokenName &&
        (tokenName.toUpperCase().includes(upper) ||
          upper.includes(tokenName.toUpperCase()))
      ) {
        return { assetId: b.assetId, decimals: b.issueTransaction?.decimals ?? 8 };
      }
    }
  }

  // 2) Check existing AMM pools for token name → asset ID mapping
  try {
    const pools = await listPools();
    for (const p of pools) {
      if (p.token0Name.toUpperCase() === upper) {
        // Fetch decimals for this asset
        try {
          const info = await getTokenInfo(p.token0);
          return { assetId: p.token0, decimals: info.decimals };
        } catch {
          return { assetId: p.token0, decimals: 8 };
        }
      }
      if (p.token1Name.toUpperCase() === upper) {
        try {
          const info = await getTokenInfo(p.token1);
          return { assetId: p.token1, decimals: info.decimals };
        } catch {
          return { assetId: p.token1, decimals: 8 };
        }
      }
    }
  } catch {
    // pool lookup failed, continue
  }

  // 3) If the name is already a valid base58 asset ID (32-44 chars), look up decimals
  if (/^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(name)) {
    try {
      const info = await getTokenInfo(name);
      return { assetId: name, decimals: info.decimals };
    } catch {
      return { assetId: name, decimals: 8 };
    }
  }

  throw new Error(
    `Could not resolve token "${name}" to an asset ID. Make sure you hold this token in your wallet.`,
  );
}

function extractOrderId(input: string): string | null {
  const match = input.match(/\border(?:er)?\s*(?:id\s*)?[:#]?\s*([a-zA-Z0-9-]{8,})\b/i);
  return match ? match[1] : null;
}

interface TokenParams {
  name: string | null;
  quantity: number | null;
  decimals: number | null;
  description: string | null;
  reissuable: boolean | null;
}

/**
 * Parse token creation parameters from natural language.
 * Handles forms like:
 *   "create a token called MyToken with 1000000 supply and 8 decimals"
 *   "issue coin TestCoin 500 supply 2 decimals non-reissuable"
 *   "make a new token GameGold 5000 supply described as In-game currency"
 */
function parseTokenParams(input: string): TokenParams {
  const result: TokenParams = {
    name: null,
    quantity: null,
    decimals: null,
    description: null,
    reissuable: null,
  };

  // Name — "called X", "named X",  or token/coin followed by a capitalized word
  const calledMatch = input.match(/\b(?:called|named|name)\s+["']?([A-Za-z][A-Za-z0-9_-]{2,15})["']?/i);
  if (calledMatch) {
    result.name = calledMatch[1];
  } else {
    // Look for a capitalized token name after create/issue/make ... token/coin
    const nameMatch = input.match(/\b(?:create|issue|make|launch|deploy|new|generate)\s+(?:a\s+)?(?:new\s+)?(?:token|coin|asset|nft|currency)\s+["']?([A-Z][A-Za-z0-9_-]{2,15})["']?/i);
    if (nameMatch) {
      result.name = nameMatch[1];
    } else {
      // "token MyToken" pattern
      const tokenNameMatch = input.match(/\b(?:token|coin|asset)\s+["']?([A-Z][A-Za-z0-9_-]{2,15})["']?/i);
      if (tokenNameMatch && !/^(info|details|metadata|status|balance|create|issue)$/i.test(tokenNameMatch[1])) {
        result.name = tokenNameMatch[1];
      }
    }
  }

  // Supply/quantity — "1000000 supply", "supply of 1000000", "quantity 5000"
  const supplyMatch = input.match(/\b(\d[\d,]*(?:\.\d+)?)\s*(?:supply|total|quantity|tokens?|coins?)\b/i) ||
                      input.match(/\b(?:supply|quantity|total)\s*(?:of\s*)?(\d[\d,]*(?:\.\d+)?)\b/i);
  if (supplyMatch) {
    result.quantity = parseFloat(supplyMatch[1].replace(/,/g, ""));
  } else if (result.name) {
    // Check for a number right after the name
    const afterNameMatch = input.match(new RegExp(result.name + "\\s+(\\d[\\d,]*(?:\\.\\d+)?)", "i"));
    if (afterNameMatch) {
      result.quantity = parseFloat(afterNameMatch[1].replace(/,/g, ""));
    }
  }

  // Decimals — "8 decimals", "decimals 2", "0 decimal places"
  const decMatch = input.match(/\b(\d)\s*(?:decimal|decimals|decimal\s*places?)\b/i) ||
                   input.match(/\b(?:decimals?)\s*(?:of\s*)?(\d)\b/i);
  if (decMatch) {
    result.decimals = parseInt(decMatch[1], 10);
  }

  // Description — "described as ...", "description: ...", "desc ..."
  const descMatch = input.match(/\b(?:descri(?:bed|ption)\s*(?:as|[=:])\s*)["']?(.+?)["']?$/i) ||
                    input.match(/\b(?:desc)\s+["']?(.+?)["']?$/i);
  if (descMatch) {
    result.description = descMatch[1].trim();
  }

  // Reissuable — "non-reissuable", "not reissuable", "fixed supply"
  if (/\b(non[- ]?reissuable|not\s+reissuable|fixed\s+supply|no\s+(?:more\s+)?mint|can'?t\s+mint)\b/i.test(input)) {
    result.reissuable = false;
  } else if (/\b(reissuable|mintable|can\s+mint)\b/i.test(input)) {
    result.reissuable = true;
  }

  return result;
}

function formatObj(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object" && !Array.isArray(v)) continue;
    out[k] = v;
  }
  return out;
}

const TX_TYPE_NAMES: Record<number, string> = {
  1: "Genesis",
  2: "Payment",
  3: "Issue",
  4: "Transfer",
  5: "Reissue",
  6: "Burn",
  7: "Exchange",
  8: "Lease",
  9: "Lease Cancel",
  10: "Alias",
  11: "Mass Transfer",
  12: "Data",
  13: "Set Script",
  14: "Sponsorship",
  15: "Set Asset Script",
  16: "Invoke Script",
  17: "Update Asset Info",
};

function formatTxSummary(tx: BlockTransaction): Record<string, string> {
  const typeName = TX_TYPE_NAMES[tx.type] || `Type ${tx.type}`;
  const summary: Record<string, string> = {
    id: tx.id,
    type: typeName,
    sender: tx.sender,
    fee: (tx.fee / 1e8).toFixed(8) + " DCC",
    time: new Date(tx.timestamp).toLocaleTimeString(),
  };
  if (tx.recipient) summary.recipient = tx.recipient;
  if (tx.amount != null) summary.amount = (tx.amount / 1e8).toFixed(8) + " DCC";
  return summary;
}

// ─── Multi-language phrase map → normalized English ───
const multiLangPhrases: [RegExp, string][] = [
  // Spanish
  [/\baltura\s*del?\s*bloque\b/i, "block height"],
  [/\búltimo\s*bloque\b/i, "latest block"],
  [/\bestado\s*de\s*la?\s*red\b/i, "network status"],
  [/\bsaldo|balance\b/i, "balance"],
  [/\benviar\b/i, "send"],
  [/\bintercambiar|intercambio\b/i, "swap"],
  [/\bpiscinas?\s*de?\s*liquidez\b/i, "list pools"],
  [/\bcotizaci[oó]n\b/i, "swap quote"],
  [/\bportafolio|cartera\b/i, "portfolio"],
  [/\bmis\s*transacciones\b/i, "my transactions"],
  [/\bmis\s*contactos\b/i, "my contacts"],
  [/\bayuda\b/i, "help"],
  [/\bcrear\s*token\b/i, "create token"],
  [/\bgobernanza\b/i, "governance"],
  [/\barrendamiento|arrend/i, "lease"],
  [/\bexportar\b/i, "export"],
  [/\bdescubrir\s*tokens?\b/i, "discover tokens"],
  [/\bestrategia\b/i, "strategy"],
  [/\bstaking\s*líquido|apostar|apuesta\b/i, "staking"],
  [/\bdesapostar|retirar\s*staking\b/i, "unstake"],
  [/\bvalidadores?\b/i, "validators"],
  // Chinese
  [/区块高度/i, "block height"],
  [/最新区块/i, "latest block"],
  [/网络状态/i, "network status"],
  [/余额|资产/i, "balance"],
  [/发送|转账/i, "send"],
  [/交换|兑换/i, "swap"],
  [/流动性池/i, "list pools"],
  [/报价/i, "swap quote"],
  [/投资组合/i, "portfolio"],
  [/交易历史|我的交易/i, "my transactions"],
  [/联系人/i, "my contacts"],
  [/帮助/i, "help"],
  [/创建代币/i, "create token"],
  [/治理/i, "governance"],
  [/租赁/i, "lease"],
  [/导出/i, "export"],
  [/发现代币/i, "discover tokens"],
  [/策略/i, "strategy"],
  [/质押|流动质押/i, "staking"],
  [/取消质押/i, "unstake"],
  [/验证者/i, "validators"],
];

function normalizeMultiLang(text: string): string {
  let result = text;
  for (const [pattern, replacement] of multiLangPhrases) {
    if (pattern.test(result)) {
      result = result.replace(pattern, replacement);
    }
  }
  return result;
}

function matchCommand(input: string, wallet?: WalletInfo, options?: TerminalOptions): CommandMatch | null {
  const lower = normalizeMultiLang(input).toLowerCase().trim();
  const wantsTxs = /\b(transaction|tx|txs|transfers?|detail|details|detailed|list.*tx|list.*transaction|show.*tx|show.*transaction|all.*tx|all.*transaction)\b/.test(lower);

  // ═══════════════════════════════════════════
  // BLOCKCHAIN COMMANDS
  // ═══════════════════════════════════════════

  // Block height
  if (
    /\b(block\s*height|current\s*height|how\s*(tall|high)|chain\s*height|latest\s*height|what.*height|how\s*many\s*blocks|total\s*blocks|block\s*count|chain\s*length)\b/.test(lower) ||
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

  // Latest / last block (optionally with transactions)
  if (/\b(latest|last|newest|recent|current|top|head)\s*(block|header)\b/.test(lower) ||
      /\bshow\s*(me\s*)?(the\s*)?(latest|last|new(est)?)\s*block\b/.test(lower) ||
      lower === "latest block" || lower === "last block") {
    return {
      handler: async () => {
        if (wantsTxs) {
          const height = await getBlockHeight();
          const block = await getFullBlockAtHeight(height);
          return {
            content: `Latest block **#${height.toLocaleString()}** — **${block.transactions.length}** transaction(s):`,
            data: {
              blockHeight: block.height,
              blockId: block.id,
              generator: block.generator,
              timestamp: new Date(block.timestamp).toLocaleString(),
              totalFee: (block.totalFee / 1e8).toFixed(8) + " DCC",
              transactions: block.transactions.map((tx) => formatTxSummary(tx)),
            },
            type: "block-txs",
          };
        }
        const block = await getLastBlockHeader();
        return {
          content: `Here's the latest block:`,
          data: {
            height: block.height,
            id: block.id,
            transactionCount: block.transactionCount,
            generator: block.generator,
            blocksize: block.blocksize,
            timestamp: new Date(block.timestamp).toLocaleString(),
            totalFee: (block.totalFee / 1e8).toFixed(8) + " DCC",
          },
          type: "block",
        };
      },
    };
  }

  // Look up specific block by number — detect if user wants transactions too
  const blockNum = extractBlockHeight(input);
  if (
    blockNum !== null &&
    (/\b(block|show|get|lookup|look\s*up|find|fetch|info|query)\b/.test(lower) || wantsTxs)
  ) {
    return {
      handler: async () => {
        if (wantsTxs) {
          // Fetch full block with transactions
          const block = await getFullBlockAtHeight(blockNum);
          return {
            content: `Block **#${blockNum.toLocaleString()}** — **${block.transactions.length}** transaction(s):`,
            data: {
              blockHeight: block.height,
              blockId: block.id,
              generator: block.generator,
              timestamp: new Date(block.timestamp).toLocaleString(),
              totalFee: (block.totalFee / 1e8).toFixed(8) + " DCC",
              transactions: block.transactions.map((tx) => formatTxSummary(tx)),
            },
            type: "block-txs",
          };
        }
        // Just the block header
        const block = await getBlockAtHeight(blockNum);
        return {
          content: `Block **#${blockNum.toLocaleString()}**:`,
          data: {
            height: block.height,
            id: block.id,
            transactionCount: block.transactionCount,
            generator: block.generator,
            blocksize: block.blocksize,
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
  if (address && !/\b(bridge.*history|order.*history|swap.*history|position)\b/.test(lower)) {
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
  if (/\b(network|status|overview|stats|summary|how.*network|chain\s*status)\b/.test(lower) && !/\b(bridge|swap|pool|amm|protocol)\b/.test(lower)) {
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
  if (/\b(peers|nodes|connected|validators)\b/.test(lower) && !/\b(bridge|swap|pool)\b/.test(lower)) {
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
  if (/\b(node\s*version|software\s*version|client\s*version)\b/.test(lower)) {
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

  // ═══════════════════════════════════════════
  // BRIDGE COMMANDS
  // ═══════════════════════════════════════════

  // Bridge health / status
  if (/\b(bridge)\b/.test(lower) && /\b(health|status|up|down|alive|running)\b/.test(lower)) {
    return {
      handler: async () => {
        const health = await getBridgeHealth();
        return {
          content: `SOL ⇄ DCC Bridge status:`,
          data: formatObj(health),
          type: "bridge",
        };
      },
    };
  }

  // Bridge limits
  if (/\b(bridge)\b/.test(lower) && /\b(limit|min|max|minimum|maximum|range)\b/.test(lower)) {
    return {
      handler: async () => {
        const limits = await getBridgeLimits();
        return {
          content: `Bridge deposit limits:`,
          data: formatObj(limits),
          type: "bridge",
        };
      },
    };
  }

  // Bridge fees
  if (/\b(bridge)\b/.test(lower) && /\b(fee|cost|charge|commission)\b/.test(lower) && !/\b(quote|estimate|how\s*much)\b/.test(lower)) {
    return {
      handler: async () => {
        const fees = await getBridgeFees();
        return {
          content: `Bridge fee structure:`,
          data: formatObj(fees),
          type: "bridge",
        };
      },
    };
  }

  // Bridge quote — "bridge quote 10 SOL", "how much DCC for 5 SOL", "bridge 0.003 sol"
  if (
    (/\b(bridge)\b/.test(lower) && /\b(quote|estimate|preview|calculate)\b/.test(lower)) ||
    (/\b(how\s*much|convert|bridge)\b/.test(lower) && /\b(sol|usdc|usdt)\b/.test(lower) && /\b(dcc|get|receive)\b/.test(lower)) ||
    (/\b(bridge)\b/.test(lower) && /\d+(\.\d+)?/.test(lower) && /\b(sol|usdc|usdt)\b/.test(lower))
  ) {
    const amount = extractAmount(input);
    const token = extractToken(input);
    return {
      handler: async () => {
        if (!amount) {
          return {
            content: `Please specify an amount, e.g. **"Bridge quote 10 SOL"** or **"How much DCC for 100 USDC?"**`,
            type: "text",
          };
        }
        const quote = await getBridgeQuote(amount, token);
        return {
          content: `Bridge quote for **${amount} ${token}**:`,
          data: formatObj(quote),
          type: "bridge",
        };
      },
    };
  }

  // Bridge stats
  if (/\b(bridge)\b/.test(lower) && /\b(stats|statistics|analytics|volume|total|aggregate)\b/.test(lower)) {
    return {
      handler: async () => {
        const stats = await getBridgeStats();
        return {
          content: `Bridge aggregate statistics:`,
          data: formatObj(stats),
          type: "bridge",
        };
      },
    };
  }

  // Bridge order history by address
  if (/\b(bridge)\b/.test(lower) && /\b(history|orders|past|previous)\b/.test(lower)) {
    const addr = extractAddress(input);
    return {
      handler: async () => {
        if (!addr) {
          return {
            content: `Please provide a DCC address, e.g. **"Bridge history 3P..."**`,
            type: "text",
          };
        }
        const orders = await getBridgeOrderHistory(addr);
        if (!Array.isArray(orders) || orders.length === 0) {
          return { content: `No bridge orders found for \`${addr}\`.`, type: "text" };
        }
        return {
          content: `**${orders.length}** bridge order(s) for \`${addr}\`:`,
          data: formatObj(orders[0] as Record<string, unknown>),
          type: "bridge",
        };
      },
    };
  }

  // Bridge order lookup by ID
  if (/\b(bridge)\b/.test(lower) && /\b(order)\b/.test(lower)) {
    const orderId = extractOrderId(input);
    return {
      handler: async () => {
        if (!orderId) {
          return {
            content: `Please provide an order ID, e.g. **"Bridge order abc123-def456"**`,
            type: "text",
          };
        }
        const order = await getBridgeOrderById(orderId);
        return {
          content: `Bridge order **${orderId}**:`,
          data: formatObj(order),
          type: "bridge",
        };
      },
    };
  }

  // Generic bridge info
  if (/\b(bridge|sol\s*to\s*dcc|cross.?chain|solana.*dcc)\b/.test(lower) && !/\b(help)\b/.test(lower)) {
    return {
      handler: async () => {
        const [health, limits] = await Promise.all([
          getBridgeHealth().catch(() => null),
          getBridgeLimits().catch(() => null),
        ]);
        let content = `**SOL ⇄ DCC Bridge**\n\n`;
        content += `The cross-chain bridge converts SOL, USDC, and USDT on Solana into DCC on DecentralChain.\n\n`;
        content += `**How it works:**\n`;
        content += `• Deposits on Solana are locked in a PDA-controlled vault\n`;
        content += `• Wrapped equivalents are minted on DCC\n`;
        content += `• Fast committee-signed path for <100 SOL\n`;
        content += `• Trustless Groth16 ZK-proof path for larger amounts\n`;
        content += `• CR Stable stablecoin can be minted 1:1 via USDC/USDT\n\n`;
        content += `Try: **"Bridge quote 10 SOL"**, **"Bridge fees"**, **"Bridge limits"**, **"Bridge stats"**`;
        return { content, type: "text" };
      },
    };
  }

  // ═══════════════════════════════════════════
  // AMM / SWAP COMMANDS
  // ═══════════════════════════════════════════

  // AMM health
  if (/\b(amm|dex|swap)\b/.test(lower) && /\b(health|status|up|down|alive|running)\b/.test(lower)) {
    return {
      handler: async () => {
        const health = await getAmmHealth();
        return {
          content: `DCC AMM status:`,
          data: formatObj(health),
          type: "swap",
        };
      },
    };
  }

  // List pools
  if (/\b(pool|pools|liquidity\s*pool)\b/.test(lower) && /\b(list|all|show|available|what|active)\b/.test(lower)) {
    return {
      handler: async () => {
        const pools = await listPools();
        if (!Array.isArray(pools) || pools.length === 0) {
          return { content: `No liquidity pools found.`, type: "text" };
        }
        const poolList = pools.slice(0, 10).map(
          (p) => {
            const name = `${p.token0Name ?? p.token0}/${p.token1Name ?? p.token1}`;
            const r0 = typeof p.reserve0 === "number" ? p.reserve0.toFixed(4) : p.reserve0;
            const r1 = typeof p.reserve1 === "number" ? p.reserve1.toFixed(4) : p.reserve1;
            const swaps = p.swapCount ?? 0;
            return `• **${name}** — Reserves: ${r0} / ${r1}, Fee: ${p.feeBps}bps, Swaps: ${swaps}`;
          }
        ).join("\n");
        return {
          content: `**${pools.length}** liquidity pool(s) on DCC Swap:\n\n${poolList}${pools.length > 10 ? `\n\n...and ${pools.length - 10} more` : ""}`,
          type: "text",
        };
      },
    };
  }

  // Pool details — "pool DCC_USDT", "show pool ..."
  const poolKey = extractPoolKey(input);
  if (poolKey && /\b(pool|info|detail|show|get)\b/.test(lower) && !/\b(stats|analytics|volume|apy)\b/.test(lower)) {
    return {
      handler: async () => {
        const pool = await getPool(poolKey);
        return {
          content: `Pool **${poolKey}**:`,
          data: formatObj(pool),
          type: "pool",
        };
      },
    };
  }

  // Pool price — "pool price DCC_USDT", "price of DCC_USDT"
  if (poolKey && /\b(price|rate|exchange)\b/.test(lower)) {
    return {
      handler: async () => {
        const priceData = await getPoolPrice(poolKey);
        return {
          content: `Spot price for **${poolKey}**:`,
          data: formatObj(priceData),
          type: "pool",
        };
      },
    };
  }

  // Pool stats — "pool stats DCC_USDT", "DCC_USDT volume"
  if (poolKey && /\b(stats|analytics|volume|apy|fee|metric)\b/.test(lower)) {
    return {
      handler: async () => {
        const stats = await getPoolStats(poolKey);
        return {
          content: `Analytics for pool **${poolKey}**:`,
          data: formatObj(stats),
          type: "pool",
        };
      },
    };
  }

  // ─── Early automation detection ───
  // If the input looks like a scheduling command (contains "every", "daily", "for N days", etc.)
  // skip ahead to the automation parser instead of matching regular swap/send/burn handlers.
  const hasScheduleKeywords = /\b(every\s+(\d+\s+)?(day|hour|week|minute|second|morning|evening|night|single|sec|min)|daily|weekly|hourly|for\s+\d+\s+(days?|weeks?|months?)|recurring|schedule|automate|cron|each\s+(day|hour|week)|up\s*to\s+\d+)\b/i.test(lower);
  if (hasScheduleKeywords || /\beveryday\b/i.test(lower)) {
    const parsed = parseAutomation(input.replace(/everyday/gi, "every day"));
    if (parsed) {
      return {
        handler: async () => {
          if (parsed.action.type.startsWith("scheduled-") || parsed.action.type === "price-trigger-swap") {
            if (!wallet?.isConnected) {
              return {
                content: `⚠️ You need to connect your wallet before creating transaction automations. Connect using the button in the navbar, then try again.`,
                type: "error" as TerminalMessage["type"],
              };
            }
          }
          if (parsed.telegram && !parsed.telegram.chatId) {
            return {
              content: `I need your Telegram Chat ID to send messages. Please include it like:\n\n**"telegram token YOUR_BOT_TOKEN chat YOUR_CHAT_ID ..."**\n\nTo get your Chat ID, message your bot, then visit:\n\`https://api.telegram.org/botYOUR_TOKEN/getUpdates\``,
              type: "text" as TerminalMessage["type"],
            };
          }
          const auto = createAutomation(parsed, wallet?.address);
          let confirmMsg =
            `✅ **Automation Created!**\n\n` +
            `**${auto.name}**\n` +
            `${auto.description}\n\n`;
          if (auto.schedule.timeOfDay) confirmMsg += `⏰ Time: ${auto.schedule.timeOfDay}\n`;
          if (auto.schedule.maxRuns) confirmMsg += `🔄 Repeats: ${auto.schedule.maxRuns}x\n`;
          if (auto.condition) confirmMsg += `📊 Condition: DCC ${auto.condition.direction} $${auto.condition.threshold}\n`;
          if (auto.telegram) confirmMsg += `📱 Telegram: Connected\n`;
          confirmMsg += `\nID: \`${auto.id.slice(0, 8)}\`\n`;
          confirmMsg += `Next run: **${formatNextRun(auto)}**\n\n`;
          confirmMsg += `⚠️ **Note:** Automations run while this browser tab is open. Keep the dashboard open for scheduled tasks to execute.`;

          return {
            content: confirmMsg,
            data: { automationId: auto.id, name: auto.name, type: auto.action.type, nextRun: formatNextRun(auto) },
            type: "automation" as TerminalMessage["type"],
          };
        },
      };
    }
  }

  // Swap quote — "swap quote 100 DCC to USDT", "quote swap 50 USDT for DCC", "swap 1 MyToken for Raybean"
  if (
    (/\b(swap|trade|exchange)\b/.test(lower) && /\b(quote|estimate|preview|how\s*much|price|calculate)\b/.test(lower)) ||
    (/\b(swap|trade|exchange)\b/.test(lower) && /\d+(\.\d+)?/.test(lower) && /\b(to|for|into)\b/.test(lower))
  ) {
    const amount = extractAmount(input);
    const swapTokens = extractSwapTokens(input);
    return {
      handler: async () => {
        if (!amount || !swapTokens) {
          return {
            content: `Please specify amount and token pair, e.g. **"Swap 100 DCC to USDT"** or **"Swap 1 MyToken for Raybean"**`,
            type: "text",
          };
        }
        const tokenIn = swapTokens[0];
        const tokenOut = swapTokens[1];
        const quote = await getSwapQuote(tokenIn, tokenOut, amount);

        // Auto-sign: if enabled and wallet connected, execute the swap immediately
        if (options?.autoSign && wallet?.isConnected && wallet.seed) {
          const minReceived = quote.outputAmount * 0.995;
          let resolvedIn: { assetId: string | null; decimals: number };
          let resolvedOut: { assetId: string | null; decimals: number };
          try {
            resolvedIn = await resolveToken(tokenIn, wallet.address);
            resolvedOut = await resolveToken(tokenOut, wallet.address);
          } catch (e: unknown) {
            return {
              content: `❌ ${e instanceof Error ? e.message : "Could not resolve token to asset ID."}`,
              type: "error",
            };
          }
          const result = await executeSwap(
            wallet.seed,
            tokenIn,
            tokenOut,
            amount,
            minReceived,
            resolvedIn.assetId,
            resolvedOut.assetId,
            resolvedIn.decimals,
            resolvedOut.decimals,
          );
          if (result.success) {
            return {
              content: `⚡ **Auto-signed** — Swap executed!\n\n**${amount} ${tokenIn} → ${tokenOut}**\nTransaction ID: \`${result.id}\``,
              data: {
                txId: result.id,
                input: `${amount} ${tokenIn}`,
                estimatedOutput: `~${quote.outputAmount} ${tokenOut}`,
                slippageTolerance: "0.5%",
                status: "Broadcast",
              },
              type: "swap",
            };
          }
          return {
            content: `⚡ Auto-sign attempted but failed: ${result.error}\n\nQuote was **${amount} ${tokenIn} → ~${quote.outputAmount} ${tokenOut}**.`,
            data: formatObj(quote),
            type: "error",
          };
        }

        return {
          content: `Swap quote for **${amount} ${tokenIn} → ${tokenOut}**:`,
          data: formatObj(quote),
          type: "swap",
        };
      },
    };
  }

  // Recent swaps
  if (/\b(recent|latest|last)\s*(swap|trade|exchange)\b/.test(lower)) {
    return {
      handler: async () => {
        const swaps = await listRecentSwaps();
        if (!Array.isArray(swaps) || swaps.length === 0) {
          return { content: `No recent swaps found.`, type: "text" };
        }
        return {
          content: `**${swaps.length}** recent swap(s):`,
          data: formatObj(swaps[0] as Record<string, unknown>),
          type: "swap",
        };
      },
    };
  }

  // Swap history by address
  if (/\b(swap|trade)\b/.test(lower) && /\b(history|past|previous)\b/.test(lower)) {
    const addr = extractAddress(input);
    return {
      handler: async () => {
        if (!addr) {
          return { content: `Please provide an address, e.g. **"Swap history 3P..."**`, type: "text" };
        }
        const swaps = await getSwapsByAddress(addr);
        if (!Array.isArray(swaps) || swaps.length === 0) {
          return { content: `No swap history found for \`${addr}\`.`, type: "text" };
        }
        return {
          content: `**${swaps.length}** swap(s) for \`${addr}\`:`,
          data: formatObj(swaps[0] as Record<string, unknown>),
          type: "swap",
        };
      },
    };
  }

  // User LP positions
  if (/\b(position|lp\s*position|my\s*pool|liquidity\s*position|portfolio)\b/.test(lower)) {
    const addr = extractAddress(input);
    return {
      handler: async () => {
        if (!addr) {
          return { content: `Please provide an address, e.g. **"Positions 3P..."**`, type: "text" };
        }
        const positions = await getUserPositions(addr);
        if (!Array.isArray(positions) || positions.length === 0) {
          return { content: `No LP positions found for \`${addr}\`.`, type: "text" };
        }
        const posList = positions.slice(0, 5).map(
          (p) => `• **${p.poolKey}** — LP Tokens: ${p.lpTokens}, Share: ${(p.share * 100).toFixed(2)}%`
        ).join("\n");
        return {
          content: `LP positions for \`${addr}\`:\n\n${posList}`,
          type: "pool",
        };
      },
    };
  }

  // Token info — "token info [assetId]"
  if (/\b(token)\b/.test(lower) && /\b(info|details|metadata|about|what\s*is)\b/.test(lower)) {
    const assetId = extractAssetId(input);
    return {
      handler: async () => {
        if (!assetId) {
          return { content: `Please provide a token asset ID, e.g. **"Token info [assetId]"**`, type: "text" };
        }
        const token = await getTokenInfo(assetId);
        return {
          content: `Token **${token.name || assetId}**:`,
          data: formatObj(token),
          type: "text",
        };
      },
    };
  }

  // Protocol status
  if (/\b(protocol)\b/.test(lower) && /\b(status|info|health|state)\b/.test(lower)) {
    return {
      handler: async () => {
        const status = await getProtocolStatus();
        return {
          content: `On-chain AMM protocol status:`,
          data: formatObj(status),
          type: "swap",
        };
      },
    };
  }

  // Token discovery — "discover tokens", "popular tokens", "what tokens exist", "search token X"
  if (
    (/\b(discover|explore|search|find|browse|popular|trending|available|listed)\b/.test(lower) && /\b(tokens?|coins?|assets?)\b/.test(lower)) ||
    /\b(tokens?\s*on\s*dcc|what\s*tokens?|which\s*tokens?)\b/.test(lower)
  ) {
    return {
      handler: async () => {
        const pools = await listPools().catch(() => []);
        const tokenSet = new Map<string, { name: string; poolCount: number; totalVolume: number }>();
        tokenSet.set("DCC", { name: "DCC", poolCount: pools.length, totalVolume: 0 });
        for (const p of pools) {
          const key = p.token1;
          const name = p.token1Name ?? p.token1;
          const existing = tokenSet.get(key);
          if (existing) {
            existing.poolCount++;
          } else {
            tokenSet.set(key, { name, poolCount: 1, totalVolume: 0 });
          }
        }
        const tokens = Array.from(tokenSet.values()).sort((a, b) => b.poolCount - a.poolCount);

        if (tokens.length <= 1) {
          return {
            content: `No tradeable tokens found on DCC Swap yet. Try creating a pool first!`,
            type: "text",
          };
        }

        const lines = tokens.map((t, i) => {
          const rank = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          return `${rank} **${t.name}** — in ${t.poolCount} pool${t.poolCount > 1 ? "s" : ""}`;
        });

        return {
          content:
            `🔍 **Token Discovery** — ${tokens.length} tokens on DCC\n\n` +
            `${lines.join("\n")}\n\n` +
            `Use **"Token info [assetId]"** for details, or **"Swap quote 1 DCC to [token]"** to check rates.`,
          data: { tokenCount: tokens.length, tokens: tokens.map(t => t.name) },
          type: "text",
        };
      },
    };
  }

  // DeFi strategy builder — "suggest a DCA strategy", "DeFi strategies", "yield strategy"
  if (/\b(strateg|dca|yield\s*farm|defi\s*(?:strateg|plan|build))\b/.test(lower)) {
    return {
      handler: async () => {
        const pools = await listPools().catch(() => []);
        const poolNames = pools.slice(0, 5).map(p => `${p.token0Name}/${p.token1Name}`).join(", ");

        let content = `🏗️ **DeFi Strategy Builder**\n\n`;
        content += `Here are strategies you can set up right now:\n\n`;
        content += `**1. Dollar-Cost Averaging (DCA)**\n`;
        content += `Accumulate tokens gradually to reduce volatility risk.\n`;
        content += `→ *"Swap 10 DCC to wDAI every day for 30 days"*\n\n`;
        content += `**2. Recurring Yield Harvest**\n`;
        content += `Regularly swap earned fees back into LP positions.\n`;
        content += `→ *"Swap 5 DCC to wDAI every week"*\n\n`;
        content += `**3. Price-Triggered Buy**\n`;
        content += `Automatically buy when prices dip below your target.\n`;
        content += `→ *"If DCC drops below $0.50, buy 100 DCC"*\n\n`;
        content += `**4. Scheduled Distributions**\n`;
        content += `Regular payments for payroll, grants, or drips.\n`;
        content += `→ *"Send 100 DCC to 3P... every week for 12 weeks"*\n\n`;
        content += `**5. Token Burn Schedule**\n`;
        content += `Deflationary burn campaigns on a recurring basis.\n`;
        content += `→ *"Burn 1000 MyToken every week for 4 weeks"*\n\n`;

        if (pools.length > 0) {
          content += `**Available Pools:** ${poolNames}\n\n`;
        }
        content += `Tell me which strategy interests you, or describe your own!`;

        return { content, type: "text" };
      },
    };
  }

  // Generic swap/AMM info
  if (/\b(swap|amm|dex|trade|trading)\b/.test(lower) && !/\b(help|quote|recent|history|status|execute|confirm|send)\b/.test(lower)) {
    return {
      handler: async () => {
        let content = `**DCC Swap — Automated Market Maker**\n\n`;
        content += `DCC Swap is a constant-product AMM (x·y=k) built natively on DecentralChain with RIDE smart contracts.\n\n`;
        content += `**Capabilities:**\n`;
        content += `• Create pools, add/remove liquidity, swap tokens\n`;
        content += `• TypeScript SDK & React web UI\n`;
        content += `• Configurable fee tiers (basis points)\n`;
        content += `• On-chain contract: \`3Da7xwRRtXfkA46jaKTYb75Usd2ZNWdY6HX\`\n\n`;
        content += `Try: **"List pools"**, **"Swap quote 100 DCC to USDT"**, **"Pool DCC_USDT"**, **"Recent swaps"**`;
        return { content, type: "text" };
      },
    };
  }

  // ═══════════════════════════════════════════
  // SIGNING / WALLET COMMANDS
  // ═══════════════════════════════════════════

  // Portfolio analytics — "portfolio", "portfolio breakdown", "my holdings", "asset allocation"
  if (/\b(portfolio|holdings|allocation|breakdown)\b/.test(lower) && !/\b(lp\s*position)\b/.test(lower)) {
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.address) {
          return { content: `No wallet connected. Connect your wallet to view portfolio analytics.`, type: "text" };
        }
        const [balResult, assetsResult, positions] = await Promise.all([
          getAddressBalance(wallet.address).catch(() => null),
          getAssetBalances(wallet.address).catch(() => []),
          getUserPositions(wallet.address).catch(() => []),
        ]);

        const dccAmount = balResult ? balResult.available : 0;
        const holdings: { name: string; amount: number; assetId: string | null; decimals: number }[] = [
          { name: "DCC", amount: dccAmount, assetId: null, decimals: 8 },
        ];
        for (const asset of assetsResult) {
          const name = asset.issueTransaction?.name ?? asset.assetId.slice(0, 8) + "…";
          const decimals = asset.issueTransaction?.decimals ?? 8;
          const amount = asset.balance / Math.pow(10, decimals);
          if (amount > 0) holdings.push({ name, amount, assetId: asset.assetId, decimals });
        }

        const totalAssets = holdings.length;
        const holdingLines = holdings
          .sort((a, b) => b.amount - a.amount)
          .map((h) => {
            const pct = dccAmount > 0 && h.name === "DCC" ? "—" : "";
            return `• **${h.name}**: ${h.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })}${pct ? ` (native)` : ""}`;
          })
          .join("\n");

        const lpLines = positions.length > 0
          ? `\n\n**LP Positions (${positions.length})**\n` +
            positions.map(p => `• **${p.poolKey}** — ${p.lpTokens.toLocaleString()} LP (${(p.share * 100).toFixed(2)}% share)`).join("\n")
          : "";

        const content =
          `📊 **Portfolio Analytics**\n\n` +
          `**Address:** \`${wallet.address}\`\n` +
          `**Total Assets:** ${totalAssets} token${totalAssets !== 1 ? "s" : ""}\n\n` +
          `**Holdings**\n${holdingLines}${lpLines}`;

        return {
          content,
          data: {
            address: wallet.address,
            totalTokens: totalAssets,
            lpPositions: positions.length,
            dccBalance: dccAmount.toFixed(8),
            tokens: holdings.map(h => ({ name: h.name, amount: h.amount })),
          },
          type: "balance",
        };
      },
    };
  }

  // Transaction history — "my transactions", "tx history", "recent transactions"
  if (
    (/\b(my|recent|show|view|list|get)\b/.test(lower) && /\b(transactions?|txs?|history)\b/.test(lower) && !/\b(block|bridge|swap|pool|automation)\b/.test(lower)) ||
    /\btx\s*history\b/.test(lower)
  ) {
    const addr = extractAddress(input);
    return {
      handler: async () => {
        const targetAddr = addr || wallet?.address;
        if (!targetAddr) {
          return { content: `No wallet connected and no address provided. Connect your wallet or specify an address.`, type: "text" };
        }
        const txs = await getAddressTransactions(targetAddr, 20);
        if (txs.length === 0) {
          return { content: `No transactions found for \`${targetAddr}\`.`, type: "text" };
        }
        const lines = txs.slice(0, 15).map((tx, i) => {
          const typeName = TX_TYPE_NAMES[tx.type as number] || `Type ${tx.type}`;
          const time = new Date(tx.timestamp as number).toLocaleString();
          const fee = ((tx.fee as number) / 1e8).toFixed(4);
          const amt = tx.amount ? ` | Amount: ${((tx.amount as number) / 1e8).toFixed(4)} DCC` : "";
          const recipient = tx.recipient ? ` → \`${(tx.recipient as string).slice(0, 8)}…\`` : "";
          return `**${i + 1}.** ${typeName}${recipient}${amt} | Fee: ${fee} DCC\n   \`${(tx.id as string).slice(0, 12)}…\` — ${time}`;
        });
        return {
          content: `📜 **Transaction History** (${txs.length} most recent)\n**Address:** \`${targetAddr}\`\n\n${lines.join("\n\n")}${txs.length > 15 ? `\n\n...and ${txs.length - 15} more` : ""}`,
          data: {
            address: targetAddr,
            totalShown: Math.min(txs.length, 15),
            transactions: txs.slice(0, 15).map(tx => ({
              id: tx.id,
              type: TX_TYPE_NAMES[tx.type as number] || `Type ${tx.type}`,
              timestamp: tx.timestamp,
            })),
          },
          type: "transaction",
        };
      },
    };
  }

  // Wallet status / "my balance"
  if ((/\b(wallet|my\s*wallet|account|connected)\b/.test(lower) && !/\b(connect|disconnect)\b/.test(lower)) ||
      /\b(my\s*balance|check\s*balance|show\s*balance|view\s*balance|whats\s*my|what'?s\s*my\s*balance)\b/.test(lower) ||
      (/\b(check|show|view|get|see)\b/.test(lower) && /\b(balance|assets|tokens|portfolio)\b/.test(lower) && /\b(my|wallet)\b/.test(lower))) {
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.address) {
          return {
            content: `No wallet connected. Click the **Connect** button in the navbar to connect your DCC wallet with a seed phrase.`,
            type: "text",
          };
        }
        const [balResult, assetsResult] = await Promise.all([
          getAddressBalance(wallet.address).catch(() => null),
          getAssetBalances(wallet.address).catch(() => []),
        ]);

        const dccAvailable = balResult ? balResult.available.toFixed(8) : "0.00000000";
        const dccRegular = balResult ? balResult.regular.toFixed(8) : "0.00000000";
        const dccEffective = balResult ? balResult.effective.toFixed(8) : "0.00000000";

        const data: Record<string, unknown> = {
          address: wallet.address,
          DCC_available: dccAvailable + " DCC",
          DCC_regular: dccRegular + " DCC",
          DCC_effective: dccEffective + " DCC",
        };

        for (const asset of assetsResult) {
          const name = asset.issueTransaction?.name ?? asset.assetId.slice(0, 8) + "…";
          const decimals = asset.issueTransaction?.decimals ?? 8;
          const amount = (asset.balance / Math.pow(10, decimals)).toFixed(Math.min(decimals, 8));
          data[name] = amount;
        }

        const assetCount = assetsResult.length;
        const summary = assetCount > 0
          ? `Your wallet (**${assetCount}** token${assetCount === 1 ? "" : "s"} + DCC):`
          : `Your connected wallet:`;

        return {
          content: summary,
          data,
          type: "balance",
        };
      },
    };
  }

  // Execute swap — "execute swap 100 DCC to USDT", "swap 50 DCC for USDT confirm"
  if (
    /\b(execute|confirm|send|do|perform)\b/.test(lower) &&
    /\b(swap|trade|exchange)\b/.test(lower)
  ) {
    const amount = extractAmount(input);
    const swapTokens = extractSwapTokens(input);
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.seed) {
          return {
            content: `⚠️ Wallet not connected. Please connect your wallet first using the **Connect** button in the navbar.`,
            type: "error",
          };
        }
        if (!amount || !swapTokens) {
          return {
            content: `Please specify amount and tokens, e.g. **"Execute swap 100 DCC to USDT"** or **"Swap 1 MyToken for Raybean confirm"**`,
            type: "text",
          };
        }
        const tokenIn = swapTokens[0];
        const tokenOut = swapTokens[1];
        // Get a quote first
        const quote = await getSwapQuote(tokenIn, tokenOut, amount);
        const minReceived = quote.outputAmount * 0.995; // 0.5% slippage tolerance
        let resolvedIn: { assetId: string | null; decimals: number };
        let resolvedOut: { assetId: string | null; decimals: number };
        try {
          resolvedIn = await resolveToken(tokenIn, wallet.address);
          resolvedOut = await resolveToken(tokenOut, wallet.address);
        } catch (e: unknown) {
          return {
            content: `❌ ${e instanceof Error ? e.message : "Could not resolve token to asset ID."}`,
            type: "error",
          };
        }
        const result = await executeSwap(
          wallet.seed,
          tokenIn,
          tokenOut,
          amount,
          minReceived,
          resolvedIn.assetId,
          resolvedOut.assetId,
          resolvedIn.decimals,
          resolvedOut.decimals,
        );
        if (result.success) {
          return {
            content: `✅ Swap executed successfully!\n\n**${amount} ${tokenIn} → ${tokenOut}**\nTransaction ID: \`${result.id}\``,
            data: {
              txId: result.id,
              input: `${amount} ${tokenIn}`,
              estimatedOutput: `~${quote.outputAmount} ${tokenOut}`,
              slippageTolerance: "0.5%",
              status: "Broadcast",
            },
            type: "swap",
          };
        }
        return {
          content: `❌ Swap failed: ${result.error}`,
          type: "error",
        };
      },
    };
  }

  // Create pool — "create a pool for USDC/Solana", "create pool DCC_USDT 100 50", "new pool DCC/USDC with 100 DCC and 50 USDC"
  if (
    (/\b(create|new|init|initialize|launch|open|start)\b/.test(lower) && /\b(pool|pair|lp)\b/.test(lower)) ||
    (/\b(create|launch|open)\b/.test(lower) && /\b(liquidity)\b/.test(lower))
  ) {
    // Extract token pair — support USDC/SOL, USDC_SOL, "USDC and SOL", "USDC SOL", "for USDC/Solana"
    const slashPair = input.match(/\b([A-Za-z][A-Za-z0-9]{1,10})\s*[\/\\]\s*([A-Za-z][A-Za-z0-9]{1,10})\b/);
    const underscorePair = extractPoolKey(input);
    const andPair = input.match(/\b([A-Za-z][A-Za-z0-9]{1,10})\s+(?:and|&)\s+([A-Za-z][A-Za-z0-9]{1,10})\b/i);
    const amounts = input.match(/(\d+(?:\.\d+)?)/g);
    const feeMatch = input.match(/(?:fee|bps)\s*[:=]?\s*(\d+)/i);

    let token0: string | null = null;
    let token1: string | null = null;

    if (slashPair) {
      token0 = slashPair[1].toUpperCase();
      token1 = slashPair[2].toUpperCase();
    } else if (underscorePair) {
      const parts = underscorePair.split("_");
      token0 = parts[0].toUpperCase();
      token1 = parts[1].toUpperCase();
    } else if (andPair) {
      token0 = andPair[1].toUpperCase();
      token1 = andPair[2].toUpperCase();
    }

    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.seed) {
          return {
            content: `⚠️ Wallet not connected. Please connect your wallet first using the **Connect** button in the navbar.`,
            type: "error",
          };
        }
        if (!token0 || !token1) {
          return {
            content: `To create a pool, specify the token pair and initial liquidity amounts:\n\n` +
              `**"Create pool DCC/USDT 100 50"** — Creates a DCC/USDT pool with 100 DCC + 50 USDT\n` +
              `**"Create pool DCC_USDC 500 500"** — Creates a DCC/USDC pool\n` +
              `**"New pool SOL/DCC 10 1000 fee 30"** — With custom fee (30 bps)\n\n` +
              `You need to provide initial liquidity for both tokens.`,
            type: "text",
          };
        }
        if (!amounts || amounts.length < 2) {
          return {
            content: `Please specify initial liquidity amounts for both tokens:\n\n` +
              `**"Create pool ${token0}/${token1} 100 50"** — ${amounts?.[0] ?? "100"} ${token0} + 50 ${token1}\n\n` +
              `Both tokens need initial liquidity to set the starting price.`,
            type: "text",
          };
        }
        const amount0 = parseFloat(amounts[0]);
        const amount1 = parseFloat(amounts[1]);
        let resolved0: { assetId: string | null; decimals: number };
        let resolved1: { assetId: string | null; decimals: number };
        try {
          resolved0 = await resolveToken(token0, wallet.address);
          resolved1 = await resolveToken(token1, wallet.address);
        } catch (e: unknown) {
          return {
            content: `❌ ${e instanceof Error ? e.message : "Could not resolve token to asset ID."}`,
            type: "error",
          };
        }
        const feeBps = feeMatch ? parseInt(feeMatch[1], 10) : undefined;

        const result = await createPool(
          wallet.seed,
          token0,
          token1,
          amount0,
          amount1,
          resolved0.assetId,
          resolved1.assetId,
          resolved0.decimals,
          resolved1.decimals,
          feeBps,
        );
        if (result.success) {
          const poolKey = `${token0}_${token1}`;
          return {
            content: `✅ **Pool ${token0}/${token1} created!**\n\nTransaction ID: \`${result.id}\`\n\nInitial liquidity: ${amount0} ${token0} + ${amount1} ${token1}${feeBps ? `\nFee: ${feeBps} bps` : ""}\n\nYou can now swap tokens with **"Swap 10 ${token0} to ${token1}"** or add more liquidity with **"Add liquidity ${poolKey} ..."**`,
            data: {
              txId: result.id,
              pool: poolKey,
              deposit: `${amount0} ${token0} + ${amount1} ${token1}`,
              status: "Broadcast",
            },
            type: "pool",
          };
        }
        return {
          content: `❌ Create pool failed: ${result.error}`,
          type: "error",
        };
      },
    };
  }

  // Add liquidity — "add liquidity DCC_USDT 100 50"
  if (/\b(add)\b/.test(lower) && /\b(liquidity|lp)\b/.test(lower)) {
    const pool = extractPoolKey(input);
    const amounts = input.match(/(\d+(?:\.\d+)?)/g);
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.seed) {
          return {
            content: `⚠️ Wallet not connected. Please connect your wallet first using the **Connect** button in the navbar.`,
            type: "error",
          };
        }
        if (!pool || !amounts || amounts.length < 2) {
          return {
            content: `Please specify pool and amounts, e.g. **"Add liquidity DCC_USDT 100 50"** (100 DCC + 50 USDT)`,
            type: "text",
          };
        }
        const amount0 = parseFloat(amounts[0]);
        const amount1 = parseFloat(amounts[1]);
        const [token0, token1] = pool.split("_");
        let resolved0: { assetId: string | null; decimals: number };
        let resolved1: { assetId: string | null; decimals: number };
        try {
          resolved0 = await resolveToken(token0, wallet.address);
          resolved1 = await resolveToken(token1, wallet.address);
        } catch (e: unknown) {
          return {
            content: `❌ ${e instanceof Error ? e.message : "Could not resolve token to asset ID."}`,
            type: "error",
          };
        }
        const result = await addLiquidity(
          wallet.seed,
          pool,
          amount0,
          amount1,
          resolved0.assetId,
          resolved1.assetId,
          resolved0.decimals,
          resolved1.decimals,
        );
        if (result.success) {
          return {
            content: `✅ Liquidity added to **${pool}**!\nTransaction ID: \`${result.id}\``,
            data: {
              txId: result.id,
              pool,
              deposit: `${amount0} ${token0} + ${amount1} ${token1}`,
              status: "Broadcast",
            },
            type: "pool",
          };
        }
        return {
          content: `❌ Add liquidity failed: ${result.error}`,
          type: "error",
        };
      },
    };
  }

  // Remove liquidity — "remove liquidity DCC_USDT 10 [lpAssetId]"
  if (/\b(remove|withdraw)\b/.test(lower) && /\b(liquidity|lp)\b/.test(lower)) {
    const pool = extractPoolKey(input);
    const amount = extractAmount(input);
    const assetId = extractAssetId(input);
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.seed) {
          return {
            content: `⚠️ Wallet not connected. Please connect your wallet first using the **Connect** button in the navbar.`,
            type: "error",
          };
        }
        if (!pool || !amount || !assetId) {
          return {
            content: `Please specify pool, LP token amount, and LP asset ID, e.g. **"Remove liquidity DCC_USDT 10 [lpAssetId]"**`,
            type: "text",
          };
        }
        const result = await removeLiquidity(wallet.seed, pool, amount, assetId);
        if (result.success) {
          return {
            content: `✅ Liquidity removed from **${pool}**!\nTransaction ID: \`${result.id}\``,
            data: {
              txId: result.id,
              pool,
              lpTokensBurned: amount,
              status: "Broadcast",
            },
            type: "pool",
          };
        }
        return {
          content: `❌ Remove liquidity failed: ${result.error}`,
          type: "error",
        };
      },
    };
  }

  // Transfer / send — "send 10 DCC to 3P..."
  if (/\b(send|transfer)\b/.test(lower) && /\b(dcc|to)\b/.test(lower) && !/\b(create|issue|mint|burn|token)\b/.test(lower)) {
    const amount = extractAmount(input);
    const addr = extractAddress(input);
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.seed) {
          return {
            content: `⚠️ Wallet not connected. Please connect your wallet first using the **Connect** button in the navbar.`,
            type: "error",
          };
        }
        if (!amount || !addr) {
          return {
            content: `Please specify amount and recipient, e.g. **"Send 10 DCC to 3P..."**`,
            type: "text",
          };
        }
        const result = await sendTransfer(wallet.seed, addr, amount);
        if (result.success) {
          return {
            content: `✅ Transfer successful!\nSent **${amount} DCC** to \`${addr}\`\nTransaction ID: \`${result.id}\``,
            data: {
              txId: result.id,
              amount: `${amount} DCC`,
              recipient: addr,
              status: "Broadcast",
            },
            type: "transaction",
          };
        }
        return {
          content: `❌ Transfer failed: ${result.error}`,
          type: "error",
        };
      },
    };
  }

  // ═══════════════════════════════════════════
  // ADDRESS BOOK
  // ═══════════════════════════════════════════

  // Save contact — "save address 3P... as Alice", "add contact Bob 3P..."
  if (/\b(save|add|store)\b/.test(lower) && /\b(address|contact|bookmark)\b/.test(lower)) {
    const addr = extractAddress(input);
    const nameMatch = input.match(/\b(?:as|named?|called?)\s+["']?(\w{2,20})["']?/i) ||
                      input.match(/\b(?:contact|bookmark)\s+["']?(\w{2,20})["']?\s/i);
    return {
      handler: async () => {
        const contactName = nameMatch?.[1];
        if (!addr || !contactName) {
          return {
            content: `To save a contact, use:\n\n**"Save address 3P... as Alice"**\n**"Add contact Bob 3P..."**`,
            type: "text",
          };
        }
        const entry = addContact(contactName, addr);
        return {
          content: `📇 Contact saved!\n\n**${entry.name}** → \`${entry.address}\`\n\nYou can now use **"send 10 DCC to ${entry.name}"** or **"balance of ${entry.name}"** instead of typing the full address.`,
          type: "text",
        };
      },
    };
  }

  // List contacts — "my contacts", "address book", "contacts"
  if (/\b(contacts?|address\s*book|my\s*contacts|saved\s*address|bookmarks?)\b/.test(lower) && !/\b(save|add|store|remove|delete)\b/.test(lower)) {
    return {
      handler: async () => {
        const contacts = loadAddressBook();
        if (contacts.length === 0) {
          return {
            content: `Your address book is empty.\n\nSave one with: **"Save address 3P... as Alice"**`,
            type: "text",
          };
        }
        const lines = contacts.map(c => `• **${c.name}** → \`${c.address}\``).join("\n");
        return {
          content: `📇 **Address Book** (${contacts.length})\n\n${lines}`,
          data: { contacts: contacts.map(c => ({ name: c.name, address: c.address })) },
          type: "text",
        };
      },
    };
  }

  // Remove contact — "remove contact Alice", "delete address Bob"
  if (/\b(remove|delete)\b/.test(lower) && /\b(contact|address|bookmark)\b/.test(lower)) {
    const nameMatch = input.match(/\b(?:contact|address|bookmark)\s+["']?(\w{2,20})["']?\b/i);
    return {
      handler: async () => {
        const contactName = nameMatch?.[1];
        if (!contactName) {
          return { content: `Specify a contact name, e.g. **"Remove contact Alice"**`, type: "text" };
        }
        const removed = removeContact(contactName);
        return {
          content: removed ? `Removed **${contactName}** from your address book.` : `No contact named **${contactName}** found.`,
          type: "text",
        };
      },
    };
  }

  // ═══════════════════════════════════════════
  // MACROS / SCRIPTS
  // ═══════════════════════════════════════════

  // Save macro — "save macro morning as wallet && portfolio && my automations"
  if (/\b(save|record|create)\s+(macro|script)\b/.test(lower)) {
    const m = input.match(/\b(?:save|record|create)\s+(?:macro|script)\s+(\w{1,30})\s+(?:as|=|:)\s+(.+)/i);
    return {
      handler: async () => {
        if (!m) {
          return { content: `Usage: **"Save macro morning as wallet && portfolio"**`, type: "text" };
        }
        const name = m[1];
        const cmds = m[2].split(/&&|;/).map(c => c.trim()).filter(Boolean);
        if (cmds.length === 0) {
          return { content: `Provide commands separated by **&&** or **;**.`, type: "text" };
        }
        const macro = saveMacro(name, cmds);
        return {
          content: `💾 Saved macro **${macro.name}** with **${cmds.length}** commands:\n${cmds.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}`,
          type: "text",
        };
      },
    };
  }

  // Run macro — "run macro morning", "play morning"
  if (/\b(run|play|exec|execute)\s+(macro|script)\s+(\w{1,30})\b/.test(lower)) {
    const nameMatch = lower.match(/\b(?:run|play|exec|execute)\s+(?:macro|script)\s+(\w{1,30})\b/);
    return {
      handler: async () => {
        const name = nameMatch?.[1];
        if (!name) return { content: `Specify a macro name, e.g. **"Run macro morning"**.`, type: "text" };
        const macro = getMacro(name);
        if (!macro) return { content: `No macro named **${name}**. Type **"My macros"** to list them.`, type: "text" };
        // Return a special marker that TerminalChat will interpret as batch execution
        return {
          content: `▶️ Running macro **${macro.name}** (${macro.commands.length} commands)…`,
          data: { runMacro: true, commands: macro.commands },
          type: "text",
        };
      },
    };
  }

  // Delete macro — "delete macro morning"
  if (/\b(delete|remove)\s+(macro|script)\s+(\w{1,30})\b/.test(lower)) {
    const nameMatch = lower.match(/\b(?:delete|remove)\s+(?:macro|script)\s+(\w{1,30})\b/);
    return {
      handler: async () => {
        const name = nameMatch?.[1];
        if (!name) return { content: `Specify a macro name.`, type: "text" };
        const removed = deleteMacro(name);
        return { content: removed ? `Deleted macro **${name}**.` : `No macro named **${name}** found.`, type: "text" };
      },
    };
  }

  // List macros — "my macros", "list macros"
  if (/\b(my\s*macro|list\s*macro|show\s*macro|macros?\s*$)\b/.test(lower)) {
    return {
      handler: async () => {
        const macros = loadMacros();
        if (macros.length === 0) {
          return { content: `No macros saved. Try **"Save macro morning as wallet && portfolio"**`, type: "text" };
        }
        const lines = macros.map(m => `• **${m.name}** — ${m.commands.length} commands: \`${m.commands.join(" && ")}\``);
        return {
          content: `📝 **Your Macros** (${macros.length})\n\n${lines.join("\n")}\n\nRun one with **"Run macro [name]"**`,
          type: "text",
        };
      },
    };
  }

  // ═══════════════════════════════════════════
  // WATCHLIST
  // ═══════════════════════════════════════════

  // Add to watchlist — "watch DCC_USDT", "watch token abc123", "track address 3P..."
  if (/\b(watch|track|follow|monitor)\b/.test(lower) && !/\b(my\s*watch|list\s*watch|show\s*watch)\b/.test(lower) && !/\b(unwatch|remove|stop)\b/.test(lower)) {
    return {
      handler: async () => {
        const addr = extractAddress(input);
        const poolMatch = input.match(/\b([A-Z0-9]{3,10}_[A-Z0-9]{3,10})\b/i);
        const tokenMatch = input.match(/\b(watch|track|follow|monitor)\s+(?:token\s+)?([A-Za-z0-9]{8,44})\b/i);

        if (addr) {
          const item = addToWatchlist("address", addr.slice(0, 8) + "…", addr);
          return { content: `👁 Added address \`${addr}\` to your watchlist.`, data: { watchlistId: item.id }, type: "text" };
        }
        if (poolMatch) {
          const key = poolMatch[1].toUpperCase();
          const item = addToWatchlist("pool", key, key);
          return { content: `👁 Watching pool **${key}**.`, data: { watchlistId: item.id }, type: "text" };
        }
        if (tokenMatch) {
          const val = tokenMatch[2];
          const item = addToWatchlist("token", val.slice(0, 10), val);
          return { content: `👁 Watching token \`${val}\`.`, data: { watchlistId: item.id }, type: "text" };
        }
        return { content: `Specify what to watch, e.g. **"Watch DCC_USDT"** or **"Watch address 3P..."**`, type: "text" };
      },
    };
  }

  // Remove from watchlist — "unwatch DCC_USDT", "stop watching 3P..."
  if (/\b(unwatch|untrack|unfollow|stop\s*watch)\b/.test(lower) || (/\b(remove|delete)\b/.test(lower) && /\bwatch/i.test(lower))) {
    return {
      handler: async () => {
        const addr = extractAddress(input);
        const poolMatch = input.match(/\b([A-Z0-9]{3,10}_[A-Z0-9]{3,10})\b/i);
        const key = addr || (poolMatch ? poolMatch[1].toUpperCase() : null);
        if (!key) return { content: `Specify what to unwatch, e.g. **"Unwatch DCC_USDT"**.`, type: "text" };
        const removed = removeFromWatchlist(key);
        return { content: removed ? `Removed from watchlist.` : `Not found in your watchlist.`, type: "text" };
      },
    };
  }

  // List watchlist — "my watchlist", "show watched", "watchlist"
  if (/\b(my\s*watch|show\s*watch|list\s*watch|watchlist)\b/.test(lower)) {
    return {
      handler: async () => {
        const items = loadWatchlist();
        if (items.length === 0) {
          return { content: `Your watchlist is empty. Try **"Watch DCC_USDT"** or **"Watch address 3P..."**`, type: "text" };
        }
        const icons: Record<string, string> = { token: "🪙", address: "📍", pool: "💧" };
        const lines = items.map((i) => `• ${icons[i.type] || "•"} **${i.label}** (${i.type}) — \`${i.value.length > 20 ? i.value.slice(0, 20) + "…" : i.value}\``);
        return {
          content: `👁 **Your Watchlist** — ${items.length} items\n\n${lines.join("\n")}`,
          type: "text",
        };
      },
    };
  }

  // ═══════════════════════════════════════════
  // VALIDATOR / GENERATOR INFO
  // ═══════════════════════════════════════════

  // Top generators — "top generators", "block producers", "validators", "who mines"
  if (/\b(top\s*generator|block\s*producer|who\s*mine|who\s*generat|mining\s*info|miner|generator\s*stat|validators?\s*info)\b/.test(lower)) {
    return {
      handler: async () => {
        const height = await getBlockHeight();
        const lookback = 100;
        const blockPromises = [];
        const startHeight = Math.max(1, height - lookback + 1);
        // Fetch last 100 blocks to count generators
        for (let h = startHeight; h <= height; h++) {
          blockPromises.push(getLastBlockHeader().catch(() => null));
        }
        // Use a smarter approach: fetch blocks sequentially in small batches
        const generatorCounts: Record<string, number> = {};
        for (let h = startHeight; h <= Math.min(startHeight + 19, height); h++) {
          try {
            const block = await getBlockAtHeight(h);
            const gen = (block as unknown as Record<string, unknown>).generator as string;
            if (gen) generatorCounts[gen] = (generatorCounts[gen] || 0) + 1;
          } catch { /* skip */ }
        }

        const sorted = Object.entries(generatorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        if (sorted.length === 0) {
          return { content: `Could not determine top generators from recent blocks.`, type: "text" };
        }
        const lines = sorted.map(([addr, count], i) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          return `${medal} \`${addr.slice(0, 10)}…${addr.slice(-4)}\` — **${count}** blocks`;
        });

        return {
          content:
            `⚡ **Top Block Generators** (last 20 blocks)\n\n` +
            lines.join("\n") +
            `\n\nHeight: **${height.toLocaleString()}** | Scanned: 20 blocks`,
          type: "text",
        };
      },
    };
  }

  // Validator balance check — "validator balance 3P..."
  if (/\b(validator|generator|miner)\b/.test(lower) && /\b(balance|info|detail|stat)\b/.test(lower)) {
    const addr = extractAddress(input);
    return {
      handler: async () => {
        if (!addr) {
          return { content: `Provide a validator address, e.g. **"Validator info 3P..."**`, type: "text" };
        }
        const [genBal, addrBal] = await Promise.all([
          getGeneratingBalance(addr).catch(() => null),
          getAddressBalance(addr).catch(() => null),
        ]);
        return {
          content:
            `⚡ **Validator Info** — \`${addr}\`\n\n` +
            `Regular balance: **${addrBal?.regular?.toFixed(4) ?? "?"} DCC**\n` +
            `Effective balance: **${addrBal?.effective?.toFixed(4) ?? "?"} DCC**\n` +
            `Generating balance: **${genBal?.toFixed(4) ?? "?"} DCC**\n\n` +
            `*Generating balance must be ≥ 1000 DCC to generate blocks.*`,
          data: formatObj({ address: addr, generatingBalance: genBal, ...addrBal }),
          type: "text",
        };
      },
    };
  }

  // ═══════════════════════════════════════════
  // DCC LIQUID STAKING
  // ═══════════════════════════════════════════

  // Staking overview / status — "staking", "staking status", "staking info", "liquid staking", "stDCC"
  if (
    (/\b(staking|liquid\s*stak|stdcc|staked\s*dcc)\b/.test(lower) &&
     !/\b(lease|cancel|stop|unstake|withdraw|deposit|estimate|reward|validator|my\s+stak|how\s*much)\b/.test(lower) &&
     !/\b(\d)/.test(lower)) ||
    /\b(staking\s*(status|info|overview|stats|protocol|state|details|health))\b/.test(lower)
  ) {
    return {
      handler: async () => {
        try {
          const [snap, rate, vals, health] = await Promise.all([
            getProtocolSnapshot().catch(() => null),
            getLiveExchangeRate().catch(() => null),
            getValidators().catch(() => []),
            getStakingHealth().catch(() => ({ status: "unknown" })),
          ]);
          if (!snap) {
            return { content: `⚠️ Staking API is currently unavailable. Try again later.`, type: "error" };
          }
          const activeVals = vals.filter(v => v.active).length;
          return {
            content:
              `🥩 **DCC Liquid Staking Protocol**\n\n` +
              `Status: **${health.status === "ok" ? "🟢 Online" : "🔴 " + health.status}**${snap.paused ? " (⏸ Paused)" : ""}\n\n` +
              `**Protocol Stats:**\n` +
              `• Total Staked: **${(snap.totalStaked / 1e8).toLocaleString()} DCC**\n` +
              `• Total Shares: **${(snap.totalShares / 1e8).toLocaleString()} stDCC**\n` +
              `• Exchange Rate: **1 stDCC = ${rate ? rate.rate.toFixed(6) : snap.exchangeRate.toFixed(6)} DCC**\n` +
              `• Total Users: **${snap.totalUsers.toLocaleString()}**\n` +
              `• Active Validators: **${activeVals || snap.totalValidators}**\n` +
              `• Total Rewards: **${(snap.totalRewards / 1e8).toLocaleString()} DCC**\n` +
              `• Protocol Fee: **${(snap.protocolFee / 100).toFixed(1)}%**\n` +
              `• Min Deposit: **${(snap.minDeposit / 1e8).toFixed(2)} DCC**\n\n` +
              `**Commands:**\n` +
              `• **"Stake 100 DCC"** — Deposit DCC for stDCC\n` +
              `• **"My staking"** — Your staking position\n` +
              `• **"Staking validators"** — Active validators\n` +
              `• **"Estimate stake 100 DCC"** — Preview deposit\n` +
              `• **"Staking rewards"** — Reward history`,
            data: {
              totalStaked: `${(snap.totalStaked / 1e8).toLocaleString()} DCC`,
              exchangeRate: rate ? `1 stDCC = ${rate.rate.toFixed(6)} DCC` : undefined,
              totalUsers: snap.totalUsers,
              validators: activeVals || snap.totalValidators,
              protocolFee: `${(snap.protocolFee / 100).toFixed(1)}%`,
              status: health.status,
            },
            type: "text",
          };
        } catch {
          return { content: `⚠️ Could not reach staking API. Is the staking service running?`, type: "error" };
        }
      },
    };
  }

  // Stake DCC — "stake 100 DCC", "stake 50", "I want to stake 100 DCC", "deposit 100 DCC staking"
  if (
    (/\b(stake|deposit)\b/.test(lower) && /\b(\d+(?:\.\d+)?)\b/.test(lower) && !extractAddress(input)) ||
    (/\b(i\s*want\s*to\s*stake|let\s*me\s*stake|can\s*i\s*stake)\b/.test(lower))
  ) {
    // Don't match "stake to 3P..." (which is leasing)
    if (/\bto\s+3[A-Za-z0-9]{34}\b/.test(input)) {
      // Fall through to leasing
    } else {
      const amount = extractAmount(input);
      return {
        handler: async () => {
          if (!wallet?.isConnected || !wallet.seed) {
            return { content: `⚠️ Wallet not connected. Connect your wallet to stake DCC.`, type: "error" };
          }
          if (!amount || amount <= 0) {
            return {
              content: `To stake DCC, specify an amount:\n\n**"Stake 100 DCC"**\n\nThis deposits your DCC into the liquid staking protocol and you receive stDCC in return.`,
              type: "text",
            };
          }
          // Check min deposit
          let minDeposit = 0;
          try {
            const snap = await getProtocolSnapshot();
            minDeposit = snap.minDeposit / 1e8;
            if (amount < minDeposit) {
              return { content: `⚠️ Minimum deposit is **${minDeposit.toFixed(2)} DCC**. Please stake at least that amount.`, type: "error" };
            }
          } catch { /* proceed anyway */ }

          const result = await stakeDCC(wallet.seed, amount);
          if (result.success) {
            return {
              content: `✅ **Staked ${amount} DCC successfully!**\n\nTransaction ID: \`${result.id}\`\n\nYou will receive stDCC tokens representing your stake. Use **"my staking"** to check your position.`,
              data: { txId: result.id, amount: `${amount} DCC`, status: "Broadcast" },
              type: "transaction",
            };
          }
          return { content: `❌ Staking failed: ${result.error}`, type: "error" };
        },
      };
    }
  }

  // Estimate deposit — "estimate stake 100 DCC", "how much stDCC for 100 DCC", "preview stake 50"
  if (
    (/\b(estimate|preview|simulate|how\s*much\s*stdcc|what.*get.*stak)\b/.test(lower) && /\b(stak|deposit|stdcc)\b/.test(lower)) ||
    (/\bhow\s*much\b/.test(lower) && /\bstdcc\b/.test(lower))
  ) {
    const amount = extractAmount(input);
    return {
      handler: async () => {
        if (!amount || amount <= 0) {
          return { content: `Specify an amount, e.g. **"Estimate stake 100 DCC"**`, type: "text" };
        }
        try {
          const est = await estimateDeposit(amount * 1e8);
          return {
            content:
              `📊 **Deposit Estimate for ${amount} DCC:**\n\n` +
              `• You will receive: **${(est.sharesOut / 1e8).toFixed(4)} stDCC**\n` +
              `• Exchange rate: **1 DCC = ${(1 / est.exchangeRate).toFixed(6)} stDCC**\n` +
              `• Protocol fee: **${(est.fee / 1e8).toFixed(4)} DCC**\n\n` +
              `Ready? Say **"Stake ${amount} DCC"** to proceed.`,
            data: { amountIn: `${amount} DCC`, sharesOut: `${(est.sharesOut / 1e8).toFixed(4)} stDCC`, exchangeRate: est.exchangeRate, fee: `${(est.fee / 1e8).toFixed(4)} DCC` },
            type: "text",
          };
        } catch {
          return { content: `⚠️ Could not estimate deposit. Staking API may be unavailable.`, type: "error" };
        }
      },
    };
  }

  // Estimate withdrawal — "estimate unstake 100 stDCC", "estimate withdraw 50 shares"
  if (/\b(estimate|preview|simulate)\b/.test(lower) && /\b(unstake|withdraw|redeem|exit)\b/.test(lower)) {
    const amount = extractAmount(input);
    return {
      handler: async () => {
        if (!amount || amount <= 0) {
          return { content: `Specify shares to withdraw, e.g. **"Estimate unstake 100 stDCC"**`, type: "text" };
        }
        try {
          const est = await estimateWithdraw(amount * 1e8);
          return {
            content:
              `📊 **Withdrawal Estimate for ${amount} stDCC:**\n\n` +
              `• You will receive: **${(est.amountOut / 1e8).toFixed(4)} DCC**\n` +
              `• Exchange rate: **1 stDCC = ${est.exchangeRate.toFixed(6)} DCC**\n` +
              `• Protocol fee: **${(est.fee / 1e8).toFixed(4)} DCC**\n` +
              `• Pending duration: **${est.pendingDuration}**`,
            data: { sharesIn: `${amount} stDCC`, amountOut: `${(est.amountOut / 1e8).toFixed(4)} DCC`, exchangeRate: est.exchangeRate, fee: `${(est.fee / 1e8).toFixed(4)} DCC` },
            type: "text",
          };
        } catch {
          return { content: `⚠️ Could not estimate withdrawal. Staking API may be unavailable.`, type: "error" };
        }
      },
    };
  }

  // My staking position — "my staking", "my stake", "staking position", "staking balance"
  if (/\b(my\s+(stak|stake|stdcc)|staking\s+(position|balance|portfolio)|how\s*much.*staked)\b/.test(lower)) {
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.address) {
          return { content: `⚠️ Connect your wallet to view your staking position.`, type: "error" };
        }
        try {
          const user = await getStakingUser(wallet.address);
          if (!user || user.shares === 0) {
            return {
              content: `You don't have any staked DCC yet.\n\nStake DCC to earn rewards: **"Stake 100 DCC"**`,
              type: "text",
            };
          }
          const profit = user.currentValue - user.deposited;
          return {
            content:
              `🥩 **Your Staking Position**\n\n` +
              `• Deposited: **${(user.deposited / 1e8).toFixed(4)} DCC**\n` +
              `• stDCC Shares: **${(user.shares / 1e8).toFixed(4)}**\n` +
              `• Current Value: **${(user.currentValue / 1e8).toFixed(4)} DCC**\n` +
              `• Rewards Earned: **${profit > 0 ? "+" : ""}${(profit / 1e8).toFixed(4)} DCC**\n` +
              `• Lifetime Rewards: **+${(user.rewards / 1e8).toFixed(4)} DCC**`,
            data: {
              deposited: `${(user.deposited / 1e8).toFixed(4)} DCC`,
              shares: `${(user.shares / 1e8).toFixed(4)} stDCC`,
              currentValue: `${(user.currentValue / 1e8).toFixed(4)} DCC`,
              rewards: `+${(user.rewards / 1e8).toFixed(4)} DCC`,
            },
            type: "text",
          };
        } catch {
          return { content: `⚠️ Could not fetch staking position. Staking API may be unavailable.`, type: "error" };
        }
      },
    };
  }

  // Staking validators — "staking validators", "list validators", "who validates"
  if (
    (/\b(staking\s*validator|list\s*validator|show\s*validator|active\s*validator|all\s*validator|who\s*validates)\b/.test(lower)) ||
    (lower === "validators")
  ) {
    return {
      handler: async () => {
        try {
          const vals = await getValidators();
          if (vals.length === 0) {
            return { content: `No validators found in the staking protocol.`, type: "text" };
          }
          const active = vals.filter(v => v.active);
          const lines = vals.slice(0, 10).map((v, i) => {
            const status = v.active ? "🟢" : "⚪";
            const name = v.name || v.address.slice(0, 12) + "…";
            return `${status} **${name}** — ${(v.totalLeased / 1e8).toLocaleString()} DCC leased`;
          });
          return {
            content:
              `**Staking Validators** (${active.length} active / ${vals.length} total)\n\n` +
              lines.join("\n") +
              (vals.length > 10 ? `\n\n...and ${vals.length - 10} more` : ""),
            data: { validators: vals.map(v => ({ address: v.address, name: v.name, totalLeased: (v.totalLeased / 1e8).toFixed(0) + " DCC", active: v.active })) },
            type: "text",
          };
        } catch {
          return { content: `⚠️ Could not fetch validators. Staking API may be unavailable.`, type: "error" };
        }
      },
    };
  }

  // Staking exchange rate — "stDCC rate", "exchange rate staking", "stDCC price"
  if (/\b(stdcc\s*(rate|price|value|exchange)|exchange\s*rate\s*(stdcc|staking)|staking\s*rate)\b/.test(lower)) {
    return {
      handler: async () => {
        try {
          const rate = await getLiveExchangeRate();
          return {
            content:
              `💱 **stDCC Exchange Rate**\n\n` +
              `• 1 stDCC = **${rate.rate.toFixed(6)} DCC**\n` +
              `• 1 DCC = **${rate.inverse.toFixed(6)} stDCC**\n\n` +
              `Updated: ${new Date(rate.timestamp).toLocaleString()}`,
            data: { rate: rate.rate, inverse: rate.inverse },
            type: "text",
          };
        } catch {
          return { content: `⚠️ Could not fetch exchange rate.`, type: "error" };
        }
      },
    };
  }

  // Staking rewards — "staking rewards", "reward history"
  if (/\b(staking\s*reward|reward\s*(history|sync)|reward\s*log)\b/.test(lower)) {
    return {
      handler: async () => {
        try {
          const rewards = await getRewardHistory();
          if (!rewards || rewards.length === 0) {
            return { content: `No reward sync history found yet.`, type: "text" };
          }
          const lines = rewards.slice(0, 10).map((r, i) => {
            const amt = typeof r.amount === "number" ? (r.amount / 1e8).toFixed(4) : "—";
            const ts = typeof r.timestamp === "number" ? new Date(r.timestamp).toLocaleString() : "";
            return `**${i + 1}.** ${amt} DCC ${ts ? `— ${ts}` : ""}`;
          });
          return {
            content: `🏆 **Reward Sync History** (${rewards.length} records)\n\n${lines.join("\n")}${rewards.length > 10 ? `\n\n...and ${rewards.length - 10} more` : ""}`,
            type: "text",
          };
        } catch {
          return { content: `⚠️ Could not fetch reward history.`, type: "error" };
        }
      },
    };
  }

  // My staking deposits — "my staking deposits", "deposit history staking"
  if (/\b(staking\s*deposit|my\s*deposit.*stak|deposit\s*history\s*stak)\b/.test(lower)) {
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.address) {
          return { content: `⚠️ Connect your wallet to view deposit history.`, type: "error" };
        }
        try {
          const deposits = await getUserDeposits(wallet.address);
          if (!deposits || deposits.length === 0) {
            return { content: `No staking deposits found. Start with **"Stake 100 DCC"**`, type: "text" };
          }
          const lines = deposits.slice(0, 10).map((d, i) => {
            const amt = typeof d.amount === "number" ? (d.amount / 1e8).toFixed(4) : "—";
            const ts = typeof d.timestamp === "number" ? new Date(d.timestamp).toLocaleString() : "";
            return `**${i + 1}.** ${amt} DCC ${ts ? `— ${ts}` : ""}`;
          });
          return {
            content: `📥 **Your Staking Deposits** (${deposits.length})\n\n${lines.join("\n")}`,
            type: "text",
          };
        } catch {
          return { content: `⚠️ Could not fetch deposit history.`, type: "error" };
        }
      },
    };
  }

  // My staking withdrawals — "my staking withdrawals", "withdrawal history"
  if (/\b(staking\s*withdraw|my\s*withdraw.*stak|withdraw.*history\s*stak|pending\s*withdraw)\b/.test(lower)) {
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.address) {
          return { content: `⚠️ Connect your wallet to view withdrawal history.`, type: "error" };
        }
        try {
          const withdrawals = await getUserWithdrawals(wallet.address);
          if (!withdrawals || withdrawals.length === 0) {
            return { content: `No staking withdrawals found.`, type: "text" };
          }
          const lines = withdrawals.slice(0, 10).map((w, i) => {
            const amt = typeof w.amount === "number" ? (w.amount / 1e8).toFixed(4) : "—";
            const status = typeof w.status === "string" ? w.status : "—";
            return `**${i + 1}.** ${amt} DCC — ${status}`;
          });
          return {
            content: `📤 **Your Staking Withdrawals** (${withdrawals.length})\n\n${lines.join("\n")}`,
            type: "text",
          };
        } catch {
          return { content: `⚠️ Could not fetch withdrawal history.`, type: "error" };
        }
      },
    };
  }

  // Top stakers — "top stakers", "top staking users", "biggest stakers"
  if (/\b(top\s*(staker|user.*stak)|biggest\s*staker|largest\s*staker|staking\s*leaderboard)\b/.test(lower)) {
    return {
      handler: async () => {
        try {
          const users = await getTopUsers();
          if (!users || users.length === 0) {
            return { content: `No staking users found yet.`, type: "text" };
          }
          const lines = users.slice(0, 10).map((u, i) => {
            const addr = u.address.slice(0, 8) + "…" + u.address.slice(-4);
            return `**${i + 1}.** \`${addr}\` — ${(u.currentValue / 1e8).toLocaleString()} DCC (${(u.shares / 1e8).toFixed(2)} stDCC)`;
          });
          return {
            content: `🏆 **Top Stakers**\n\n${lines.join("\n")}`,
            type: "text",
          };
        } catch {
          return { content: `⚠️ Could not fetch top stakers.`, type: "error" };
        }
      },
    };
  }

  // ═══════════════════════════════════════════
  // LEASING / GOVERNANCE
  // ═══════════════════════════════════════════

  // Start lease — "lease 1000 DCC to 3P..."
  if (/\b(lease|delegate|stake)\b/.test(lower) && /\b(to|start|begin|create)\b/.test(lower) && !/\b(cancel|stop|end)\b/.test(lower)) {
    const amount = extractAmount(input);
    const addr = extractAddress(input);
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.seed) {
          return { content: `⚠️ Wallet not connected. Connect your wallet to start leasing.`, type: "error" };
        }
        if (!amount || !addr) {
          return {
            content: `To lease DCC, specify amount and recipient node:\n\n**"Lease 1000 DCC to 3P..."**\n\nLeasing increases the node's generating balance without giving up your DCC.`,
            type: "text",
          };
        }
        const result = await startLease(wallet.seed, addr, amount);
        if (result.success) {
          return {
            content: `✅ Lease started!\n\n**${amount} DCC** leased to \`${addr}\`\nLease ID: \`${result.id}\`\n\nUse **"cancel lease ${result.id.slice(0, 8)}..."** to stop.`,
            data: { txId: result.id, amount: `${amount} DCC`, recipient: addr, status: "Broadcast" },
            type: "transaction",
          };
        }
        return { content: `❌ Lease failed: ${result.error}`, type: "error" };
      },
    };
  }

  // Cancel lease — "cancel lease [leaseId]"
  if (/\b(cancel|stop|end|terminate)\b/.test(lower) && /\b(lease|leasing)\b/.test(lower)) {
    const leaseId = extractTxId(input);
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.seed) {
          return { content: `⚠️ Wallet not connected. Connect your wallet first.`, type: "error" };
        }
        if (!leaseId) {
          return { content: `Provide a lease ID, e.g. **"Cancel lease [leaseId]"**`, type: "text" };
        }
        const result = await stopLease(wallet.seed, leaseId);
        if (result.success) {
          return {
            content: `✅ Lease cancelled!\nTransaction ID: \`${result.id}\``,
            data: { txId: result.id, status: "Broadcast" },
            type: "transaction",
          };
        }
        return { content: `❌ Cancel lease failed: ${result.error}`, type: "error" };
      },
    };
  }

  // My leases — "my leases", "active leases", "leasing status"
  if (/\b(my\s+leases?|active\s+leases?|leasing\s*status|show\s+leases?)\b/.test(lower)) {
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.address) {
          return { content: `No wallet connected. Connect to view your leases.`, type: "text" };
        }
        const [leases, genBal] = await Promise.all([
          getActiveLeases(wallet.address).catch(() => []),
          getGeneratingBalance(wallet.address).catch(() => 0),
        ]);
        if (leases.length === 0) {
          return {
            content: `No active leases found.\n\nGenerating balance: **${genBal.toFixed(4)} DCC**\n\nStart one with: **"Lease 1000 DCC to 3P..."**`,
            type: "text",
          };
        }
        const total = leases.reduce((sum, l) => sum + ((l.amount as number) ?? 0), 0) / 1e8;
        const lines = leases.slice(0, 10).map((l, i) => {
          const amt = ((l.amount as number) / 1e8).toFixed(4);
          const to = (l.recipient as string) ?? "unknown";
          return `**${i + 1}.** ${amt} DCC → \`${to.slice(0, 8)}…\` | ID: \`${(l.id as string).slice(0, 8)}…\``;
        });
        return {
          content:
            `📊 **Active Leases** (${leases.length})\n\n` +
            `Total leased: **${total.toFixed(4)} DCC**\n` +
            `Generating balance: **${genBal.toFixed(4)} DCC**\n\n` +
            `${lines.join("\n")}${leases.length > 10 ? `\n\n...and ${leases.length - 10} more` : ""}`,
          type: "text",
        };
      },
    };
  }

  // Governance info — "governance", "dcc governance", "how does governance work"
  if (/\b(governance|voting|proposal|govern)\b/.test(lower)) {
    return {
      handler: async () => ({
        content:
          `🏛️ **DCC Governance**\n\n` +
          `DecentralChain uses Leased Proof-of-Stake (LPoS) for consensus.\n\n` +
          `**How it works:**\n` +
          `• Lease your DCC to a generating node to increase its mining power\n` +
          `• Your DCC stays in your wallet — you never lose control\n` +
          `• Nodes share block rewards with their lessors\n` +
          `• Minimum 1000 DCC effective balance to generate blocks\n\n` +
          `**Commands:**\n` +
          `• **"Lease 1000 DCC to 3P..."** — Start leasing\n` +
          `• **"My leases"** — View active leases\n` +
          `• **"Cancel lease [id]"** — Stop leasing\n` +
          `• **"Top generators"** — See active block generators`,
        type: "text",
      }),
    };
  }

  // ═══════════════════════════════════════════
  // NFT SUPPORT
  // ═══════════════════════════════════════════

  // List my NFTs — "my nfts", "show nfts", "nft collection"
  if (/\b(my\s*nft|show\s*nft|list\s*nft|nft\s*collection|nfts?\s*$)\b/.test(lower) && !extractAddress(input)) {
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.address) {
          return { content: `⚠️ Connect your wallet to view your NFTs.`, type: "error" };
        }
        const nfts = await getNFTs(wallet.address);
        if (nfts.length === 0) {
          return { content: `No NFTs found in your wallet. You can create one with **"Create token MyNFT 1 supply 0 decimals"**`, type: "text" };
        }
        const lines = nfts.slice(0, 20).map((n, i) =>
          `${i + 1}. **${n.name || "Unnamed"}** — \`${String(n.assetId).slice(0, 16)}…\`${n.description ? ` — ${String(n.description).slice(0, 40)}` : ""}`
        );
        return {
          content:
            `🖼 **Your NFTs** — ${nfts.length} found\n\n` +
            lines.join("\n") +
            (nfts.length > 20 ? `\n\n...and ${nfts.length - 20} more` : ""),
          type: "text",
        };
      },
    };
  }

  // NFTs for address — "nfts of 3P...", "nft 3P..."
  if (/\bnft/i.test(lower) && extractAddress(input)) {
    const addr = extractAddress(input)!;
    return {
      handler: async () => {
        const nfts = await getNFTs(addr);
        if (nfts.length === 0) {
          return { content: `No NFTs found for \`${addr}\`.`, type: "text" };
        }
        const lines = nfts.slice(0, 20).map((n, i) =>
          `${i + 1}. **${n.name || "Unnamed"}** — \`${String(n.assetId).slice(0, 16)}…\``
        );
        return {
          content: `🖼 **NFTs** for \`${addr}\` — ${nfts.length} found\n\n${lines.join("\n")}`,
          type: "text",
        };
      },
    };
  }

  // ═══════════════════════════════════════════
  // DAPP SCRIPT INTERACTION
  // ═══════════════════════════════════════════

  // Read dApp data — "dApp data 3P...", "read contract 3P...", "script data 3P..."
  if (/\b(dapp|contract|script)\b/.test(lower) && /\b(data|state|read|view|query|storage)\b/.test(lower)) {
    const addr = extractAddress(input);
    return {
      handler: async () => {
        if (!addr) {
          return { content: `Provide a dApp address, e.g. **"dApp data 3P..."**`, type: "text" };
        }
        const data = await getAddressData(addr);
        if (data.length === 0) {
          return { content: `No data entries found for \`${addr}\`. It may not have a script.`, type: "text" };
        }
        const lines = data.slice(0, 20).map(e => {
          const val = typeof e.value === "string" && e.value.length > 40 ? e.value.slice(0, 40) + "…" : e.value;
          return `• **${e.key}** (${e.type}): \`${val}\``;
        });
        return {
          content:
            `📋 **dApp Data** — \`${addr}\`\n\n` +
            `**${data.length}** data entries\n\n` +
            `${lines.join("\n")}${data.length > 20 ? `\n\n...and ${data.length - 20} more entries` : ""}`,
          data: { address: addr, entryCount: data.length },
          type: "text",
        };
      },
    };
  }

  // Script info — "script info 3P...", "is 3P... a dApp"
  if (/\b(script)\b/.test(lower) && /\b(info|details|check|verify|is)\b/.test(lower)) {
    const addr = extractAddress(input);
    return {
      handler: async () => {
        if (!addr) {
          return { content: `Provide an address, e.g. **"Script info 3P..."**`, type: "text" };
        }
        const info = await getScriptInfo(addr).catch(() => null);
        if (!info) {
          return { content: `Could not fetch script info for \`${addr}\`.`, type: "error" };
        }
        const hasScript = info.script && String(info.script).length > 0;
        return {
          content:
            `📜 **Script Info** — \`${addr}\`\n\n` +
            `Has script: **${hasScript ? "Yes" : "No"}**\n` +
            `Complexity: **${info.complexity ?? "N/A"}**\n` +
            `Extra fee: **${info.extraFee ?? 0}**`,
          data: formatObj(info),
          type: "text",
        };
      },
    };
  }

  // ═══════════════════════════════════════════
  // TOKEN CREATION / MINTING / BURNING
  // ═══════════════════════════════════════════

  // Create / issue a new token
  if (
    /\b(create|issue|make|launch|deploy|generate|new)\b/.test(lower) &&
    /\b(token|coin|asset|nft|currency)\b/.test(lower)
  ) {
    // Parse parameters from natural language
    const parsed = parseTokenParams(input);
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.seed) {
          return {
            content: `⚠️ Wallet not connected. Please connect your wallet first using the **Connect** button in the navbar.\n\nToken creation requires a connected wallet and costs **1 DCC** in fees.`,
            type: "error",
          };
        }
        // If missing required params, show guidance
        if (!parsed.name) {
          return {
            content: `To create a token, I need at least a **name**. Here's how to ask:\n\n` +
              `**"Create a token called MyToken with 1000000 supply and 8 decimals"**\n\n` +
              `**Parameters:**\n` +
              `• **Name** (required) — 4-16 characters\n` +
              `• **Supply** — Total quantity (default: 1,000,000)\n` +
              `• **Decimals** — Decimal places, 0-8 (default: 8)\n` +
              `• **Description** — Token description (default: \"\")\n` +
              `• **Reissuable** — Can more be minted later? (default: yes)\n\n` +
              `**Examples:**\n` +
              `• **"Create token MyToken 1000000 supply 8 decimals"**\n` +
              `• **"Issue a coin called TestCoin with 100 supply and 0 decimals non-reissuable"**\n` +
              `• **"Make a new token GameGold 5000 supply 2 decimals described as In-game currency"**\n\n` +
              `Fee: **1 DCC**`,
            type: "text",
          };
        }
        // Validate name length
        if (parsed.name.length < 4 || parsed.name.length > 16) {
          return {
            content: `Token name must be between **4 and 16 characters**. "${parsed.name}" is ${parsed.name.length} characters.`,
            type: "error",
          };
        }

        const supply = parsed.quantity ?? 1000000;
        const decimals = parsed.decimals ?? 8;
        const description = parsed.description ?? "";
        const reissuable = parsed.reissuable ?? true;

        // Auto-sign: just execute
        if (options?.autoSign) {
          const result = await createToken(wallet.seed, parsed.name, description, supply, decimals, reissuable);
          if (result.success) {
            return {
              content: `⚡ **Auto-signed** — Token created!\n\n**${parsed.name}** has been issued on DecentralChain.`,
              data: {
                txId: result.id,
                name: parsed.name,
                supply: supply.toLocaleString(),
                decimals,
                reissuable: reissuable ? "Yes" : "No",
                description: description || "(none)",
                fee: "1 DCC",
                status: "Broadcast",
              },
              type: "transaction",
            };
          }
          return {
            content: `❌ Token creation failed: ${result.error}`,
            data: result.error ? { error: result.error } : undefined,
            type: "error",
          };
        }

        // Show preview + confirmation prompt
        return {
          content: `Here's what I'll create. Say **"confirm create token ${parsed.name}"** to sign and broadcast:\n\n` +
            `**Token Preview:**`,
          data: {
            name: parsed.name,
            totalSupply: supply.toLocaleString(),
            decimals,
            reissuable: reissuable ? "Yes" : "No",
            description: description || "(none)",
            fee: "1 DCC",
          },
          type: "pool",
        };
      },
    };
  }

  // Confirm token creation — "confirm create token MyToken"
  if (
    /\b(confirm|yes|execute|sign|do\s*it|go\s*ahead)\b/.test(lower) &&
    /\b(create|issue|make)\b/.test(lower) &&
    /\b(token|coin|asset)\b/.test(lower)
  ) {
    const parsed = parseTokenParams(input);
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.seed) {
          return {
            content: `⚠️ Wallet not connected. Please connect your wallet first.`,
            type: "error",
          };
        }
        if (!parsed.name) {
          return {
            content: `Please include the token name, e.g. **"Confirm create token MyToken"**`,
            type: "text",
          };
        }
        const supply = parsed.quantity ?? 1000000;
        const decimals = parsed.decimals ?? 8;
        const description = parsed.description ?? "";
        const reissuable = parsed.reissuable ?? true;

        const result = await createToken(wallet.seed, parsed.name, description, supply, decimals, reissuable);
        if (result.success) {
          return {
            content: `✅ Token **${parsed.name}** created successfully!\n\nAsset ID: \`${result.id}\`\nThis is your token's unique identifier — save it!`,
            data: {
              txId: result.id,
              name: parsed.name,
              supply: supply.toLocaleString(),
              decimals,
              reissuable: reissuable ? "Yes" : "No",
              description: description || "(none)",
              fee: "1 DCC",
              status: "Broadcast",
            },
            type: "transaction",
          };
        }
        return {
          content: `❌ Token creation failed: ${result.error}`,
          data: result.error ? { error: result.error } : undefined,
          type: "error",
        };
      },
    };
  }

  // Mint / reissue more of a token — "mint 5000 more [assetId]" or "mint 5000 Raybean"
  if (
    /\b(mint|reissue)\b/.test(lower) &&
    (/\b(token|coin|asset|more)\b/.test(lower) || extractAssetId(input) || extractAmount(input))
  ) {
    const rawAssetId = extractAssetId(input);
    const amount = extractAmount(input);
    const tokenNameMatch = input.match(/\b(?:mint|reissue)\s+(?:\d+(?:\.\d+)?\s+)?(?:more\s+)?([A-Za-z][A-Za-z0-9]{1,20})(?:\s+tokens?)?\b/i);
    const tokenName = tokenNameMatch ? tokenNameMatch[1] : null;
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.seed) {
          return {
            content: `⚠️ Wallet not connected. Please connect your wallet first.`,
            type: "error",
          };
        }
        if (!amount) {
          return {
            content: `To mint more tokens, provide the **token name** (or asset ID) and **quantity**:\n\n` +
              `**"Mint 5000 Raybean"**\n` +
              `**"Mint 5000 [assetId]"**\n` +
              `**"Reissue 10000 tokens [assetId] with 8 decimals"**`,
            type: "text",
          };
        }

        let assetId = rawAssetId;
        let dec = 8;

        if (!assetId && tokenName && !/^(mint|reissue|token|tokens|coin|coins|asset|more)$/i.test(tokenName)) {
          try {
            const resolved = await resolveToken(tokenName, wallet.address);
            if (!resolved.assetId) {
              return {
                content: `❌ Cannot mint native DCC tokens.`,
                type: "error",
              };
            }
            assetId = resolved.assetId;
            dec = resolved.decimals;
          } catch (e: unknown) {
            return {
              content: `❌ ${e instanceof Error ? e.message : "Could not resolve token name to asset ID."}`,
              type: "error",
            };
          }
        }

        if (!assetId) {
          return {
            content: `To mint more tokens, provide the **token name** (or asset ID) and **quantity**:\n\n` +
              `**"Mint 5000 Raybean"**\n` +
              `**"Mint 5000 [assetId]"**`,
            type: "text",
          };
        }

        const decimalsMatch = /\b(\d)\s*decimal/i.exec(input);
        if (decimalsMatch) dec = parseInt(decimalsMatch[1], 10);
        const reissuable = !/\bnon[- ]?reissuable\b/i.test(input);

        const result = await mintToken(wallet.seed, assetId, amount, dec, reissuable);
        if (result.success) {
          return {
            content: `✅ Minted **${amount.toLocaleString()}** additional tokens!\nAsset: \`${assetId}\`\nTransaction ID: \`${result.id}\``,
            data: {
              txId: result.id,
              assetId,
              mintedAmount: amount.toLocaleString(),
              reissuable: reissuable ? "Yes" : "No",
              status: "Broadcast",
            },
            type: "transaction",
          };
        }
        return {
          content: `❌ Mint failed: ${result.error}`,
          data: result.error ? { error: result.error } : undefined,
          type: "error",
        };
      },
    };
  }

  // Burn tokens — "burn 100 [assetId]" or "burn 10 Raybean tokens"
  if (
    /\b(burn|destroy)\b/.test(lower) &&
    (/\b(token|coin|asset)\b/.test(lower) || extractAssetId(input) || extractAmount(input))
  ) {
    const rawAssetId = extractAssetId(input);
    const amount = extractAmount(input);
    // Try to extract a token name: "burn 10 Raybean tokens" → "Raybean"
    const tokenNameMatch = input.match(/\b(?:burn|destroy)\s+(?:\d+(?:\.\d+)?\s+)?([A-Za-z][A-Za-z0-9]{1,20})(?:\s+tokens?)?\b/i);
    const tokenName = tokenNameMatch ? tokenNameMatch[1] : null;
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.seed) {
          return {
            content: `⚠️ Wallet not connected. Please connect your wallet first.`,
            type: "error",
          };
        }
        if (!amount) {
          return {
            content: `To burn tokens, provide the **token name** (or asset ID) and **quantity**:\n\n` +
              `**"Burn 1000 Raybean"**\n` +
              `**"Burn 500 [assetId]"**\n` +
              `**"Destroy 500 tokens [assetId] with 8 decimals"**`,
            type: "text",
          };
        }

        let assetId = rawAssetId;
        let dec = 8;

        // If no raw asset ID, try resolving the token name
        if (!assetId && tokenName && !/^(burn|destroy|token|tokens|coin|coins|asset)$/i.test(tokenName)) {
          try {
            const resolved = await resolveToken(tokenName, wallet.address);
            if (!resolved.assetId) {
              return {
                content: `❌ Cannot burn native DCC tokens.`,
                type: "error",
              };
            }
            assetId = resolved.assetId;
            dec = resolved.decimals;
          } catch (e: unknown) {
            return {
              content: `❌ ${e instanceof Error ? e.message : "Could not resolve token name to asset ID."}`,
              type: "error",
            };
          }
        }

        if (!assetId) {
          return {
            content: `To burn tokens, provide the **token name** (or asset ID) and **quantity**:\n\n` +
              `**"Burn 1000 Raybean"**\n` +
              `**"Burn 500 [assetId]"**`,
            type: "text",
          };
        }

        const decimalsMatch = /\b(\d)\s*decimal/i.exec(input);
        if (decimalsMatch) dec = parseInt(decimalsMatch[1], 10);

        const result = await burnToken(wallet.seed, assetId, amount, dec);
        if (result.success) {
          return {
            content: `✅ Burned **${amount.toLocaleString()}** tokens!\nAsset: \`${assetId}\`\nTransaction ID: \`${result.id}\``,
            data: {
              txId: result.id,
              assetId,
              burnedAmount: amount.toLocaleString(),
              status: "Broadcast",
            },
            type: "transaction",
          };
        }
        return {
          content: `❌ Burn failed: ${result.error}`,
          data: result.error ? { error: result.error } : undefined,
          type: "error",
        };
      },
    };
  }

  // Clear chat history — "clear history", "clear chat", "reset chat"
  if (/\b(clear|reset|wipe|erase)\b/.test(lower) && /\b(history|chat|conversation|messages|session)\b/.test(lower)) {
    return {
      handler: async () => {
        return {
          content: `🗑 Chat history cleared.`,
          data: { clearHistory: true },
          type: "text",
        };
      },
    };
  }

  // ═══════════════════════════════════════════
  // GAS / FEE ESTIMATOR
  // ═══════════════════════════════════════════

  if (/\b(fee|gas|cost)\b/.test(lower) && /\b(estimat|calculat|how\s*much|what|check|show)\b/.test(lower)) {
    return {
      handler: async () => {
        const fees: Record<string, string> = {
          "Transfer": "0.001 DCC",
          "Issue (create token)": "1 DCC",
          "Reissue (mint)": "1 DCC",
          "Burn": "0.001 DCC",
          "Lease": "0.001 DCC",
          "Cancel Lease": "0.001 DCC",
          "Mass Transfer": "0.001 + 0.0005 per recipient DCC",
          "Data Transaction": "0.001 DCC per KB",
          "Set Script (dApp)": "0.01 DCC",
          "Invoke Script": "0.005 DCC",
          "Sponsorship": "1 DCC",
          "Set Asset Script": "1 DCC",
        };
        const lines = Object.entries(fees).map(([k, v]) => `• **${k}** → ${v}`);

        // Check if user asked about a specific tx type
        let specific = "";
        if (/\btransfer|send\b/.test(lower)) specific = `A **transfer** costs **0.001 DCC**.\n\n`;
        else if (/\bissue|create\s*token\b/.test(lower)) specific = `**Creating a token** costs **1 DCC**.\n\n`;
        else if (/\bswap|invoke\b/.test(lower)) specific = `A **swap** (invoke script) costs **0.005 DCC** base + dApp extra fee.\n\n`;
        else if (/\blease|delegate\b/.test(lower)) specific = `A **lease** costs **0.001 DCC**.\n\n`;

        return {
          content:
            `⛽ **DCC Fee Schedule**\n\n` +
            specific +
            lines.join("\n") +
            `\n\n*Fees are fixed per transaction type on DecentralChain.*`,
          type: "text",
        };
      },
    };
  }

  // ═══════════════════════════════════════════
  // EXPORT & REPORTING
  // ═══════════════════════════════════════════

  // Export chat history — "export chat", "download history", "save conversation"
  if (/\b(export|download|save)\b/.test(lower) && /\b(chat|history|conversation|messages|session|log)\b/.test(lower)) {
    return {
      handler: async () => {
        const format = /\bjson\b/.test(lower) ? "json" : "csv";
        return {
          content: `📥 Exporting chat history as **${format.toUpperCase()}**...`,
          data: { exportType: "chat", format },
          type: "text",
        };
      },
    };
  }

  // Export portfolio — "export portfolio", "download holdings"
  if (/\b(export|download|save)\b/.test(lower) && /\b(portfolio|holdings|balance|wallet|assets)\b/.test(lower)) {
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.address) {
          return { content: `⚠️ Connect your wallet first to export portfolio data.`, type: "error" };
        }
        const format = /\bjson\b/.test(lower) ? "json" : "csv";
        const [balRes, assetRes] = await Promise.all([
          getAddressBalance(wallet.address).catch(() => null),
          getAssetBalances(wallet.address).catch(() => []),
        ]);
        const holdings: { asset: string; balance: number }[] = [];
        if (balRes) holdings.push({ asset: "DCC", balance: balRes.available });
        if (Array.isArray(assetRes)) {
          for (const a of assetRes) {
            const decimals = a.issueTransaction?.decimals ?? 8;
            const name = a.issueTransaction?.name ?? String(a.assetId).slice(0, 12) + "…";
            holdings.push({ asset: name, balance: a.balance / Math.pow(10, decimals) });
          }
        }
        return {
          content: `📥 Exporting portfolio (**${holdings.length}** assets) as **${format.toUpperCase()}**...`,
          data: { exportType: "portfolio", format, holdings },
          type: "text",
        };
      },
    };
  }

  // Export transactions — "export transactions", "download tx history"
  if (/\b(export|download|save)\b/.test(lower) && /\b(transaction|tx|transfers)\b/.test(lower)) {
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.address) {
          return { content: `⚠️ Connect your wallet first to export transactions.`, type: "error" };
        }
        const format = /\bjson\b/.test(lower) ? "json" : "csv";
        const txs = await getAddressTransactions(wallet.address, 100).catch(() => []);
        return {
          content: `📥 Exporting **${txs.length}** transactions as **${format.toUpperCase()}**...`,
          data: { exportType: "transactions", format, transactions: txs },
          type: "text",
        };
      },
    };
  }

  // ═══════════════════════════════════════════
  // HELP
  // ═══════════════════════════════════════════

  if (/\b(help|commands|what can|how to|guide|tutorial)\b/.test(lower)) {
    return {
      handler: async () => ({
        content: `Here's everything I can do:\n\n` +
          `**⛓ Blockchain**\n` +
          `• **"Block height"** — Current chain height\n` +
          `• **"Latest block"** — Last block details\n` +
          `• **"Block #1000"** — Look up a specific block\n` +
          `• **"Balance of 3P..."** — Address balance\n` +
          `• **"Network status"** — Overview & stats\n` +
          `• **"Peers"** — Connected nodes\n` +
          `• **"Node version"** — Software version\n` +
          `• **"Tx [id]"** — Transaction details\n\n` +
          `**🌉 Bridge (SOL ⇄ DCC)**\n` +
          `• **"Bridge"** — How the bridge works\n` +
          `• **"Bridge status"** — Bridge health\n` +
          `• **"Bridge limits"** — Min/max deposits\n` +
          `• **"Bridge fees"** — Fee structure\n` +
          `• **"Bridge quote 10 SOL"** — Conversion estimate\n` +
          `• **"Bridge stats"** — Aggregate statistics\n` +
          `• **"Bridge history 3P..."** — Order history\n\n` +
          `**💱 DCC Swap (AMM)**\n` +
          `• **"Swap"** — How the AMM works\n` +
          `• **"List pools"** — All liquidity pools\n` +
          `• **"Pool DCC_USDT"** — Pool details\n` +
          `• **"Pool price DCC_USDT"** — Spot price\n` +
          `• **"Pool stats DCC_USDT"** — Volume, fees, APY\n` +
          `• **"Swap quote 100 DCC to USDT"** — Get a quote\n` +
          `• **"Recent swaps"** — Latest trades\n` +
          `• **"Positions 3P..."** — LP positions\n` +
          `• **"Token info [assetId]"** — Token metadata\n` +
          `• **"Protocol status"** — AMM contract state\n\n` +
          `**✍ Signing (requires wallet)**\n` +
          `• **"Wallet"** — View connected wallet & balance\n` +
          `• **"Create token MyToken 1000000 supply 8 decimals"** — Issue a new token\n` +
          `• **"Mint 5000 [assetId]"** — Mint more of a reissuable token\n` +
          `• **"Burn 100 [assetId]"** — Burn/destroy tokens\n` +
          `• **"Execute swap 100 DCC to USDT"** — Sign & execute a swap\n` +
          `• **"Add liquidity DCC_USDT 100 50"** — Provide liquidity\n` +
          `• **"Remove liquidity DCC_USDT 10 [lpId]"** — Withdraw LP\n` +
          `• **"Send 10 DCC to 3P..."** — Transfer tokens\n\n` +
          `**⏰ Automations**\n` +
          `• **"Swap 1 DCC to USDC every day for 7 days"** — DCA schedule\n` +
          `• **"Swap 1 DCC to USDC at 4pm"** — One-time scheduled swap\n` +
          `• **"Send 10 DCC to 3P... every week"** — Recurring payment\n` +
          `• **"If DCC drops below $0.50, buy 100 DCC"** — Price trigger\n` +
          `• **"Alert me if DCC goes above $2"** — Price alert\n` +
          `• **"Burn 1000 MYTOKEN every week for 4 weeks"** — Scheduled burn\n` +
          `• **"My automations"** — View all automations\n` +
          `• **"Cancel automation [id]"** — Stop an automation\n\n` +
          `**📱 Telegram Integration**\n` +
          `• **"Telegram token [BOT_TOKEN] chat [CHAT_ID] send DCC price every morning at 8am"**\n` +
          `• **"Telegram token [BOT_TOKEN] chat [CHAT_ID] send portfolio summary daily at 6pm"**\n\n` +
          `**📊 Analytics & Export**\n` +
          `• **"Portfolio"** — Holdings breakdown\n` +
          `• **"My transactions"** — Transaction history\n` +
          `• **"Discover tokens"** — Popular tokens on DCC\n` +
          `• **"dApp data 3P..."** — Read dApp state\n` +
          `• **"Script info 3P..."** — Script metadata\n` +
          `• **"Export chat"** — Download chat as CSV\n` +
          `• **"Export portfolio"** — Download holdings\n` +
          `• **"Export transactions json"** — Download tx history\n\n` +
          `**🥩 Liquid Staking (stDCC)**\n` +
          `• **"Staking"** — Protocol overview & stats\n` +
          `• **"Stake 100 DCC"** — Deposit DCC for stDCC\n` +
          `• **"My staking"** — Your staking position\n` +
          `• **"Estimate stake 100 DCC"** — Preview deposit\n` +
          `• **"Estimate unstake 100 stDCC"** — Preview withdrawal\n` +
          `• **"Staking validators"** — Active validators\n` +
          `• **"stDCC rate"** — Live exchange rate\n` +
          `• **"Staking rewards"** — Reward history\n` +
          `• **"Top stakers"** — Leaderboard\n\n` +
          `**🏛 Governance & Leasing**\n` +
          `• **"Start lease 100 DCC to 3P..."** — Lease DCC\n` +
          `• **"Cancel lease [leaseId]"** — Cancel a lease\n` +
          `• **"My leases"** — View active leases\n` +
          `• **"Governance"** — Governance overview\n\n` +
          `**📇 Utilities**\n` +
          `• **"Save contact Alice 3P..."** — Save address\n` +
          `• **"My contacts"** — List contacts\n` +
          `• **"DeFi strategy"** — Strategy templates\n` +
          `• Use **&&** or **;** to chain commands`,
        type: "text",
      }),
    };
  }

  // ═══════════════════════════════════════════
  // AUTOMATIONS
  // ═══════════════════════════════════════════

  // List automations
  if (/\b(my\s+automation|list\s+automation|show\s+automation|active\s+automation|automation\s*s?\s*$|all\s+automation)/.test(lower)) {
    return {
      handler: async () => {
        const all = loadAutomations();
        if (all.length === 0) {
          return {
            content: `You don't have any automations yet.\n\nTry something like:\n• **"Swap 1 DCC to USDC every day for 7 days"**\n• **"Alert me if DCC drops below $0.50"**\n• **"Send 10 DCC to 3P... every week"**\n\nType **"help"** to see all automation commands.`,
            type: "automation" as TerminalMessage["type"],
          };
        }
        const lines = all.map((a, i) => {
          const status = a.status === "active" ? "🟢" : a.status === "paused" ? "⏸️" : a.status === "completed" ? "✅" : a.status === "failed" ? "❌" : "🚫";
          return `${status} **${a.name}** — ${formatAutomationType(a.action.type)}\n   Runs: ${a.runCount}${a.schedule.maxRuns ? `/${a.schedule.maxRuns}` : ""} | Next: ${formatNextRun(a)} | ID: \`${a.id.slice(0, 8)}\``;
        });
        return {
          content: `**Your Automations (${all.length})**\n\n${lines.join("\n\n")}\n\nUse **"cancel automation [id]"** or **"pause automation [id]"** to manage them.`,
          data: { automations: all.map(a => ({ id: a.id, name: a.name, status: a.status, type: a.action.type, runCount: a.runCount, nextRun: formatNextRun(a) })) },
          type: "automation" as TerminalMessage["type"],
        };
      },
    };
  }

  // Cancel automation
  const cancelMatch = lower.match(/\b(?:cancel|stop|kill|remove|delete)\s+(?:automation\s*)?([a-f0-9]{8})/i);
  if (cancelMatch) {
    return {
      handler: async () => {
        const all = loadAutomations();
        const target = all.find(a => a.id.startsWith(cancelMatch[1]));
        if (!target) {
          return { content: `No automation found with ID starting with \`${cancelMatch[1]}\`.`, type: "error" as TerminalMessage["type"] };
        }
        cancelAutomation(target.id);
        return {
          content: `Cancelled automation **"${target.name}"** (${target.runCount} runs completed).`,
          type: "automation" as TerminalMessage["type"],
        };
      },
    };
  }

  // Pause automation
  const pauseMatch = lower.match(/\bpause\s+(?:automation\s*)?([a-f0-9]{8})/i);
  if (pauseMatch) {
    return {
      handler: async () => {
        const all = loadAutomations();
        const target = all.find(a => a.id.startsWith(pauseMatch[1]));
        if (!target) {
          return { content: `No automation found with ID starting with \`${pauseMatch[1]}\`.`, type: "error" as TerminalMessage["type"] };
        }
        pauseAutomation(target.id);
        return {
          content: `Paused automation **"${target.name}"**. Use **"resume ${pauseMatch[1]}"** to restart.`,
          type: "automation" as TerminalMessage["type"],
        };
      },
    };
  }

  // Resume automation
  const resumeMatch = lower.match(/\bresume\s+(?:automation\s*)?([a-f0-9]{8})/i);
  if (resumeMatch) {
    return {
      handler: async () => {
        const all = loadAutomations();
        const target = all.find(a => a.id.startsWith(resumeMatch[1]));
        if (!target) {
          return { content: `No automation found with ID starting with \`${resumeMatch[1]}\`.`, type: "error" as TerminalMessage["type"] };
        }
        resumeAutomation(target.id);
        return {
          content: `Resumed automation **"${target.name}"**. Next run: ${formatNextRun(target)}.`,
          type: "automation" as TerminalMessage["type"],
        };
      },
    };
  }

  // Create automation (try parsing as scheduling command)
  const parsed = parseAutomation(input);
  if (parsed) {
    return {
      handler: async () => {
        if (parsed.action.type.startsWith("scheduled-") || parsed.action.type === "price-trigger-swap") {
          if (!wallet?.isConnected) {
            return {
              content: `⚠️ You need to connect your wallet before creating transaction automations. Connect using the button in the navbar, then try again.`,
              type: "error" as TerminalMessage["type"],
            };
          }
        }
        if (parsed.telegram && !parsed.telegram.chatId) {
          return {
            content: `I need your Telegram Chat ID to send messages. Please include it like:\n\n**"telegram token YOUR_BOT_TOKEN chat YOUR_CHAT_ID ..."**\n\nTo get your Chat ID, message your bot, then visit:\n\`https://api.telegram.org/botYOUR_TOKEN/getUpdates\``,
            type: "text" as TerminalMessage["type"],
          };
        }
        const auto = createAutomation(parsed, wallet?.address);
        let confirmMsg =
          `✅ **Automation Created!**\n\n` +
          `**${auto.name}**\n` +
          `${auto.description}\n\n`;
        if (auto.schedule.timeOfDay) confirmMsg += `⏰ Time: ${auto.schedule.timeOfDay}\n`;
        if (auto.schedule.maxRuns) confirmMsg += `🔄 Repeats: ${auto.schedule.maxRuns}x\n`;
        if (auto.condition) confirmMsg += `📊 Condition: DCC ${auto.condition.direction} $${auto.condition.threshold}\n`;
        if (auto.telegram) confirmMsg += `📱 Telegram: Connected\n`;
        confirmMsg += `\nID: \`${auto.id.slice(0, 8)}\`\n`;
        confirmMsg += `Next run: **${formatNextRun(auto)}**\n\n`;
        confirmMsg += `⚠️ **Note:** Automations run while this browser tab is open. Keep the dashboard open for scheduled tasks to execute.`;

        return {
          content: confirmMsg,
          data: { automationId: auto.id, name: auto.name, type: auto.action.type, nextRun: formatNextRun(auto) },
          type: "automation" as TerminalMessage["type"],
        };
      },
    };
  }

  // ═══════════════════════════════════════════
  // GREETING / CONVERSATIONAL
  // ═══════════════════════════════════════════
  if (/^(hi|hello|hey|sup|yo|gm|good\s*(morning|afternoon|evening)|what'?s?\s*up)\b/i.test(lower)) {
    return {
      handler: async () => ({
        content: `Hey! 👋 I'm the DCC Terminal — your gateway to the DecentralChain blockchain.\n\nTry asking me about **block height**, **network status**, **swap pools**, or type **"help"** to see everything I can do.`,
        type: "text",
      }),
    };
  }

  // "thank you" / "thanks"
  if (/\b(thanks|thank\s*you|thx|ty|cheers)\b/.test(lower)) {
    return {
      handler: async () => ({
        content: `You're welcome! Let me know if you need anything else.`,
        type: "text",
      }),
    };
  }

  return null;
}

/* ─── Fuzzy suggestion engine ─── */
const KNOWN_COMMANDS: { keywords: string[]; suggestion: string }[] = [
  { keywords: ["block", "height", "tall", "high"], suggestion: "Block height" },
  { keywords: ["latest", "last", "newest", "recent", "block"], suggestion: "Latest block" },
  { keywords: ["block", "transaction", "tx", "detail", "list"], suggestion: "Query block 1000 and show transactions" },
  { keywords: ["balance", "wallet", "account", "funds"], suggestion: "Wallet" },
  { keywords: ["network", "status", "overview", "stats"], suggestion: "Network status" },
  { keywords: ["peer", "node", "connected", "validator"], suggestion: "Peers" },
  { keywords: ["bridge", "sol", "cross", "chain"], suggestion: "Bridge" },
  { keywords: ["pool", "liquidity", "list"], suggestion: "List pools" },
  { keywords: ["create", "pool", "new", "pair", "launch", "init"], suggestion: "Create pool DCC/USDT 100 50" },
  { keywords: ["swap", "trade", "exchange", "quote"], suggestion: "Swap quote 1 DCC to wDAI" },
  { keywords: ["send", "transfer"], suggestion: "Send 10 DCC to 3P..." },
  { keywords: ["create", "issue", "token", "coin", "make", "launch", "deploy", "new"], suggestion: "Create token MyToken 1000000 supply 8 decimals" },
  { keywords: ["mint", "reissue", "more"], suggestion: "Mint 5000 [assetId]" },
  { keywords: ["burn", "destroy"], suggestion: "Burn 100 [assetId]" },
  { keywords: ["help", "command", "guide", "what"], suggestion: "Help" },
  { keywords: ["version", "software", "client"], suggestion: "Node version" },
  { keywords: ["fee", "cost"], suggestion: "Bridge fees" },
  { keywords: ["limit", "minimum", "maximum"], suggestion: "Bridge limits" },
  { keywords: ["token", "asset", "info"], suggestion: "Token info" },
  { keywords: ["automation", "schedule", "cron", "recurring", "every", "daily", "automate"], suggestion: "My automations" },
  { keywords: ["telegram", "bot", "notify", "alert"], suggestion: "Help" },
  { keywords: ["position", "lp", "portfolio"], suggestion: "Positions" },
  { keywords: ["protocol", "amm", "dex"], suggestion: "Protocol status" },
  { keywords: ["staking", "stake", "stdcc", "liquid", "deposit", "staked"], suggestion: "Staking" },
  { keywords: ["unstake", "withdraw", "redeem", "exit"], suggestion: "Estimate unstake 100 stDCC" },
  { keywords: ["validator", "validators", "staking", "node"], suggestion: "Staking validators" },
  { keywords: ["reward", "rewards", "staking", "earn"], suggestion: "Staking rewards" },
  { keywords: ["rate", "exchange", "stdcc", "price"], suggestion: "stDCC rate" },
  { keywords: ["top", "staker", "leaderboard", "biggest"], suggestion: "Top stakers" },
];

function findClosestSuggestions(input: string, maxResults = 3): string[] {
  const words = input.toLowerCase().split(/\s+/);
  const scored = KNOWN_COMMANDS.map((cmd) => {
    let score = 0;
    for (const word of words) {
      for (const kw of cmd.keywords) {
        if (word === kw) score += 3;
        else if (kw.startsWith(word) || word.startsWith(kw)) score += 2;
        else if (levenshtein(word, kw) <= 2) score += 1;
      }
    }
    return { suggestion: cmd.suggestion, score };
  })
  .filter((s) => s.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, maxResults);

  return scored.map((s) => s.suggestion);
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[b.length][a.length];
}

export async function processCommand(
  input: string,
  wallet?: WalletInfo,
  options?: TerminalOptions,
  history?: TerminalMessage[],
): Promise<Omit<TerminalMessage, "id" | "role" | "timestamp">> {
  // Resolve contextual references from conversation history
  let resolved = input;
  if (history && history.length > 0) {
    const ctx = buildContext(history);
    resolved = resolveReferences(input, ctx);
  }
  const command = matchCommand(resolved, wallet, options);

  if (!command) {
    const suggestions = findClosestSuggestions(resolved);
    let content: string;
    if (suggestions.length > 0) {
      const sugList = suggestions.map((s) => `• **"${s}"**`).join("\n");
      content =
        `I'm not sure what you mean, but did you mean one of these?\n\n${sugList}\n\n` +
        `Type **"help"** to see all available commands.`;
    } else {
      content =
        `I'm not sure what you're asking. Try something like:\n\n` +
        `**⛓ Blockchain:** "Block height", "Latest block", "Balance of 3P..."\n` +
        `**🥩 Staking:** "Staking", "Stake 100 DCC", "My staking", "stDCC rate"\n` +
        `**🌉 Bridge:** "Bridge quote 10 SOL", "Bridge fees", "Bridge limits"\n` +
        `**💱 Swap:** "List pools", "Swap quote 100 DCC to USDT", "Recent swaps"\n` +
        `**✍ Sign:** "Execute swap 100 DCC to USDT", "Send 10 DCC to 3P..."\n\n` +
        `Type **"help"** for a full list of commands.`;
    }
    return { content, type: "text" };
  }

  try {
    return await command.handler();
  } catch (err) {
    return {
      content: `Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
      data: err instanceof Error ? { error: err.message } : undefined,
      type: "error",
    };
  }
}
