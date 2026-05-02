/**
 * Queue + nonce manager tests.
 *
 * We can't test against a real RPC here, but we CAN test the
 * serialization invariant — which is the whole reason the queue
 * exists. Every task on the same chain MUST execute in submit order
 * and MUST receive a unique, monotonically-increasing nonce.
 *
 * The queue exposes a `__setNonceReader` test hook so we don't have
 * to mock viem.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import { withChainLock, resetNonce, __setNonceReader, __resetNonceReader } from "../src/queue";

const STARTING_NONCE = 7;
const acct = "0x000000000000000000000000000000000000beef" as const;

before(() => {
  __setNonceReader(async () => STARTING_NONCE);
});

after(() => {
  __resetNonceReader();
});

describe("queue / nonce", () => {
  it("hands out monotonically increasing nonces", async () => {
    resetNonce(99);
    const out: number[] = [];
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        withChainLock(99, acct, async (n) => {
          // Add a tiny async hop so the runtime isn't tempted to
          // optimize-away the queueing.
          await Promise.resolve();
          out.push(n);
          return i;
        }),
      ),
    );
    assert.deepEqual(out, [
      STARTING_NONCE,
      STARTING_NONCE + 1,
      STARTING_NONCE + 2,
      STARTING_NONCE + 3,
      STARTING_NONCE + 4,
    ]);
  });

  it("does NOT advance nonce on failure (so the same nonce is retried)", async () => {
    resetNonce(98);
    // First call fails. Queue should drop its cached nonce.
    await assert.rejects(
      withChainLock(98, acct, async () => {
        throw new Error("simulated broadcast error");
      }),
      /simulated broadcast error/,
    );
    // Second call should re-fetch the on-chain nonce — which our hook
    // pins to STARTING_NONCE — rather than advancing past it.
    const got = await withChainLock(98, acct, async (n) => n);
    assert.equal(got, STARTING_NONCE);
  });

  it("serializes — second task waits for the first", async () => {
    resetNonce(97);
    const order: string[] = [];
    const t1 = withChainLock(97, acct, async () => {
      order.push("a-start");
      await new Promise((r) => setTimeout(r, 30));
      order.push("a-end");
      return 1;
    });
    const t2 = withChainLock(97, acct, async () => {
      order.push("b-start");
      order.push("b-end");
      return 2;
    });
    await Promise.all([t1, t2]);
    assert.deepEqual(order, ["a-start", "a-end", "b-start", "b-end"]);
  });

  it("isolates tails per chain", async () => {
    resetNonce(96);
    resetNonce(95);
    const order: string[] = [];
    const slow = withChainLock(96, acct, async () => {
      await new Promise((r) => setTimeout(r, 40));
      order.push("slow-96");
      return 1;
    });
    // Different chain — should NOT block on chain 96's slow task.
    const fast = withChainLock(95, acct, async () => {
      order.push("fast-95");
      return 1;
    });
    await Promise.all([slow, fast]);
    assert.deepEqual(order, ["fast-95", "slow-96"]);
  });
});
