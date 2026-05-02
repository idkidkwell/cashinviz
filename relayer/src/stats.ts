/**
 * Persistent stats.
 *
 * The previous relayer kept all counters in-memory, so a restart (or
 * a hot-reload during dev) lost every number the operator might have
 * pointed at. This writes a flat JSON file next to the process, with
 * a debounced flush so we don't beat up the disk.
 *
 * The file is best-effort; a corrupt file is simply reset. Losing
 * historical stats isn't worth crashing on startup.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { log } from "./logger";

const STATS_PATH = process.env.STATS_FILE || ".stats.json";

export interface Stats {
  totalRelayed: number;
  totalFeeEarnedWei: string; // bigint-as-string for JSON
  relayedByChain: Record<string, number>;
  relayedByEndpoint: Record<string, number>;
  failed: number;
  startTime: number;
}

function freshStats(): Stats {
  return {
    totalRelayed: 0,
    totalFeeEarnedWei: "0",
    relayedByChain: {},
    relayedByEndpoint: {},
    failed: 0,
    startTime: Date.now(),
  };
}

function load(): Stats {
  try {
    if (!existsSync(STATS_PATH)) return freshStats();
    const raw = readFileSync(STATS_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<Stats>;
    return {
      ...freshStats(),
      ...parsed,
      relayedByChain: parsed.relayedByChain ?? {},
      relayedByEndpoint: parsed.relayedByEndpoint ?? {},
    };
  } catch (e) {
    log.warn("stats file corrupt, starting fresh", { error: (e as Error).message });
    return freshStats();
  }
}

const state = load();

let flushTimer: NodeJS.Timeout | null = null;
function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    try {
      writeFileSync(STATS_PATH, JSON.stringify(state, null, 2));
    } catch (e) {
      log.warn("stats flush failed", { error: (e as Error).message });
    }
  }, 2_000); // Debounce 2s — coalesce bursts.
}

export function recordRelay(chainId: number, endpoint: string, feeWei: bigint): void {
  state.totalRelayed++;
  state.totalFeeEarnedWei = (BigInt(state.totalFeeEarnedWei) + feeWei).toString();
  state.relayedByChain[String(chainId)] = (state.relayedByChain[String(chainId)] ?? 0) + 1;
  state.relayedByEndpoint[endpoint] = (state.relayedByEndpoint[endpoint] ?? 0) + 1;
  scheduleFlush();
}

export function recordFailure(): void {
  state.failed++;
  scheduleFlush();
}

export function snapshot(): Readonly<Stats> & { uptimeSeconds: number } {
  return { ...state, uptimeSeconds: Math.floor((Date.now() - state.startTime) / 1000) };
}

export function flushNow(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  try {
    writeFileSync(STATS_PATH, JSON.stringify(state, null, 2));
  } catch {
    // best-effort
  }
}

/**
 * Zero out every counter (admin-only). The startTime is reset too,
 * so `uptimeSeconds` becomes "uptime since last reset" rather than
 * "process uptime" — matches operator intent when they're checking
 * a freshly-deployed config.
 */
export function resetStats(): void {
  const fresh = freshStats();
  state.totalRelayed = fresh.totalRelayed;
  state.totalFeeEarnedWei = fresh.totalFeeEarnedWei;
  state.relayedByChain = fresh.relayedByChain;
  state.relayedByEndpoint = fresh.relayedByEndpoint;
  state.failed = fresh.failed;
  state.startTime = fresh.startTime;
  flushNow();
}
