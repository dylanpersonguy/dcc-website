/**
 * Conversational memory — extracts context from prior messages
 * so users can reference "that block", "same address", etc.
 */

import type { TerminalMessage } from "./terminal";
import { resolveContactName } from "./address-book";

export interface ConversationContext {
  lastAddress: string | null;
  lastBlockHeight: number | null;
  lastTxId: string | null;
  lastPoolKey: string | null;
  lastAssetId: string | null;
  lastTokenName: string | null;
  lastAmount: number | null;
  lastTokenIn: string | null;
  lastTokenOut: string | null;
}

const EMPTY_CONTEXT: ConversationContext = {
  lastAddress: null,
  lastBlockHeight: null,
  lastTxId: null,
  lastPoolKey: null,
  lastAssetId: null,
  lastTokenName: null,
  lastAmount: null,
  lastTokenIn: null,
  lastTokenOut: null,
};

/**
 * Build conversation context from the message history.
 * Scans messages (most recent first) to extract recently mentioned entities.
 */
export function buildContext(messages: TerminalMessage[]): ConversationContext {
  const ctx = { ...EMPTY_CONTEXT };

  // Scan from most recent to oldest, filling in missing context
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const text = msg.content;
    const data = msg.data;

    // Extract address
    if (!ctx.lastAddress) {
      const addrMatch = text.match(/\b(3[A-Za-z0-9]{34})\b/);
      if (addrMatch) ctx.lastAddress = addrMatch[1];
      else if (data?.address) ctx.lastAddress = String(data.address);
      else if (data?.recipient) ctx.lastAddress = String(data.recipient);
      else if (data?.generator) ctx.lastAddress = String(data.generator);
    }

    // Extract block height
    if (!ctx.lastBlockHeight) {
      if (data?.height) ctx.lastBlockHeight = Number(data.height);
      else if (data?.blockHeight) ctx.lastBlockHeight = Number(data.blockHeight);
      else {
        const heightMatch = text.match(/block.*?#?([\d,]+)/i);
        if (heightMatch) ctx.lastBlockHeight = parseInt(heightMatch[1].replace(/,/g, ""), 10);
      }
    }

    // Extract tx ID
    if (!ctx.lastTxId) {
      if (data?.txId) ctx.lastTxId = String(data.txId);
      else if (data?.id && msg.type === "transaction") ctx.lastTxId = String(data.id);
    }

    // Extract pool key
    if (!ctx.lastPoolKey) {
      if (data?.poolKey) ctx.lastPoolKey = String(data.poolKey);
      else {
        const poolMatch = text.match(/\b([A-Za-z0-9]+_[A-Za-z0-9]+)\b/);
        if (poolMatch) ctx.lastPoolKey = poolMatch[1];
      }
    }

    // Extract asset ID
    if (!ctx.lastAssetId) {
      if (data?.assetId) ctx.lastAssetId = String(data.assetId);
    }

    // Extract token name
    if (!ctx.lastTokenName) {
      if (data?.name && typeof data.name === "string") ctx.lastTokenName = String(data.name);
    }

    // Extract amount
    if (!ctx.lastAmount) {
      if (data?.inputAmount) ctx.lastAmount = Number(data.inputAmount);
      else {
        const amtMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:DCC|USDT|USDC|SOL)\b/i);
        if (amtMatch) ctx.lastAmount = parseFloat(amtMatch[1]);
      }
    }

    // Extract token pair
    if (!ctx.lastTokenIn || !ctx.lastTokenOut) {
      if (data?.input && typeof data.input === "string") {
        const match = String(data.input).match(/[\d.]+ (\w+)/);
        if (match) ctx.lastTokenIn = match[1];
      }
      if (data?.estimatedOutput && typeof data.estimatedOutput === "string") {
        const match = String(data.estimatedOutput).match(/[\d.]+ (\w+)/);
        if (match) ctx.lastTokenOut = match[1];
      }
    }

    // Stop scanning once we have everything
    if (ctx.lastAddress && ctx.lastBlockHeight && ctx.lastTxId &&
        ctx.lastPoolKey && ctx.lastAssetId && ctx.lastAmount) break;
  }

  return ctx;
}

/**
 * Resolve contextual references in user input using conversation history.
 * Replaces phrases like "that block", "same address", "it", "this pool", etc.
 */
export function resolveReferences(input: string, ctx: ConversationContext): string {
  let resolved = input;

  // "that block" / "this block" / "the block" / "same block" → inject block height
  if (ctx.lastBlockHeight && /\b(that|this|the|same|previous|last)\s+block\b/i.test(resolved) && !/\d{4,}/.test(resolved)) {
    resolved = resolved.replace(
      /\b(that|this|the|same|previous|last)\s+block\b/i,
      `block ${ctx.lastBlockHeight}`
    );
  }

  // "that address" / "same address" / "that wallet" → inject address
  if (ctx.lastAddress && /\b(that|this|the|same|previous)\s+(address|wallet|account|recipient)\b/i.test(resolved)) {
    resolved = resolved.replace(
      /\b(that|this|the|same|previous)\s+(address|wallet|account|recipient)\b/i,
      ctx.lastAddress
    );
  }

  // "that transaction" / "that tx" → inject tx ID
  if (ctx.lastTxId && /\b(that|this|the|same|previous)\s+(transaction|tx)\b/i.test(resolved)) {
    resolved = resolved.replace(
      /\b(that|this|the|same|previous)\s+(transaction|tx)\b/i,
      `tx ${ctx.lastTxId}`
    );
  }

  // "that pool" / "same pool" → inject pool key
  if (ctx.lastPoolKey && /\b(that|this|the|same)\s+pool\b/i.test(resolved)) {
    resolved = resolved.replace(
      /\b(that|this|the|same)\s+pool\b/i,
      `pool ${ctx.lastPoolKey}`
    );
  }

  // "that token" / "same token" / "same asset" → inject asset ID
  if (ctx.lastAssetId && /\b(that|this|the|same)\s+(token|asset|coin)\b/i.test(resolved)) {
    resolved = resolved.replace(
      /\b(that|this|the|same)\s+(token|asset|coin)\b/i,
      ctx.lastAssetId
    );
  }

  // Contact name resolution — "send 10 DCC to Alice" → resolves Alice to address
  const toNameMatch = resolved.match(/\bto\s+([A-Z][a-zA-Z]{1,19})\b/);
  if (toNameMatch && !/\b3[A-Za-z0-9]{34}\b/.test(resolved)) {
    const addr = resolveContactName(toNameMatch[1]);
    if (addr) {
      resolved = resolved.replace(toNameMatch[0], `to ${addr}`);
    }
  }

  // "balance of Alice" → resolves to address
  const ofNameMatch = resolved.match(/\b(?:balance|info|history)\s+(?:of|for)\s+([A-Z][a-zA-Z]{1,19})\b/);
  if (ofNameMatch && !/\b3[A-Za-z0-9]{34}\b/.test(resolved)) {
    const addr = resolveContactName(ofNameMatch[1]);
    if (addr) {
      resolved = resolved.replace(ofNameMatch[1], addr);
    }
  }

  return resolved;
}
