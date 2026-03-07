/**
 * DCC Automation Engine
 *
 * Client-side scheduler that parses scheduling intent from natural language,
 * stores automations in localStorage, and executes them while the tab is open.
 *
 * Supports:
 * - Scheduled transactions (swap, send, burn, mint) on intervals or at specific times
 * - Price-conditioned triggers (if DCC drops below / rises above X)
 * - Telegram bot notifications (price alerts, portfolio summaries, tx confirmations)
 * - Monitoring automations (balance watching, block alerts)
 */

import { getPoolPrice } from "./amm";
import { getBlockHeight, getAddressBalance } from "./blockchain";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type AutomationStatus = "active" | "paused" | "completed" | "failed" | "cancelled";
export type AutomationType =
  | "scheduled-swap"
  | "scheduled-send"
  | "scheduled-burn"
  | "scheduled-mint"
  | "scheduled-stake"
  | "scheduled-unstake"
  | "price-alert"
  | "price-trigger-swap"
  | "balance-alert"
  | "block-monitor"
  | "telegram-price"
  | "telegram-summary"
  | "telegram-tx-alert"
  | "recurring-report";

export interface ScheduleConfig {
  /** Cron-like: how often (ms between runs). null = one-shot. */
  intervalMs: number | null;
  /** Specific time of day (HH:MM in 24h). null = use interval only. */
  timeOfDay: string | null;
  /** Max number of executions. null = infinite. */
  maxRuns: number | null;
  /** Delay first run until this timestamp. null = start immediately. */
  startAfter: number | null;
  /** Stop after this timestamp. null = run until maxRuns or cancelled. */
  endBefore: number | null;
}

