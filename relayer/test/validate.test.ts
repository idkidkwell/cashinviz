/**
 * Validator unit tests.
 *
 * Run with: `npm test`
 *
 * Why we test these specifically: every relay endpoint pulls untyped
 * JSON off the wire and feeds it to viem. A wrong validator at the
 * edge means malformed values reach `eth_call`, which surfaces as a
 * useless error message and a wasted RPC round trip. We test the edge
 * cases (odd-length hex, exact-byte mismatches, empty proof, numeric
 * overflow) once here so we don't have to reason about them in every
 * handler.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ValidationError,
  asAddress,
  asBytes32,
  asProof,
  asBigInt,
  asChainId,
} from "../src/validate";

describe("asAddress", () => {
  it("accepts a 20-byte hex address", () => {
    const addr = asAddress("0x1234567890aBcdef1234567890ABCDEF12345678", "addr");
    assert.equal(addr, "0x1234567890aBcdef1234567890ABCDEF12345678");
  });

  it("rejects non-string input", () => {
    assert.throws(() => asAddress(42 as unknown, "addr"), ValidationError);
  });

  it("rejects missing 0x prefix", () => {
    assert.throws(
      () => asAddress("1234567890abcdef1234567890abcdef12345678", "addr"),
      ValidationError,
    );
  });

  it("rejects wrong length", () => {
    assert.throws(() => asAddress("0xdead", "addr"), ValidationError);
    assert.throws(
      () => asAddress("0x1234567890abcdef1234567890abcdef1234567890", "addr"),
      ValidationError,
    );
  });

  it("rejects odd-length hex", () => {
    assert.throws(
      () => asAddress("0x1234567890abcdef1234567890abcdef1234567", "addr"),
      ValidationError,
    );
  });

  it("rejects non-hex characters", () => {
    assert.throws(
      () => asAddress("0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ", "addr"),
      ValidationError,
    );
  });
});

describe("asBytes32", () => {
  it("accepts a 32-byte hex value", () => {
    const v = asBytes32(`0x${"a".repeat(64)}`, "h");
    assert.equal(v, `0x${"a".repeat(64)}`);
  });

  it("rejects 31-byte hex", () => {
    assert.throws(() => asBytes32(`0x${"a".repeat(62)}`, "h"), ValidationError);
  });

  it("rejects 33-byte hex", () => {
    assert.throws(() => asBytes32(`0x${"a".repeat(66)}`, "h"), ValidationError);
  });
});

describe("asProof", () => {
  it("accepts an empty proof (0x) — fixture-mode", () => {
    // The Noir circuit dev workflow occasionally feeds a placeholder
    // empty proof to test the surrounding plumbing. We accept it at
    // the edge; the contract will be the one that rejects on invalid
    // verification.
    assert.equal(asProof("0x"), "0x");
  });

  it("accepts a 14KB proof (real UltraHonk size)", () => {
    const proof = `0x${"ab".repeat(14_000)}`;
    assert.equal(asProof(proof), proof);
  });

  it("rejects a >64KB payload", () => {
    const proof = `0x${"ab".repeat(64 * 1024 + 1)}`;
    assert.throws(() => asProof(proof), ValidationError);
  });

  it("rejects non-hex content", () => {
    assert.throws(() => asProof("not-hex"), ValidationError);
  });
});

describe("asBigInt", () => {
  it("accepts a decimal numeric string", () => {
    assert.equal(asBigInt("1000000000000000000", "x"), 10n ** 18n);
  });

  it("accepts a 0x-hex string", () => {
    assert.equal(asBigInt("0x10", "x"), 16n);
  });

  it("accepts a safe integer number", () => {
    assert.equal(asBigInt(42, "x"), 42n);
  });

  it("rejects a non-safe-integer number", () => {
    // 2^53 + 1 is silently truncated by JS; we want users to send
    // strings instead so we don't lose precision.
    assert.throws(() => asBigInt(Number.MAX_SAFE_INTEGER + 1, "x"), ValidationError);
  });

  it("rejects negative", () => {
    assert.throws(() => asBigInt(-1, "x"), ValidationError);
  });

  it("enforces min", () => {
    assert.throws(() => asBigInt("5", "x", { min: 10n }), ValidationError);
    assert.equal(asBigInt("10", "x", { min: 10n }), 10n);
  });

  it("enforces max", () => {
    assert.throws(() => asBigInt("11", "x", { max: 10n }), ValidationError);
    assert.equal(asBigInt("10", "x", { max: 10n }), 10n);
  });

  it("rejects garbage strings", () => {
    assert.throws(() => asBigInt("abc", "x"), ValidationError);
    assert.throws(() => asBigInt("12.5", "x"), ValidationError);
  });
});

describe("asChainId", () => {
  it("accepts a positive integer", () => {
    assert.equal(asChainId(1), 1);
    assert.equal(asChainId(11155111), 11155111);
  });

  it("accepts a numeric string (URL params)", () => {
    assert.equal(asChainId("137"), 137);
  });

  it("rejects zero / negative / non-integer", () => {
    assert.throws(() => asChainId(0), ValidationError);
    assert.throws(() => asChainId(-1), ValidationError);
    assert.throws(() => asChainId(1.5), ValidationError);
    assert.throws(() => asChainId("abc"), ValidationError);
  });
});
