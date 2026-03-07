import {
  invokeScript,
  transfer,
  broadcast,
  seedUtils,
  issue,
  reissue,
  burn,
  lease,
  cancelLease,
} from "@waves/waves-transactions";

const NODE_URL = "https://mainnet-node.decentralchain.io";
const CHAIN_ID = "?";
const AMM_DAPP = "3Da7xwRRtXfkA46jaKTYb75Usd2ZNWdY6HX";

function txError(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as Record<string, unknown>).message);
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return fallback; }
}

export interface WalletAccount {
  address: string;
  publicKey: string;
}

/**
 * Derive address + public key from a seed phrase for DCC mainnet (chain ID '?', byte 63).
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
  decimalsIn: number = 8,
  decimalsOut: number = 8,
): Promise<TxResult> {
  try {
    const amountWavelets = Math.round(amount * Math.pow(10, decimalsIn));
    const minWavelets = Math.round(minReceived * Math.pow(10, decimalsOut));
    // Contract: swapExactIn(assetIn, assetOut, feeBps, amountIn, minAmountOut, deadline)
    const assetInStr = assetIdIn ?? "DCC";
    const assetOutStr = assetIdOut ?? "DCC";
    const deadline = Date.now() + 10 * 60 * 1000; // 10 min from now

    const tx = invokeScript(
      {
        dApp: AMM_DAPP,
        call: {
          function: "swapExactIn",
          args: [
            { type: "string" as const, value: assetInStr },
            { type: "string" as const, value: assetOutStr },
            { type: "integer" as const, value: 30 },
            { type: "integer" as const, value: amountWavelets },
            { type: "integer" as const, value: minWavelets },
            { type: "integer" as const, value: deadline },
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
      error: txError(err, "Swap transaction failed"),
    };
  }
}

/**
 * Create a new liquidity pool on the AMM dApp.
 * Requires initial liquidity for both tokens.
 */