export interface PriceCondition {
  pool: string;         // e.g. "DCC_USDC"
  direction: "above" | "below";
  threshold: number;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface AutomationAction {
  command: string;       // The raw NLP command to execute, e.g. "Swap 1 DCC to USDC"
  type: AutomationType;
}

export interface AutomationRun {
  timestamp: number;
  success: boolean;
  result?: string;
  error?: string;
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  action: AutomationAction;
  schedule: ScheduleConfig;
  condition?: PriceCondition;
  telegram?: TelegramConfig;
  status: AutomationStatus;
  createdAt: number;
  lastRunAt: number | null;
  nextRunAt: number | null;
  runCount: number;
  runs: AutomationRun[];
  walletAddress?: string;
}

// ═══════════════════════════════════════════
// SCHEDULE PARSING
// ═══════════════════════════════════════════

const MS_SECOND = 1_000;
const MS_MINUTE = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;
const MS_WEEK = 604_800_000;

function formatInterval(ms: number): string {
  if (ms < MS_MINUTE) return `every ${ms / MS_SECOND}s`;
  if (ms === MS_MINUTE) return "every minute";
  if (ms < MS_HOUR) return `every ${ms / MS_MINUTE} min`;
  if (ms === MS_HOUR) return "hourly";
  if (ms < MS_DAY) return `every ${ms / MS_HOUR}h`;
  if (ms === MS_DAY) return "daily";
  if (ms === MS_WEEK) return "weekly";
  return `every ${(ms / MS_DAY).toFixed(1)} days`;
}

interface ParsedSchedule {
  name: string;
  description: string;
  action: AutomationAction;
  schedule: ScheduleConfig;
  condition?: PriceCondition;
  telegram?: TelegramConfig;
}

/**
 * Parse a natural language automation command into a structured automation config.
 * Returns null if the input doesn't look like a scheduling/automation request.
 */
export function parseAutomation(input: string): ParsedSchedule | null {
  const lower = input.toLowerCase().trim();

  // Must contain at least one scheduling/automation keyword
  const hasScheduleIntent =
    /\b(every|everyday|daily|weekly|hourly|at\s+\d|schedule|automate|cron|recurring|repeat|for\s+\d+\s+days?|for\s+\d+\s+weeks?|each\s+(day|hour|week|morning|evening|night)|tomorrow|tonight|up\s*to\s+\d+)\b/i.test(lower) ||
    /\b(if|when|whenever|alert|notify|watch|monitor|telegram)\b/i.test(lower);

  if (!hasScheduleIntent) return null;

  // ─── Telegram integration ───
  const telegramMatch = input.match(/(?:telegram|tg)\s*(?:bot)?\s*(?:token|key)?[:\s]+([0-9]+:[A-Za-z0-9_-]{35,})/i);
  const chatIdMatch = input.match(/chat\s*(?:id)?[:\s]+(-?\d{5,})/i);
  const telegram: TelegramConfig | undefined = telegramMatch
    ? { botToken: telegramMatch[1], chatId: chatIdMatch?.[1] || "" }
    : undefined;

  // ─── Time of day parsing ───
  let timeOfDay: string | null = null;
  const timeMatch = lower.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3]?.toLowerCase();
    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    timeOfDay = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
  }

  // ─── Interval parsing ───
  let intervalMs: number | null = null;
  let maxRuns: number | null = null;

  if (/\bevery\s+(\d+)\s*sec/i.test(lower)) {
    const m = lower.match(/every\s+(\d+)\s*sec/i);
    intervalMs = parseInt(m![1], 10) * MS_SECOND;
  }
  else if (/\bevery\s*(single\s+)?second\b/.test(lower)) intervalMs = MS_SECOND;
  else if (/\bevery\s*(single\s+)?minute\b/.test(lower)) intervalMs = MS_MINUTE;
  else if (/\bevery\s+(\d+)\s*min/i.test(lower)) {
    const m = lower.match(/every\s+(\d+)\s*min/i);
    intervalMs = parseInt(m![1], 10) * MS_MINUTE;
  }
  else if (/\b(every\s*(single\s+)?hour|hourly)\b/.test(lower)) intervalMs = MS_HOUR;
  else if (/\bevery\s+(\d+)\s*hours?\b/i.test(lower)) {
    const m = lower.match(/every\s+(\d+)\s*hours?/i);
    intervalMs = parseInt(m![1], 10) * MS_HOUR;
  }
  else if (/\b(every\s*(single\s+)?day|everyday|daily|each\s+day)\b/.test(lower)) intervalMs = MS_DAY;
  else if (/\b(every\s*(single\s+)?week|weekly|each\s+week)\b/.test(lower)) intervalMs = MS_WEEK;
  else if (/\b(every\s+morning)\b/.test(lower)) {
    intervalMs = MS_DAY;
    if (!timeOfDay) timeOfDay = "08:00";
  }
  else if (/\b(every\s+evening|every\s+night)\b/.test(lower)) {
    intervalMs = MS_DAY;
    if (!timeOfDay) timeOfDay = "20:00";
  }

  // Duration / repeat count
  const forDaysMatch = lower.match(/for\s+(\d+)\s*days?/i);
  const forWeeksMatch = lower.match(/for\s+(\d+)\s*weeks?/i);
  const forMonthsMatch = lower.match(/for\s+(\d+)\s*months?/i);
  const timesMatch = lower.match(/(\d+)\s*times?/i);

  if (forDaysMatch) {
    maxRuns = parseInt(forDaysMatch[1], 10);
    if (!intervalMs) intervalMs = MS_DAY;
  } else if (forWeeksMatch) {
    maxRuns = parseInt(forWeeksMatch[1], 10);
    if (!intervalMs) intervalMs = MS_WEEK;
  } else if (forMonthsMatch) {
    const months = parseInt(forMonthsMatch[1], 10);
    maxRuns = months * 30;
    if (!intervalMs) intervalMs = MS_DAY;
  } else if (timesMatch && intervalMs) {
    maxRuns = parseInt(timesMatch[1], 10);
  }

  // "up to X DCC" — compute maxRuns from total budget / per-run amount
  const upToMatch = lower.match(/up\s*to\s+(\d+(?:\.\d+)?)\s*(?:dcc)?/i);
  const perRunAmountMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:dcc)?\s*(?:every|each)/i) ||
    input.match(/(?:stake|send|swap|burn|mint|unstake|withdraw|deposit)\s+(\d+(?:\.\d+)?)/i);
  if (upToMatch && perRunAmountMatch && !maxRuns) {
    const total = parseFloat(upToMatch[1]);
    const perRun = parseFloat(perRunAmountMatch[1]);
    if (perRun > 0 && total > perRun) maxRuns = Math.ceil(total / perRun);
  }

  // One-shot scheduled (has time but no interval)
  if (timeOfDay && !intervalMs) {
    intervalMs = null; // one-shot
    maxRuns = 1;
  }

  // ─── Price condition parsing ───
  let condition: PriceCondition | undefined;
  const priceBelow = lower.match(/if\s+(?:dcc|price)\s+(?:drops?\s+)?(?:below|under|less\s+than)\s+\$?(\d+(?:\.\d+)?)/i);
  const priceAbove = lower.match(/if\s+(?:dcc|price)\s+(?:goes?\s+|rises?\s+)?(?:above|over|more\s+than|exceeds?)\s+\$?(\d+(?:\.\d+)?)/i);
  const whenPrice = lower.match(/when\s+(?:dcc|price)\s+(?:is\s+)?(?:below|under)\s+\$?(\d+(?:\.\d+)?)/i);
  const whenPriceAbove = lower.match(/when\s+(?:dcc|price)\s+(?:is\s+)?(?:above|over)\s+\$?(\d+(?:\.\d+)?)/i);

  if (priceBelow || whenPrice) {
    condition = {
      pool: "DCC_USDC",
      direction: "below",
      threshold: parseFloat((priceBelow || whenPrice)![1]),
    };
  } else if (priceAbove || whenPriceAbove) {
    condition = {
      pool: "DCC_USDC",
      direction: "above",
      threshold: parseFloat((priceAbove || whenPriceAbove)![1]),
    };
  }

  // ─── Action/type detection ───
  let type: AutomationType = "recurring-report";
  let command = input;
  let name = "Automation";
  let description = input;

  // Swap detection
  const swapMatch = input.match(/swap\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:to|for)\s+(\w+)/i);
  if (swapMatch) {
    type = condition ? "price-trigger-swap" : "scheduled-swap";
    const [, amt, from, to] = swapMatch;
    command = `Execute swap ${amt} ${from.toUpperCase()} to ${to.toUpperCase()}`;
    name = `Swap ${amt} ${from.toUpperCase()} → ${to.toUpperCase()}`;
    description = condition
      ? `Swap ${amt} ${from.toUpperCase()} to ${to.toUpperCase()} when price is ${condition.direction} $${condition.threshold}`
      : `Swap ${amt} ${from.toUpperCase()} to ${to.toUpperCase()} ${intervalMs ? (intervalMs === MS_DAY ? "daily" : `every ${intervalMs / MS_HOUR}h`) : "once"}${maxRuns ? ` (${maxRuns}x)` : ""}`;
  }

  // Send detection
  const sendMatch = input.match(/send\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(3[A-Za-z0-9]{34})/i);
  if (sendMatch) {
    type = "scheduled-send";
    const [, amt, token, addr] = sendMatch;
    command = `Send ${amt} ${token.toUpperCase()} to ${addr}`;
    name = `Send ${amt} ${token.toUpperCase()}`;
    description = `Send ${amt} ${token.toUpperCase()} to ${addr.slice(0, 8)}… ${intervalMs ? (intervalMs === MS_DAY ? "daily" : `every ${intervalMs / MS_HOUR}h`) : "once"}${maxRuns ? ` (${maxRuns}x)` : ""}`;
  }

  // Burn detection
  const burnMatch = input.match(/burn\s+(\d+(?:\.\d+)?)\s+(\w+)/i);
  if (burnMatch && !swapMatch && !sendMatch) {
    type = "scheduled-burn";
    const [, amt, token] = burnMatch;
    command = `Burn ${amt} ${token}`;
    name = `Burn ${amt} ${token}`;
    description = `Burn ${amt} ${token} ${intervalMs ? (intervalMs === MS_DAY ? "daily" : `every ${intervalMs / MS_HOUR}h`) : "once"}${maxRuns ? ` (${maxRuns}x)` : ""}`;
  }

  // Mint detection
  const mintMatch = input.match(/mint\s+(\d+(?:\.\d+)?)\s+(\w+)/i);
  if (mintMatch && !burnMatch && !swapMatch && !sendMatch) {
    type = "scheduled-mint";
    const [, amt, token] = mintMatch;
    command = `Mint ${amt} ${token}`;
    name = `Mint ${amt} ${token}`;
    description = `Mint ${amt} ${token} ${intervalMs ? (intervalMs === MS_DAY ? "daily" : `every ${intervalMs / MS_HOUR}h`) : "once"}${maxRuns ? ` (${maxRuns}x)` : ""}`;
  }

  // Unstake detection — "unstake 100 stDCC every day", "withdraw 50 shares daily"
  // Must be checked BEFORE stake to avoid "unstake" matching "stake"
  const unstakeMatch = input.match(/(?:unstake|undelegate|withdraw)\s+(\d+(?:\.\d+)?)\s*(?:stdcc|shares?|dcc)?/i);
  if (unstakeMatch && !swapMatch && !sendMatch && !burnMatch && !mintMatch) {
    type = "scheduled-unstake";
    const amt = unstakeMatch[1];
    command = `Unstake ${amt} stDCC`;
    name = `Unstake ${amt} stDCC`;
    const freq = intervalMs ? formatInterval(intervalMs) : "once";
    description = `Unstake ${amt} stDCC ${freq}${maxRuns ? ` (${maxRuns}x)` : ""}`;
  }

  // Stake detection — "stake 1 DCC every 60 seconds", "deposit 100 DCC daily"
  const stakeMatch = input.match(/(?<![un])(?:stake|deposit)\s+(\d+(?:\.\d+)?)\s*(?:dcc)?/i);
  if (stakeMatch && !unstakeMatch && !swapMatch && !sendMatch && !burnMatch && !mintMatch) {
    type = "scheduled-stake";
    const amt = stakeMatch[1];
    command = `Stake ${amt} DCC`;
    name = `Stake ${amt} DCC`;
    const freq = intervalMs ? formatInterval(intervalMs) : "once";
    description = `Stake ${amt} DCC ${freq}${maxRuns ? ` (${maxRuns}x)` : ""}`;
  }

  // Price alert (no swap/send — just monitoring)
  if (condition && !swapMatch && !sendMatch && !burnMatch && !mintMatch) {
    type = "price-alert";
    name = `Price Alert: DCC ${condition.direction} $${condition.threshold}`;
    command = `Check DCC price`;
    description = `Alert when DCC price goes ${condition.direction} $${condition.threshold}`;
  }

  // Balance alert
  const balanceAlert = lower.match(/(?:alert|notify|watch|monitor)\s+(?:me\s+)?(?:if|when)\s+(?:my\s+)?balance\s+(?:drops?\s+)?(?:below|under)\s+(\d+)/i);
  if (balanceAlert) {
    type = "balance-alert";
    name = `Balance Alert: below ${balanceAlert[1]} DCC`;
    command = `Check balance`;
    description = `Alert when DCC balance drops below ${balanceAlert[1]}`;
    condition = { pool: "DCC_BALANCE", direction: "below", threshold: parseFloat(balanceAlert[1]) };
  }

  // Telegram price reporter
  if (telegram && /price/i.test(lower)) {
    type = "telegram-price";
    name = `Telegram: DCC Price`;
    command = `Get DCC price and send to Telegram`;
    description = `Send DCC price to Telegram ${intervalMs === MS_DAY ? "daily" : intervalMs ? `every ${intervalMs / MS_HOUR}h` : ""}${timeOfDay ? ` at ${timeOfDay}` : ""}`;
  }

  // Telegram portfolio summary
  if (telegram && /\b(portfolio|summary|report|balance)\b/i.test(lower)) {
    type = "telegram-summary";
    name = `Telegram: Portfolio Summary`;
    command = `Get portfolio summary and send to Telegram`;
    description = `Send portfolio summary to Telegram ${intervalMs === MS_DAY ? "daily" : ""}${timeOfDay ? ` at ${timeOfDay}` : ""}`;
  }

  // Telegram tx alert
  if (telegram && /\b(transaction|tx|send|receive|transfer)\b/i.test(lower)) {
    type = "telegram-tx-alert";
    name = `Telegram: TX Alerts`;
    command = `Monitor transactions and notify via Telegram`;
    description = `Send Telegram alerts for incoming/outgoing transactions`;
  }

  // Block monitor
  if (/\b(monitor|watch|alert)\b.*\b(block|mining|production)\b/i.test(lower)) {
    type = "block-monitor";
    name = `Block Monitor`;
    command = `Monitor block production`;
    description = `Alert if block production stops`;
    if (!intervalMs) intervalMs = MS_MINUTE;
  }

  // If we got nothing useful, bail
  if (type === "recurring-report" && !telegram && !condition) return null;

  // Minimum interval safety: don't allow < 10s
  if (intervalMs !== null && intervalMs < 10_000) intervalMs = 10_000;

  return {
    name,
    description,
    action: { command, type },
    schedule: {
      intervalMs,
      timeOfDay,
      maxRuns,
      startAfter: null,
      endBefore: null,
    },
    condition,
    telegram,
  };
}

