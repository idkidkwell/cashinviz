/**
 * Per-chain transaction queue with explicit nonce management.
 *
 * Why this exists: viem's default nonce handling reads
 * `eth_getTransactionCount` on every `writeContract` call. Under
 * concurrent relay requests on the same chain, two handlers both read
 * nonce N, both sign tx N, and whichever one the node accepts first
 * wins — the other reverts with "nonce too low" AFTER we've paid the
 * simulation+estimation cost.
 *
 * Fix: serialize all writes per-chain through an async queue, and
 * track the next nonce in-memory. The queue releases nonces
 * one-at-a-time so there is no race. If the chain's reported nonce
 * ever drifts ahead of ours (e.g., the operator sent a manual tx),
 * we resync on the next submit.
 */

import { getPublicClient } from "./chains";
import { log } from "./logger";

interface ChainState {
  /** Serial tail — every submit awaits the previous one. */
  tail: Promise<unknown>;
  /** Next nonce to hand out. `undefined` until first fetch. */
  nextNonce: number | undefined;
}

const state = new Map<number, ChainState>();

function ensure(chainId: number): ChainState {
  let s = state.get(chainId);
  if (!s) {
    s = { tail: Promise.resolve(), nextNonce: undefined };
    state.set(chainId, s);
  }
  return s;
}

// ── Nonce reader injection (for tests) ──────────────────────
//
// Production reads through getPublicClient. Tests can swap this for
// a stub so the queue's serialization logic can be exercised without
// a live RPC. Keeping the injection point here (vs. faking the whole
// chains module) keeps the dependency graph simple.

type NonceReader = (chainId: number, account: `0x${string}`) => Promise<number>;

const defaultReader: NonceReader = async (chainId, account) => {
  const client = getPublicClient(chainId);
  return await client.getTransactionCount({ address: account, blockTag: "pending" });
};

let reader: NonceReader = defaultReader;

/** Test hook — override the on-chain nonce read. */
export function __setNonceReader(r: NonceReader): void {
  reader = r;
}

/** Test hook — restore the production reader. */
export function __resetNonceReader(): void {
  reader = defaultReader;
}

/**
 * Run `fn` exclusively for `chainId` with a guaranteed-correct nonce.
 * The nonce is passed in. If the RPC reports a different nonce than
 * we expect (drift from external sends), the queue resyncs.
 */
export async function withChainLock<T>(
  chainId: number,
  account: `0x${string}`,
  fn: (nonce: number) => Promise<T>,
): Promise<T> {
  const s = ensure(chainId);

  // Chain the new work onto the existing tail. We never .catch() the
  // tail here — each caller handles its own errors — but we do swallow
  // the promise rejection at the queue level so one bad tx doesn't
  // poison all subsequent ones.
  const run = s.tail.then(async () => {
    // First submit, or resync after a gap: read the authoritative nonce.
    if (s.nextNonce === undefined) {
      const onchain = await reader(chainId, account);
      s.nextNonce = onchain;
      log.debug("nonce init", { chainId, nonce: onchain });
    }

    const nonce = s.nextNonce;
    try {
      const result = await fn(nonce);
      // Only advance on success. If a submit fails (simulation revert,
      // broadcast error), the same nonce is reused for the next submit.
      s.nextNonce = nonce + 1;
      return result;
    } catch (err) {
      // Drop our cached nonce so the next submit resyncs. This recovers
      // from stuck-nonce situations where the node's view drifted from
      // ours (e.g., chain reorg, mempool drop, manual send).
      s.nextNonce = undefined;
      throw err;
    }
  });

  // Keep the tail alive even if this task rejects.
  s.tail = run.catch(() => undefined);

  return run;
}

/**
 * Force-resync the cached nonce on the next submit. Useful after the
 * operator sends a manual tx out-of-band.
 */
export function resetNonce(chainId: number): void {
  const s = state.get(chainId);
  if (s) s.nextNonce = undefined;
}

/** Queue depth — number of pending tasks waiting on the tail. */
export function queueDepth(chainId: number): number {
  // We don't track exact depth; this is a best-effort indicator that
  // the queue exists. Exact tracking would require a counter.
  return state.has(chainId) ? 1 : 0;
}