export async function createPool(
  seed: string,
  token0: string,
  token1: string,
  amount0: number,
  amount1: number,
  assetId0: string | null,
  assetId1: string | null,
  decimals0: number = 8,
  decimals1: number = 8,
  feeBps?: number,
): Promise<TxResult> {
  try {
    const amt0 = Math.round(amount0 * Math.pow(10, decimals0));
    const amt1 = Math.round(amount1 * Math.pow(10, decimals1));
    // Contract expects: createPool(assetA: String, assetB: String, feeBps: Int)
    // Use "DCC" for native token, or the base58 asset ID string
    const assetAStr = assetId0 ?? "DCC";
    const assetBStr = assetId1 ?? "DCC";
    const fee = feeBps ?? 30; // default 30 bps

    const tx = invokeScript(
      {
        dApp: AMM_DAPP,
        call: {
          function: "createPool",
          args: [
            { type: "string" as const, value: assetAStr },
            { type: "string" as const, value: assetBStr },
            { type: "integer" as const, value: fee },
          ],
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
      error: txError(err, "Create pool failed"),
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
  decimals0: number = 8,
  decimals1: number = 8,
): Promise<TxResult> {
  try {
    const amt0 = Math.round(amount0 * Math.pow(10, decimals0));
    const amt1 = Math.round(amount1 * Math.pow(10, decimals1));
    // Contract: addLiquidity(assetA, assetB, feeBps, amountADesired, amountBDesired, amountAMin, amountBMin, deadline)
    const assetAStr = assetId0 ?? "DCC";
    const assetBStr = assetId1 ?? "DCC";
    const deadline = Date.now() + 10 * 60 * 1000;
    // Allow 1% slippage on minimum amounts
    const amt0Min = Math.round(amt0 * 0.99);
    const amt1Min = Math.round(amt1 * 0.99);

    const tx = invokeScript(
      {
        dApp: AMM_DAPP,
        call: {
          function: "addLiquidity",
          args: [
            { type: "string" as const, value: assetAStr },
            { type: "string" as const, value: assetBStr },
            { type: "integer" as const, value: 30 },
            { type: "integer" as const, value: amt0 },
            { type: "integer" as const, value: amt1 },
            { type: "integer" as const, value: amt0Min },
            { type: "integer" as const, value: amt1Min },
            { type: "integer" as const, value: deadline },
          ],
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
      error: txError(err, "Add liquidity failed"),
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
  assetId0?: string | null,
  assetId1?: string | null,
): Promise<TxResult> {
  try {
    const lpAmt = Math.round(lpTokenAmount * 1e8);
    // Contract: removeLiquidity(assetA, assetB, feeBps, lpAmount, amountAMin, amountBMin, deadline)
    const parts = poolKey.includes(":") ? poolKey.split(":") : poolKey.split("_");
    const assetAStr = assetId0 ?? parts[0] ?? "DCC";
    const assetBStr = assetId1 ?? parts[1] ?? "DCC";
    const deadline = Date.now() + 10 * 60 * 1000;

    const tx = invokeScript(
      {
        dApp: AMM_DAPP,
        call: {
          function: "removeLiquidity",
          args: [
            { type: "string" as const, value: assetAStr },
            { type: "string" as const, value: assetBStr },
            { type: "integer" as const, value: 30 },
            { type: "integer" as const, value: lpAmt },
            { type: "integer" as const, value: 0 },
            { type: "integer" as const, value: 0 },
            { type: "integer" as const, value: deadline },
          ],
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
      error: txError(err, "Remove liquidity failed"),
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
      error: txError(err, "Transfer failed"),
    };
  }
}

/**
 * Create (issue) a new token on DCC.
 */
export async function createToken(
  seed: string,
  name: string,
  description: string,
  quantity: number,
  decimals: number,
  reissuable: boolean,
): Promise<TxResult> {
  try {
    const quantitySmallest = Math.round(quantity * Math.pow(10, decimals));

    const tx = issue(
      {
        name,
        description,
        quantity: quantitySmallest,
        decimals,
        reissuable,
        fee: 100000000, // 1 DCC
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
      error: txError(err, "Token creation failed"),
    };
  }
}

/**
 * Mint (reissue) more of an existing reissuable token.
 */
export async function mintToken(
  seed: string,
  assetId: string,
  quantity: number,
  decimals: number,
  reissuable: boolean,
): Promise<TxResult> {
  try {
    const quantitySmallest = Math.round(quantity * Math.pow(10, decimals));

    const tx = reissue(
      {
        assetId,
        quantity: quantitySmallest,
        reissuable,
        fee: 100000000, // 1 DCC
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
      error: txError(err, "Token minting failed"),
    };
  }
}

/**
 * Burn (destroy) a quantity of a token.
 */
export async function burnToken(
  seed: string,
  assetId: string,
  quantity: number,
  decimals: number,
): Promise<TxResult> {
  try {
    const quantitySmallest = Math.round(quantity * Math.pow(10, decimals));

    const tx = burn(
      {
        assetId,
        amount: quantitySmallest,
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
      error: txError(err, "Token burn failed"),
    };
  }
}

/**
 * Lease DCC to a node for generating balance.
 */
export async function startLease(
  seed: string,
  recipient: string,
  amount: number,
): Promise<TxResult> {
  try {
    const amountWavelets = Math.round(amount * 1e8);
    const tx = lease(
      {
        recipient,
        amount: amountWavelets,
        fee: 100000,
        chainId: CHAIN_ID,
      },
      seed,
    );
    const result = await broadcast(tx, NODE_URL);
    const data = result as unknown as Record<string, unknown>;
    return { id: String(data.id ?? ""), success: true, data };
  } catch (err) {
    return { id: "", success: false, error: txError(err, "Lease failed") };
  }
}

/**
 * Cancel an existing lease.
 */
export async function stopLease(
  seed: string,
  leaseId: string,
): Promise<TxResult> {
  try {
    const tx = cancelLease(
      {
        leaseId,
        fee: 100000,
        chainId: CHAIN_ID,
      },
      seed,
    );
    const result = await broadcast(tx, NODE_URL);
    const data = result as unknown as Record<string, unknown>;
    return { id: String(data.id ?? ""), success: true, data };
  } catch (err) {
    return { id: "", success: false, error: txError(err, "Cancel lease failed") };
  }
}

/**
 * Stake DCC in the liquid staking protocol.
 * Uses the staking API tx builder to get the correct unsigned transaction,
 * signs it locally, then broadcasts to the DCC network.
 */
export async function stakeDCC(
  seed: string,
  amount: number,
): Promise<TxResult> {
  try {
    const amountWavelets = Math.round(amount * 1e8);
    const account = getAccountFromSeed(seed);

    // Build unsigned tx via staking API (knows the real contract address)
    const { buildDepositTx } = await import("./staking");
    const apiResp = await buildDepositTx(account.publicKey, amountWavelets);
    const txParams = (apiResp as Record<string, unknown>).tx as Record<string, unknown> | undefined;
    const params = txParams ?? apiResp;

    // Sign with invokeScript (type 16) using the API-provided params
    const signed = invokeScript(
      {
        dApp: String(params.dApp),
        call: { function: String((params.call as Record<string, unknown>)?.function ?? "deposit"), args: [] },
        payment: params.payment as { amount: number; assetId: string | null }[],
        fee: Number(params.fee) || 500000,
        chainId: CHAIN_ID,
        senderPublicKey: account.publicKey,
      },
      { privateKey: new seedUtils.Seed(seed, CHAIN_ID).keyPair.privateKey },
    );

    // Broadcast to DCC network
    const result = await broadcast(signed, NODE_URL);
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
      error: txError(err, "Staking deposit failed"),
    };
  }
}