// ═══════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════

const STORAGE_KEY = "dcc-automations";

export function loadAutomations(): Automation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAutomations(automations: Automation[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(automations));
}

export function createAutomation(parsed: ParsedSchedule, walletAddress?: string): Automation {
  const now = Date.now();
  let nextRunAt: number | null = null;

  if (parsed.schedule.timeOfDay) {
    const [h, m] = parsed.schedule.timeOfDay.split(":").map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target.getTime() <= now) target.setDate(target.getDate() + 1);
    nextRunAt = target.getTime();
  } else if (parsed.schedule.intervalMs) {
    nextRunAt = now + parsed.schedule.intervalMs;
  } else if (parsed.condition) {
    // Condition-based: check every minute
    nextRunAt = now + MS_MINUTE;
  }

  const automation: Automation = {
    id: crypto.randomUUID(),
    name: parsed.name,
    description: parsed.description,
    action: parsed.action,
    schedule: parsed.schedule,
    condition: parsed.condition,
    telegram: parsed.telegram,
    status: "active",
    createdAt: now,
    lastRunAt: null,
    nextRunAt,
    runCount: 0,
    runs: [],
    walletAddress,
  };

  const existing = loadAutomations();
  existing.push(automation);
  saveAutomations(existing);

  return automation;
}

export function cancelAutomation(id: string): boolean {
  const automations = loadAutomations();
  const idx = automations.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  automations[idx].status = "cancelled";
  automations[idx].nextRunAt = null;
  saveAutomations(automations);
  return true;
}

