/**
 * Dedup tests.
 *
 * The behavior we care about: two simultaneous claims for the same
 * (chain, nullifier) MUST resolve to one winner; the second-attempt
 * caller can retry only after the first releases (or after TTL).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { claimNullifier, releaseNullifier, inFlightCount } from "../src/dedup";

const N = "0x" + "ab".repeat(32);
const N2 = "0x" + "cd".repeat(32);

describe("dedup", () => {
  it("first claim wins, second loses", () => {
    assert.equal(claimNullifier(1, N), true);
    assert.equal(claimNullifier(1, N), false);
    releaseNullifier(1, N);
  });

  it("releasing frees the slot", () => {
    assert.equal(claimNullifier(2, N), true);
    releaseNullifier(2, N);
    assert.equal(claimNullifier(2, N), true);
    releaseNullifier(2, N);
  });

  it("claims are scoped by chain", () => {
    assert.equal(claimNullifier(3, N), true);
    // Same nullifier on a different chain should be its own slot —
    // a user can legitimately have the same secret on Polygon and
    // Arbitrum (separate proofs, separate pools).
    assert.equal(claimNullifier(4, N), true);
    releaseNullifier(3, N);
    releaseNullifier(4, N);
  });

  it("case-insensitive nullifier matching", () => {
    const lower = "0x" + "ef".repeat(32);
    const upper = "0x" + "EF".repeat(32);
    assert.equal(claimNullifier(5, lower), true);
    assert.equal(claimNullifier(5, upper), false);
    releaseNullifier(5, lower);
  });

  it("inFlightCount tracks active claims", () => {
    const before = inFlightCount();
    assert.equal(claimNullifier(6, N), true);
    assert.equal(claimNullifier(6, N2), true);
    assert.equal(inFlightCount(), before + 2);
    releaseNullifier(6, N);
    releaseNullifier(6, N2);
    assert.equal(inFlightCount(), before);
  });
});
