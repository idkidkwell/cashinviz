/**
 * Shamir's Secret Sharing — Social Recovery for Deposit Notes
 *
 * The #1 fear with mixers: "If I lose my note, my funds are gone forever."
 *
 * This solves it. Split your note into N shares, give to trusted contacts.
 * Any K of N shares can reconstruct the original note. Nobody can reconstruct
 * with fewer than K shares — even K-1 shares reveal ZERO information.
 *
 * Example: Split into 5 shares, threshold 3.
 *   - Give 1 share to your partner
 *   - Give 1 share to your best friend
 *   - Give 1 share to your lawyer
 *   - Give 1 share to your safe deposit box
 *   - Keep 1 share yourself
 *   → Any 3 can recover. Losing 2 is fine. No single person can steal.
 *
 * Uses GF(256) arithmetic (Galois Field) — standard for Shamir's.
 * Runs entirely client-side. Nothing leaves the browser.
 */

// ── GF(256) Arithmetic ───────────────────────────────────────
// Galois Field with irreducible polynomial x^8 + x^4 + x^3 + x + 1

const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);

// Build lookup tables
(function initTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x = x ^ (x << 1) ^ (x >= 128 ? 0x11b : 0);
    x &= 0xff;
  }
  EXP_TABLE[255] = EXP_TABLE[0];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
}

function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero");
  if (a === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] - LOG_TABLE[b] + 255) % 255];
}

// ── Shamir's Secret Sharing ──────────────────────────────────

/**
 * Split a secret into N shares with threshold K.
 * @param secret The secret bytes to split.
 * @param totalShares N — total number of shares to create.
 * @param threshold K — minimum shares needed to reconstruct.
 * @returns Array of N shares, each as { index, data }.
 */
export function splitSecret(
  secret: Uint8Array,
  totalShares: number,
  threshold: number
): Share[] {
  if (threshold > totalShares) throw new Error("Threshold cannot exceed total shares");
  if (threshold < 2) throw new Error("Threshold must be at least 2");
  if (totalShares > 255) throw new Error("Maximum 255 shares");

  const shares: Share[] = [];

  for (let i = 0; i < totalShares; i++) {
    shares.push({
      index: i + 1, // 1-indexed (x=0 is the secret itself)
      data: new Uint8Array(secret.length),
    });
  }

  // For each byte of the secret, create a random polynomial and evaluate
  for (let byteIdx = 0; byteIdx < secret.length; byteIdx++) {
    // Random polynomial coefficients: a[0] = secret byte, a[1..k-1] = random
    const coeffs = new Uint8Array(threshold);
    coeffs[0] = secret[byteIdx];
    crypto.getRandomValues(coeffs.subarray(1));

    // Evaluate polynomial at x = 1, 2, ..., N
    for (let shareIdx = 0; shareIdx < totalShares; shareIdx++) {
      const x = shareIdx + 1;
      let y = 0;

      for (let power = threshold - 1; power >= 0; power--) {
        y = gfMul(y, x) ^ coeffs[power];
      }

      shares[shareIdx].data[byteIdx] = y;
    }
  }

  return shares;
}

/**
 * Reconstruct the secret from K or more shares.
 * @param shares Array of at least K shares.
 * @returns The reconstructed secret bytes.
 */
export function reconstructSecret(shares: Share[]): Uint8Array {
  if (shares.length < 2) throw new Error("Need at least 2 shares");

  const secretLength = shares[0].data.length;
  const secret = new Uint8Array(secretLength);

  // Lagrange interpolation at x = 0
  for (let byteIdx = 0; byteIdx < secretLength; byteIdx++) {
    let value = 0;

    for (let i = 0; i < shares.length; i++) {
      const xi = shares[i].index;
      const yi = shares[i].data[byteIdx];

      // Compute Lagrange basis polynomial L_i(0)
      let basis = 1;
      for (let j = 0; j < shares.length; j++) {
        if (i === j) continue;
        const xj = shares[j].index;
        // L_i(0) = product of (0 - xj) / (xi - xj) = product of xj / (xi ^ xj)
        basis = gfMul(basis, gfDiv(xj, xi ^ xj));
      }

      value ^= gfMul(yi, basis);
    }

    secret[byteIdx] = value;
  }

  return secret;
}

// ── Share type and serialization ─────────────────────────────

export interface Share {
  index: number; // 1-255
  data: Uint8Array;
}

/**
 * Serialize a share to a human-readable string.
 * Format: recovery-<index>-<hex data>
 */
export function serializeShare(share: Share): string {
  const hex = Array.from(share.data)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `recovery-${share.index}-${hex}`;
}

/**
 * Deserialize a share from a string.
 */
export function deserializeShare(shareString: string): Share {
  const parts = shareString.split("-");
  if (parts.length !== 3 || parts[0] !== "recovery") {
    throw new Error("Invalid share format");
  }

  const index = parseInt(parts[1]);
  const hex = parts[2];
  const data = new Uint8Array(hex.length / 2);

  for (let i = 0; i < data.length; i++) {
    data[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }

  return { index, data };
}

// ── High-level API for notes ─────────────────────────────────

/**
 * Split a deposit note string into recovery shares.
 */
export function splitNote(
  noteString: string,
  totalShares: number,
  threshold: number
): string[] {
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(noteString);
  const shares = splitSecret(secretBytes, totalShares, threshold);
  return shares.map(serializeShare);
}

/**
 * Reconstruct a deposit note string from recovery shares.
 */
export function reconstructNote(shareStrings: string[]): string {
  const shares = shareStrings.map(deserializeShare);
  const secretBytes = reconstructSecret(shares);
  return new TextDecoder().decode(secretBytes);
}