export function pauseAutomation(id: string): boolean {
  const automations = loadAutomations();
  const idx = automations.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  automations[idx].status = "paused";
  saveAutomations(automations);
  return true;
}

export function resumeAutomation(id: string): boolean {
  const automations = loadAutomations();
  const idx = automations.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  automations[idx].status = "active";
  saveAutomations(automations);
  return true;
}

export function deleteAutomation(id: string): boolean {
  const automations = loadAutomations();
  const filtered = automations.filter((a) => a.id !== id);
  if (filtered.length === automations.length) return false;
  saveAutomations(filtered);
  return true;
}

export function getActiveAutomations(): Automation[] {
  return loadAutomations().filter((a) => a.status === "active");
}

// ═══════════════════════════════════════════
// EXECUTION ENGINE
// ═══════════════════════════════════════════

/**
 * Check if a price condition is met.
 * Returns true if the condition is satisfied.
 */
async function checkPriceCondition(condition: PriceCondition): Promise<boolean> {
  try {
    if (condition.pool === "DCC_BALANCE") return false; // handled separately
    const price = await getPoolPrice(condition.pool);
    if (!price || typeof price.price !== "number") return false;
    return condition.direction === "below"
      ? price.price < condition.threshold
      : price.price > condition.threshold;
  } catch {
    return false;
  }
}

