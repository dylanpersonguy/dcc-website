import {
  invokeScript,
  transfer,
  broadcast,
  seedUtils,
} from "@waves/waves-transactions";

const NODE_URL = "https://mainnet-node.decentralchain.io";
const CHAIN_ID = "D";
const AMM_DAPP = "3Da7xwRRtXfkA46jaKTYb75Usd2ZNWdY6HX";

export interface WalletAccount {
  address: string;
  publicKey: string;
}

/**
 * Derive address + public key from a seed phrase for DCC mainnet (chain ID 'D').
 */
export function getAccountFromSeed(seed: string): WalletAccount {
  const account = new seedUtils.Seed(seed, CHAIN_ID);
  return {
    address: account.address,
    publicKey: account.keyPair.publicKey,
  };
}

/**
 * Validate that a seed produces a valid DCC address (starts with 3).
 */
export function isValidSeed(seed: string): boolean {
  try {
    const account = getAccountFromSeed(seed);
    return account.address.startsWith("3") && account.address.length === 35;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════

export interface TxResult {
  id: string;
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Execute a token swap via the AMM dApp.
 * Calls the `swap` function on the AMM contract with a payment of the input token.
 */
export async function executeSwap(
  seed: string,
  tokenIn: string,
  tokenOut: string,
  amount: number,
  minReceived: number,
  assetIdIn: string | null,
  assetIdOut: string | null,
): Promise<TxResult> {
  try {
    const amountWavelets = Math.round(amount * 1e8);
    const minWavelets = Math.round(minReceived * 1e8);

    const tx = invokeScript(
      {
        dApp: AMM_DAPP,
        call: {
          function: "swap",
          args: [
            { type: "string", value: tokenOut },
            { type: "integer", value: minWavelets },
          ],
        },
        payment: [
          {
            assetId: assetIdIn,
            amount: amountWavelets,
          },
        ],
        fee: 500000,
        chainId: CHAIN_ID,
      },
      seed,
    );

    const result = await broadcast(tx, NODE_URL);
    const data = result as unknown as Record<string, unknown>;
    return {
      id: String(data.id ?? ""),
      success: true,
      data,
    };
  } catch (err) {
    return {
      id: "",
      success: false,
      error: err instanceof Error ? err.message : "Swap transaction failed",
    };
  }
}

/**
 * Add liquidity to a pool on the AMM dApp.
 */
export async function addLiquidity(
  seed: string,
  poolKey: string,
  amount0: number,
  amount1: number,
  assetId0: string | null,
  assetId1: string | null,
): Promise<TxResult> {
  try {
    const amt0 = Math.round(amount0 * 1e8);
    const amt1 = Math.round(amount1 * 1e8);

    const tx = invokeScript(
      {
        dApp: AMM_DAPP,
        call: {
          function: "addLiquidity",
          args: [{ type: "string", value: poolKey }],
        },
        payment: [
          { assetId: assetId0, amount: amt0 },
          { assetId: assetId1, amount: amt1 },
        ],
        fee: 500000,
        chainId: CHAIN_ID,
      },
      seed,
    );

    const result = await broadcast(tx, NODE_URL);
    const data = result as unknown as Record<string, unknown>;
    return {
      id: String(data.id ?? ""),
      success: true,
      data,
    };
  } catch (err) {
    return {
      id: "",
      success: false,
      error: err instanceof Error ? err.message : "Add liquidity failed",
    };
  }
}

/**
 * Remove liquidity from a pool.
 */
export async function removeLiquidity(
  seed: string,
  poolKey: string,
  lpTokenAmount: number,
  lpAssetId: string,
): Promise<TxResult> {
  try {
    const lpAmt = Math.round(lpTokenAmount * 1e8);

    const tx = invokeScript(
      {
        dApp: AMM_DAPP,
        call: {
          function: "removeLiquidity",
          args: [{ type: "string", value: poolKey }],
        },
        payment: [{ assetId: lpAssetId, amount: lpAmt }],
        fee: 500000,
        chainId: CHAIN_ID,
      },
      seed,
    );

    const result = await broadcast(tx, NODE_URL);
    const data = result as unknown as Record<string, unknown>;
    return {
      id: String(data.id ?? ""),
      success: true,
      data,
    };
  } catch (err) {
    return {
      id: "",
      success: false,
      error: err instanceof Error ? err.message : "Remove liquidity failed",
    };
  }
}

/**
 * Transfer DCC or tokens to another address.
 */
export async function sendTransfer(
  seed: string,
  recipient: string,
  amount: number,
  assetId?: string | null,
): Promise<TxResult> {
  try {
    const amountWavelets = Math.round(amount * 1e8);

    const tx = transfer(
      {
        recipient,
        amount: amountWavelets,
        assetId: assetId || null,
        fee: 100000,
        chainId: CHAIN_ID,
      },
      seed,
    );

    const result = await broadcast(tx, NODE_URL);
    const data = result as unknown as Record<string, unknown>;
    return {
      id: String(data.id ?? ""),
      success: true,
      data,
    };
  } catch (err) {
    return {
      id: "",
      success: false,
      error: err instanceof Error ? err.message : "Transfer failed",
    };
  }
}
