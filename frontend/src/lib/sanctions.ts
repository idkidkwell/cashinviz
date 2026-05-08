/**
 * OFAC sanctions screening at the wallet-connect step.
 *
 * Wraps Chainalysis's Free Sanctions Screening API:
 *   https://public.chainalysis.com/api/v1/address/{address}
 *
 * The API is fully public (no key needed), funded by Chainalysis as
 * a public good after the OFAC sanctions on Tornado Cash put every
 * EVM dApp at risk. It returns an `identifications` array — empty
 * means clean, populated means the address shows up on at least one
 * sanctions list (OFAC SDN, Office of Financial Sanctions
 * Implementation, EU consolidated, etc.).
 *
 * Why this is in the frontend, not the contracts: putting a sanctions
 * check ON-CHAIN would mean the protocol decides who can transact,
 * which is the censorship vector we're trying to prevent. Doing the
 * check in the frontend means:
 *   - Cashinviz the website refuses to serve a UI to sanctioned
 *     addresses (legal-ops protection — keeps US/EU operators out
 *     of FinCEN-registration territory).
 *   - The protocol on-chain doesn't care. Anyone can interact via
 *     a forked frontend, a CLI, a custom proof builder, etc. The
 *     sanctioned dApp surface is opt-in.
 *
 * The result is cached in-memory for the session because Chainalysis
 * rate-limits at ~10 req/min/IP for the public endpoint.
 */

const CHAINALYSIS_ENDPOINT = "https://public.chainalysis.com/api/v1/address";

/** One identification entry from the Chainalysis response. */
export interface SanctionsIdentification {
  /** Source list, e.g. "SDN", "OFAC", "EU Consolidated". */
  source: string;
  /** Human-readable category, e.g. "sanctions". */
  category: string;
  /** Canonical name, e.g. "Tornado.Cash". */
  name: string;
  /** Free-text description from the issuing authority. */
  description?: string;
  /** ISO date the address was first added. */
  url?: string;
}

export interface SanctionsResult {
  address: `0x${string}`;
  /** True if the address appears on at least one sanctions list. */
  sanctioned: boolean;
  /** Empty array on a clean check; non-empty on a hit. */
  identifications: SanctionsIdentification[];
  /** Wall-clock timestamp the check was performed. Useful for the UI. */
  checkedAt: number;
}

const cache = new Map<string, SanctionsResult>();

/**
 * Check a single address against the sanctions API. Cached
 * per-session (the result is unlikely to change within minutes;
 * for a paranoid app, set cache TTL to a few minutes).
 *
 * The function is fail-OPEN on network errors — if the sanctions
 * API is down, we let the user proceed rather than locking them
 * out. That's a deliberate choice: a privacy mixer's UX failure
 * mode shouldn't be "Chainalysis decided" — but we DO surface the
 * error so the user knows the check didn't run.
 */
export async function checkSanctions(
  address: `0x${string}`,
  options: { signal?: AbortSignal } = {},
): Promise<SanctionsResult> {
  const lowercased = address.toLowerCase() as `0x${string}`;
  const cached = cache.get(lowercased);
  if (cached) return cached;

  let identifications: SanctionsIdentification[] = [];
  try {
    const res = await fetch(`${CHAINALYSIS_ENDPOINT}/${lowercased}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: options.signal,
      // Don't send cookies / credentials — the endpoint is public and
      // shouldn't see anything that fingerprints the user's session.
      credentials: "omit",
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { identifications?: SanctionsIdentification[] };
      identifications = data.identifications ?? [];
    }
  } catch (e) {
    // Fail open — see function docstring.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[Cashinviz] sanctions check failed (failing open):", e);
    }
  }

  const result: SanctionsResult = {
    address: lowercased,
    sanctioned: identifications.length > 0,
    identifications,
    checkedAt: Date.now(),
  };
  cache.set(lowercased, result);
  return result;
}

/**
 * Hand-test bypass for development. Set NEXT_PUBLIC_SKIP_SANCTIONS=1
 * locally if you're working offline or against a regtest chain. Never
 * ship this in production builds.
 */
export function isSanctionsCheckEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SKIP_SANCTIONS !== "1";
}