/**
 * Check if a balance condition is met.
 */
async function checkBalanceCondition(condition: PriceCondition, address: string): Promise<boolean> {
  try {
    const bal = await getAddressBalance(address);
    return bal.available < condition.threshold;
  } catch {
    return false;
  }
}

/**
 * Send a message via Telegram Bot API.
 */
async function sendTelegramMessage(config: TelegramConfig, message: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Execute a single automation run.
 * This is called by the engine for each scheduled execution.
 *
 * The `executeCommand` callback should call `processCommand` from terminal.ts.
 */
export async function executeAutomationRun(
  automation: Automation,
  executeCommand: (command: string) => Promise<string>,
): Promise<AutomationRun> {
  const run: AutomationRun = {
    timestamp: Date.now(),
    success: false,
  };

  try {
    // Check conditions first
    if (automation.condition) {
      if (automation.condition.pool === "DCC_BALANCE") {
        if (!automation.walletAddress) {
          run.error = "No wallet connected for balance check";
          return run;
        }
        const met = await checkBalanceCondition(automation.condition, automation.walletAddress);
        if (!met) {
          run.success = true;
          run.result = "Condition not met — skipping";
          return run;
        }
      } else {
        const met = await checkPriceCondition(automation.condition);
        if (!met) {
          run.success = true;
          run.result = "Price condition not met — skipping";
          return run;
        }
      }
    }

    // Execute the command
    const result = await executeCommand(automation.action.command);

    // Send Telegram notification if configured
    if (automation.telegram?.botToken && automation.telegram?.chatId) {
      const tgMessage =
        `🤖 *DCC Automation: ${automation.name}*\n\n` +
        `${result}\n\n` +
        `_Run #${automation.runCount + 1}${automation.schedule.maxRuns ? ` of ${automation.schedule.maxRuns}` : ""}_`;
      await sendTelegramMessage(automation.telegram, tgMessage);
    }

    run.success = true;
    run.result = result;
  } catch (err) {
    run.error = err instanceof Error ? err.message : "Unknown error";
  }

  return run;
}

/**
 * Process the tick for all active automations.
 * Called periodically (every ~30s) by the AutomationEngine hook.
 */
export async function tickAutomations(
  executeCommand: (command: string) => Promise<string>,
): Promise<void> {
  const automations = loadAutomations();
  const now = Date.now();
  let changed = false;

  for (const auto of automations) {
    if (auto.status !== "active") continue;
    if (!auto.nextRunAt || now < auto.nextRunAt) continue;

    // Time to run!
    const run = await executeAutomationRun(auto, executeCommand);
    auto.runs.push(run);
    auto.runCount++;
    auto.lastRunAt = run.timestamp;

    if (!run.success && run.error) {
      // Failed — mark as failed after 3 consecutive failures
      const recentRuns = auto.runs.slice(-3);
      if (recentRuns.length >= 3 && recentRuns.every((r) => !r.success || r.error)) {
        auto.status = "failed";
        auto.nextRunAt = null;
      }
    }

    // Check if completed
    if (auto.schedule.maxRuns && auto.runCount >= auto.schedule.maxRuns) {
      auto.status = "completed";
      auto.nextRunAt = null;
    } else if (auto.schedule.endBefore && now >= auto.schedule.endBefore) {
      auto.status = "completed";
      auto.nextRunAt = null;
    } else {
      // Schedule next run
      if (auto.schedule.timeOfDay && auto.schedule.intervalMs) {
        // Recurring with specific time — next day/week at that time
        const [h, m] = auto.schedule.timeOfDay.split(":").map(Number);
        const next = new Date(now);
        next.setDate(next.getDate() + (auto.schedule.intervalMs >= MS_WEEK ? 7 : 1));
        next.setHours(h, m, 0, 0);
        auto.nextRunAt = next.getTime();
      } else if (auto.schedule.intervalMs) {
        auto.nextRunAt = now + auto.schedule.intervalMs;
      } else if (auto.condition) {
        // Condition-based: check again in 1 minute
        auto.nextRunAt = now + MS_MINUTE;
      } else {
        // One-shot with no recurrence
        auto.status = "completed";
        auto.nextRunAt = null;
      }
    }

    changed = true;
  }

  if (changed) saveAutomations(automations);
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

export function formatNextRun(auto: Automation): string {
  if (!auto.nextRunAt) return "—";
  const diff = auto.nextRunAt - Date.now();
  if (diff < 0) return "Overdue";
  if (diff < MS_MINUTE) return `${Math.round(diff / 1000)}s`;
  if (diff < MS_HOUR) return `${Math.round(diff / MS_MINUTE)}m`;
  if (diff < MS_DAY) return `${Math.round(diff / MS_HOUR)}h`;
  return `${Math.round(diff / MS_DAY)}d`;
}

export function formatAutomationType(type: AutomationType): string {
  const map: Record<AutomationType, string> = {
    "scheduled-swap": "Scheduled Swap",
    "scheduled-send": "Scheduled Send",
    "scheduled-burn": "Scheduled Burn",
    "scheduled-mint": "Scheduled Mint",
    "scheduled-stake": "Scheduled Stake",
    "scheduled-unstake": "Scheduled Unstake",
    "price-alert": "Price Alert",
    "price-trigger-swap": "Price Trigger",
    "balance-alert": "Balance Alert",
    "block-monitor": "Block Monitor",
    "telegram-price": "TG Price Bot",
    "telegram-summary": "TG Summary",
    "telegram-tx-alert": "TG TX Alert",
    "recurring-report": "Report",
  };
  return map[type] || type;
}

export function getAutomationIcon(type: AutomationType): string {
  const map: Record<AutomationType, string> = {
    "scheduled-swap": "↔",
    "scheduled-send": "→",
    "scheduled-burn": "🔥",
    "scheduled-mint": "⚡",
    "scheduled-stake": "🥩",
    "scheduled-unstake": "📤",
    "price-alert": "📊",
    "price-trigger-swap": "🎯",
    "balance-alert": "💰",
    "block-monitor": "🔍",
    "telegram-price": "📱",
    "telegram-summary": "📋",
    "telegram-tx-alert": "🔔",
    "recurring-report": "📈",
  };
  return map[type] || "⏰";
}
