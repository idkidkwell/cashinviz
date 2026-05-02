/**
 * In-flight nullifier deduplication.
 *
 * The attack we're defending against is wasted-gas griefing: an
 * attacker (or a buggy client that retries on timeout) submits the
 * same (chainId, nullifier) twice in quick succession. Both pass
 * validation. Both hit simulation. The first one broadcasts and
 * confirms. The second simulates AFTER the first confirms — reverts
 * on `nullifier already used` — we've burned two sim+estimate round
 * trips and a rate-limit slot for nothing.
 *
 * Fix: a per-(chain, nullifier) mutex. The second submit rejects
 * with 409 immediately. TTL is short (60s) because after that the
 * on-chain `nullifierHashes()` view will catch duplicates for us.
 */
const inFlight = new Map<string, number>(); // key -> expiresAt (ms epoch)
const TTL_MS = 60_000;

function keyOf(chainId: number, nullifier: string): string {
  return `${chainId}:${nullifier.toLowerCase()}`;
}

function sweep(now: number): void {
  // O(n) sweep of expired entries. n is bounded by concurrent submits,
  // which is bounded by the write rate limit, so this is effectively
  // free. We lazy-sweep on claim instead of running a timer — one
  // less resource to leak during shutdown.
  for (const [k, exp] of inFlight) {
    if (exp <= now) inFlight.delete(k);
  }
}

/**
 * Attempt to claim exclusive in-flight ownership of a nullifier.
 * Returns true if the caller owns it; false if another caller is
 * currently submitting it.
 */
export function claimNullifier(chainId: number, nullifier: string): boolean {
  const now = Date.now();
  sweep(now);
  const key = keyOf(chainId, nullifier);
  const existing = inFlight.get(key);
  if (existing && existing > now) return false;
  inFlight.set(key, now + TTL_MS);
  return true;
}

/**
 * Release the claim. Call this once the submit settles (success
 * or failure). A released claim frees the slot immediately rather
 * than waiting for the TTL.
 */
export function releaseNullifier(chainId: number, nullifier: string): void {
  inFlight.delete(keyOf(chainId, nullifier));
}

/** Number of in-flight claims — surfaced on /metrics. */
export function inFlightCount(): number {
  return inFlight.size;
}
