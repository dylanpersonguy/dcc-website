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
  sendTransfer,
  type TxResult,
} from "./wallet";

export interface TerminalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: Record<string, unknown>;
  type?: "text" | "block" | "balance" | "transaction" | "network" | "peers" | "bridge" | "pool" | "swap" | "error";
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

function extractOrderId(input: string): string | null {
  const match = input.match(/\border(?:er)?\s*(?:id\s*)?[:#]?\s*([a-zA-Z0-9-]{8,})\b/i);
  return match ? match[1] : null;
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

function matchCommand(input: string, wallet?: WalletInfo): CommandMatch | null {
  const lower = input.toLowerCase().trim();

  // ═══════════════════════════════════════════
  // BLOCKCHAIN COMMANDS
  // ═══════════════════════════════════════════

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

  // Bridge quote — "bridge quote 10 SOL", "how much DCC for 5 SOL"
  if (
    (/\b(bridge)\b/.test(lower) && /\b(quote|estimate|preview|calculate)\b/.test(lower)) ||
    (/\b(how\s*much|convert|bridge)\b/.test(lower) && /\b(sol|usdc|usdt)\b/.test(lower) && /\b(dcc|get|receive)\b/.test(lower))
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
          (p) => `• **${p.poolKey}** — TVL: ${typeof p.tvl === "number" ? p.tvl.toLocaleString() : p.tvl}, Fee: ${p.feeBps}bps`
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

  // Swap quote — "swap quote 100 DCC to USDT", "quote swap 50 USDT for DCC"
  if (/\b(swap|trade|exchange)\b/.test(lower) && /\b(quote|estimate|preview|how\s*much|price|calculate)\b/.test(lower)) {
    const amount = extractAmount(input);
    const tokens = input.match(/\b(DCC|USDT|USDC|SOL|BTC|ETH)\b/gi);
    return {
      handler: async () => {
        if (!amount || !tokens || tokens.length < 2) {
          return {
            content: `Please specify amount and token pair, e.g. **"Swap quote 100 DCC to USDT"** or **"How much USDT for 50 DCC?"**`,
            type: "text",
          };
        }
        const tokenIn = tokens[0].toUpperCase();
        const tokenOut = tokens[1].toUpperCase();
        const quote = await getSwapQuote(tokenIn, tokenOut, amount);
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

  // Wallet status
  if (/\b(wallet|my\s*wallet|account|connected)\b/.test(lower) && !/\b(connect|disconnect)\b/.test(lower)) {
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.address) {
          return {
            content: `No wallet connected. Click the **Connect** button in the navbar to connect your DCC wallet with a seed phrase.`,
            type: "text",
          };
        }
        const bal = await getAddressBalance(wallet.address);
        return {
          content: `Your connected wallet:`,
          data: {
            address: wallet.address,
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

  // Execute swap — "execute swap 100 DCC to USDT", "swap 50 DCC for USDT confirm"
  if (
    /\b(execute|confirm|send|do|perform)\b/.test(lower) &&
    /\b(swap|trade|exchange)\b/.test(lower)
  ) {
    const amount = extractAmount(input);
    const tokens = input.match(/\b(DCC|USDT|USDC|SOL|BTC|ETH)\b/gi);
    return {
      handler: async () => {
        if (!wallet?.isConnected || !wallet.seed) {
          return {
            content: `⚠️ Wallet not connected. Please connect your wallet first using the **Connect** button in the navbar.`,
            type: "error",
          };
        }
        if (!amount || !tokens || tokens.length < 2) {
          return {
            content: `Please specify amount and tokens, e.g. **"Execute swap 100 DCC to USDT"**`,
            type: "text",
          };
        }
        const tokenIn = tokens[0].toUpperCase();
        const tokenOut = tokens[1].toUpperCase();
        // Get a quote first
        const quote = await getSwapQuote(tokenIn, tokenOut, amount);
        const minReceived = quote.outputAmount * 0.995; // 0.5% slippage tolerance
        // For now use null asset IDs for native DCC, or token name matching
        const assetIdIn = tokenIn === "DCC" ? null : tokenIn;
        const assetIdOut = tokenOut === "DCC" ? null : tokenOut;
        const result = await executeSwap(
          wallet.seed,
          tokenIn,
          tokenOut,
          amount,
          minReceived,
          assetIdIn,
          assetIdOut,
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
        const assetId0 = token0 === "DCC" ? null : token0;
        const assetId1 = token1 === "DCC" ? null : token1;
        const result = await addLiquidity(
          wallet.seed,
          pool,
          amount0,
          amount1,
          assetId0,
          assetId1,
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
  if (/\b(send|transfer)\b/.test(lower) && /\b(dcc|to)\b/.test(lower)) {
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
          `• **"Execute swap 100 DCC to USDT"** — Sign & execute a swap\n` +
          `• **"Add liquidity DCC_USDT 100 50"** — Provide liquidity\n` +
          `• **"Remove liquidity DCC_USDT 10 [lpId]"** — Withdraw LP\n` +
          `• **"Send 10 DCC to 3P..."** — Transfer tokens`,
        type: "text",
      }),
    };
  }

  return null;
}

export async function processCommand(
  input: string,
  wallet?: WalletInfo,
): Promise<Omit<TerminalMessage, "id" | "role" | "timestamp">> {
  const command = matchCommand(input, wallet);

  if (!command) {
    return {
      content:
        `I'm not sure what you're asking. Try something like:\n\n` +
        `**⛓ Blockchain:** "Block height", "Latest block", "Balance of 3P..."\n` +
        `**🌉 Bridge:** "Bridge quote 10 SOL", "Bridge fees", "Bridge limits"\n` +
        `**💱 Swap:** "List pools", "Swap quote 100 DCC to USDT", "Recent swaps"\n` +
        `**✍ Sign:** "Execute swap 100 DCC to USDT", "Send 10 DCC to 3P..."\n\n` +
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
