/**
 * Privacy Mixer — Relayer Server
 *
 * Endpoints:
 *   POST /relay              ETH / ERC-20 fixed-denomination mixer
 *   POST /relay/shielded     Unified shielded-pool withdrawal
 *   POST /relay/transfer     Private intra-pool transfer (no fee, no
 *                            funds move — just submit the tx over a
 *                            throwaway IP)
 *   POST /relay/yield        YieldPool withdrawal (ETH + yield)
 *   POST /relay/cross-chain  CrossChainBridge withdrawal
 *   GET  /health             Liveness + chain reachability + balances
 *   GET  /metrics            Prometheus-compatible metrics
 *   GET  /status/:chain/:contract/:nullifier
 *   GET  /admin/balance      [admin]  Per-chain relayer balance + key addr
 *   POST /admin/stats/reset  [admin]  Zero out persistent stats
 *   POST /admin/nonce/reset  [admin]  Force nonce resync on next submit
 *
 * Hardening over the previous version:
 *   - Every request goes through input validation (hex lengths, address
 *     format, proof size cap, numeric bounds) before hitting viem.
 *   - In-flight nullifier dedup: same (chain, nullifier) submitted
 *     twice in quick succession → second request 409 immediately.
 *   - Pre-flight nullifier `eth_call` view check: cheaper than
 *     simulating the full withdraw circuit if we already know the
 *     spend is bad.
 *   - Every write is preflight-simulated with eth_call so reverts
 *     happen *before* we pay gas.
 *   - Per-chain serial queue + in-memory nonce so concurrent submits
 *     on the same chain don't race for the same nonce.
 *   - Per-endpoint rate limiting instead of one global bucket.
 *   - Optional `RELAYER_API_KEY` for gating submissions, separate
 *     `RELAYER_ADMIN_KEY` for `/admin/*`.
 *   - Graceful SIGINT/SIGTERM — in-flight txs drain before exit.
 *   - Structured JSON logs with secret redaction + request IDs.
 *   - Per-chain min-fee overrides via `RELAYER_MIN_FEE_<chainId>`.
 *   - Request duration histograms exposed in /metrics.
 *   - Optional Tor SOCKS5 transport for outbound RPC privacy.
 *   - Optional CORS allowlist via `CORS_ORIGINS` env.
 *   - Persistent stats to disk.
 *   - Optional Flashbots private-tx routing on mainnet to prevent
 *     withdrawal MEV.
 */

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { parseEther, formatEther, type Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";

import { log } from "./logger";
import {
  CHAINS,
  getPublicClient,
  getWalletClient,
  listChains,
  minFeeFor,
} from "./chains";
import {
  MIXER_WITHDRAW_ABI,
  SHIELDED_WITHDRAW_ABI,
  SHIELDED_TRANSFER_ABI,
  YIELD_WITHDRAW_ABI,
  CROSS_CHAIN_WITHDRAW_ABI,
  NULLIFIER_VIEW_ABI,
} from "./abis";
import {
  ValidationError,
  asAddress,
  asBigInt,
  asBytes32,
  asChainId,
  asProof,
} from "./validate";
import { flushNow, recordFailure, recordRelay, snapshot, resetStats } from "./stats";
import { withChainLock, resetNonce } from "./queue";
import { claimNullifier, releaseNullifier, inFlightCount } from "./dedup";
import { observeDuration, renderDurationMetrics } from "./metrics";
import { isTorEnabled } from "./tor";

dotenv.config();

// ── Config ───────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "4000");
const RELAYER_FEE_MIN = parseEther(process.env.RELAYER_FEE || "0.001");
const RELAYER_KEY = process.env.RELAYER_PRIVATE_KEY;
const API_KEY = process.env.RELAYER_API_KEY; // optional
const ADMIN_KEY = process.env.RELAYER_ADMIN_KEY; // optional, separate from API_KEY
const USE_PRIVATE_MEMPOOL = process.env.USE_PRIVATE_MEMPOOL === "true";
const TX_CONFIRM_TIMEOUT_MS = parseInt(process.env.TX_CONFIRM_TIMEOUT_MS || "120000");
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);

if (!RELAYER_KEY) {
  log.error("RELAYER_PRIVATE_KEY not set");
  process.exit(1);
}

const account = privateKeyToAccount(RELAYER_KEY as `0x${string}`);

// ── App middleware ───────────────────────────────────────────

const app = express();
app.disable("x-powered-by");
// Trust the first proxy hop so `req.ip` reflects the real client when
// the relayer sits behind nginx/Caddy/Cloudflare. Without this, every
// request looks like it came from 127.0.0.1 and the rate limiter melts.
app.set("trust proxy", 1);

app.use(helmet());

// CORS: allowlist if `CORS_ORIGINS` is set, otherwise wide-open. Wide-
// open is the right default for a censorship-resistant relayer; the
// allowlist is for operators running behind their own dapp UI.
if (CORS_ORIGINS.length > 0) {
  app.use(
    cors({
      origin: (origin, cb) => {
        // Same-origin / curl / server-to-server: no Origin header. Allow.
        if (!origin) return cb(null, true);
        cb(null, CORS_ORIGINS.includes(origin));
      },
      credentials: false,
    }),
  );
} else {
  app.use(cors());
}

app.use(express.json({ limit: "2mb" }));

// ── Request ID + access logging middleware ──────────────────

declare module "express-serve-static-core" {
  interface Request {
    id: string;
    startedAt: number;
  }
}

app.use((req, res, next) => {
  const incoming = req.headers["x-request-id"];
  req.id = typeof incoming === "string" && incoming.length <= 128 ? incoming : randomUUID();
  req.startedAt = Date.now();
  res.setHeader("X-Request-Id", req.id);
  res.on("finish", () => {
    const dur = Date.now() - req.startedAt;
    // Don't observe 404s — they pollute the histogram with bot scans.
    if (res.statusCode !== 404) observeDuration(req.path, dur);
    log.info("http", {
      reqId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durMs: dur,
    });
  });
  next();
});

// Write-heavy endpoints: 10 req / IP / min. Read-only endpoints get
// a looser 120 / min. The reason they're separate buckets: under an
// outage, status-checks from the UI shouldn't eat the write quota.
const writeLimit = rateLimit({
  windowMs: 60_000,
  max: parseInt(process.env.WRITE_RATE_LIMIT || "10"),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited", retryAfterSeconds: 60 },
});
const readLimit = rateLimit({
  windowMs: 60_000,
  max: parseInt(process.env.READ_RATE_LIMIT || "120"),
  standardHeaders: true,
  legacyHeaders: false,
});

// Optional API-key gate for /relay/*. Apply after rate limiting so we
// don't leak gate status under a DoS.
function apiKeyGate(req: Request, res: Response, next: NextFunction): void {
  if (!API_KEY) return next();
  const presented = req.headers["x-api-key"];
  if (typeof presented === "string" && presented === API_KEY) return next();
  res.status(401).json({ error: "unauthorized" });
}

// Stricter gate for /admin/*. Always required (admin endpoints don't
// open up to the world) and uses a SEPARATE key so that compromising
// the public API key doesn't grant control of the operator's stats /
// nonce reset.
function adminGate(req: Request, res: Response, next: NextFunction): void {
  if (!ADMIN_KEY) {
    res.status(404).json({ error: "not_found" }); // 404, not 403, to hide admin-mode existence
    return;
  }
  const presented = req.headers["x-admin-key"];
  if (typeof presented === "string" && presented === ADMIN_KEY) return next();
  res.status(401).json({ error: "unauthorized" });
}

// Wrap an async handler so unhandled rejections become 500s with
// consistent logging instead of crashing the process.
function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch((err) => {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: "validation_error", field: err.field, detail: err.message });
        return;
      }
      // Some errors we raise inside the relay pipeline (simulation
      // revert, tx reverted on-chain, unsupported chain, in-flight
      // dup) carry a `statusCode` + `code` attached. Honor those
      // instead of the default 500 so the client gets a meaningful
      // error shape.
      const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
      const code = typeof err?.code === "string" ? err.code : "internal_error";
      if (status >= 500) {
        log.error("handler threw", {
          reqId: req.id,
          endpoint: req.path,
          code,
          error: err?.message ?? String(err),
        });
        recordFailure();
      } else {
        log.info("handler rejected", { reqId: req.id, endpoint: req.path, code, status });
      }
      res.status(status).json({
        error: code,
        detail: err?.shortMessage ?? err?.message ?? "relay failed",
      });
      void next;
    });
  };
}

// ── Core relay helper ────────────────────────────────────────

interface RelayCallArgs {
  chainId: number;
  contractAddress: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  endpoint: string;
  relayerFeeWei: bigint;
  /**
   * Optional nullifier for pre-flight view check + in-flight dedup.
   * Transfer endpoint passes `inputNullifier` here. Mixer/shielded/
   * yield/cross-chain pass `nullifierHash`.
   */
  nullifier?: `0x${string}`;
  usePrivateMempool?: boolean;
  reqId: string;
}

/**
 * Preflight-simulate and then broadcast a relayed transaction.
 *
 * Returns the transaction hash once the tx is accepted and confirmed.
 * Waits for ONE confirmation with a bounded timeout so the HTTP
 * handler doesn't hang indefinitely on a stuck chain.
 *
 * Pipeline:
 *   1. claim nullifier (or 409 if duplicate in-flight)
 *   2. cheap nullifier-spent view check (or 409 if already on-chain)
 *   3. simulate (full withdraw circuit revert check)
 *   4. estimate gas
 *   5. acquire per-chain serial lock + nonce → broadcast
 *   6. wait for receipt (outside lock — once broadcast, nonce is owned)
 *   7. release nullifier claim
 */
async function submitRelay(args: RelayCallArgs): Promise<{ txHash: string; blockNumber: string }> {
  const {
    chainId,
    contractAddress,
    abi,
    functionName,
    args: callArgs,
    endpoint,
    relayerFeeWei,
    nullifier,
    reqId,
  } = args;

  const publicClient = getPublicClient(chainId);
  const walletClient = getWalletClient(chainId, account, {
    privateMempool: args.usePrivateMempool ?? USE_PRIVATE_MEMPOOL,
  });

  // 1. In-flight dedup. If two clients submit the same nullifier in
  // quick succession, the second gets 409 immediately rather than
  // burning a sim+estimate round trip.
  if (nullifier) {
    if (!claimNullifier(chainId, nullifier)) {
      throw Object.assign(new Error("duplicate submission in-flight"), {
        statusCode: 409,
        code: "duplicate_in_flight",
      });
    }
  }

  try {
    // 2. Pre-flight nullifier check. One eth_call vs full simulation.
    // Skipped for transfer (it has no nullifierHashes mapping with the
    // same shape — transfer uses a different on-chain set). We pass
    // `nullifier` only when the contract exposes the standard view.
    if (nullifier && functionName !== "shieldedTransfer") {
      const spent = (await publicClient.readContract({
        address: contractAddress,
        abi: NULLIFIER_VIEW_ABI,
        functionName: "nullifierHashes",
        args: [nullifier],
      })) as boolean;
      if (spent) {
        throw Object.assign(new Error("nullifier already spent on-chain"), {
          statusCode: 409,
          code: "nullifier_spent",
        });
      }
    }

    // 3. Preflight: would this call revert?
    try {
      await publicClient.simulateContract({
        account,
        address: contractAddress,
        abi,
        functionName,
        args: callArgs as readonly unknown[],
      });
    } catch (err: unknown) {
      const e = err as { shortMessage?: string; message?: string };
      const detail = e.shortMessage ?? e.message ?? "simulation reverted";
      throw Object.assign(new Error(detail), { statusCode: 400, code: "simulation_reverted" });
    }

    // 4. Estimate gas so we catch quiet out-of-gas failures before broadcast.
    const gas = await publicClient.estimateContractGas({
      account,
      address: contractAddress,
      abi,
      functionName,
      args: callArgs as readonly unknown[],
    });

    // 5. Acquire the per-chain serial lock and broadcast with an
    // explicit nonce. The lock holds for one writeContract — we
    // release it the moment the node accepts the tx.
    const txHash = await withChainLock(chainId, account.address, async (nonce) => {
      log.debug("relay sending", { reqId, chainId, endpoint, nonce, gas: gas.toString() });
      return await walletClient.writeContract({
        address: contractAddress,
        abi,
        functionName,
        args: callArgs as readonly unknown[],
        // Cap at 20% headroom over the estimate. Prevents a node from
        // quietly letting us burn all our ETH on a griefing tx.
        gas: (gas * 120n) / 100n,
        nonce,
      } as Parameters<typeof walletClient.writeContract>[0]);
    });

    log.info("relay broadcast", { reqId, chainId, endpoint, txHash, gas: gas.toString() });

    // 6. Wait for confirmation. Outside the lock — the nonce is ours,
    // and other submits can already be queued behind us.
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: TX_CONFIRM_TIMEOUT_MS,
    });

    if (receipt.status !== "success") {
      throw Object.assign(new Error("transaction reverted on-chain"), {
        statusCode: 500,
        code: "tx_reverted",
      });
    }

    recordRelay(chainId, endpoint, relayerFeeWei);
    log.info("relay confirmed", {
      reqId,
      chainId,
      endpoint,
      txHash,
      block: receipt.blockNumber.toString(),
    });

    return { txHash, blockNumber: receipt.blockNumber.toString() };
  } finally {
    // 7. Always release the nullifier claim. On success the on-chain
    // view will block re-submits anyway; on failure we want the slot
    // freed so the user can retry with a fresh proof.
    if (nullifier) releaseNullifier(chainId, nullifier);
  }
}

// ── Liveness + info ──────────────────────────────────────────

app.get("/health", readLimit, asyncHandler(async (_req, res) => {
  // Real health check: can we reach each RPC, and do we have funds
  // there? Report per-chain so an operator can see at a glance which
  // chain needs a top-up — without shipping a SaaS.
  const results = await Promise.all(
    Object.entries(CHAINS).map(async ([id, entry]) => {
      const chainId = Number(id);
      try {
        const client = getPublicClient(chainId);
        const [block, balance] = await Promise.all([
          client.getBlockNumber(),
          client.getBalance({ address: account.address }),
        ]);
        return {
          chainId,
          name: entry.name,
          ok: true,
          block: block.toString(),
          balanceWei: balance.toString(),
          balanceFormatted: `${formatEther(balance)} ${entry.nativeSymbol}`,
          minFee: minFeeFor(chainId, RELAYER_FEE_MIN).toString(),
        };
      } catch (e) {
        return { chainId, name: entry.name, ok: false, error: (e as Error).message };
      }
    }),
  );

  const allHealthy = results.every((r) => r.ok);
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "ok" : "degraded",
    relayer: account.address,
    minFee: RELAYER_FEE_MIN.toString(),
    minFeeFormatted: formatEther(RELAYER_FEE_MIN) + " ETH",
    privateMempool: USE_PRIVATE_MEMPOOL,
    tor: isTorEnabled(),
    inFlight: inFlightCount(),
    chains: results,
    stats: snapshot(),
  });
}));

app.get("/chains", readLimit, (_req, res) => {
  res.json({ chains: listChains() });
});

// ── Prometheus metrics ──────────────────────────────────────

app.get("/metrics", (_req, res) => {
  const s = snapshot();
  const lines: string[] = [
    "# HELP relayer_total_relayed Total successful relays",
    "# TYPE relayer_total_relayed counter",
    `relayer_total_relayed ${s.totalRelayed}`,
    "# HELP relayer_failed_total Total failed relays",
    "# TYPE relayer_failed_total counter",
    `relayer_failed_total ${s.failed}`,
    "# HELP relayer_fees_earned_wei Sum of fees earned (wei)",
    "# TYPE relayer_fees_earned_wei counter",
    `relayer_fees_earned_wei ${s.totalFeeEarnedWei}`,
    "# HELP relayer_uptime_seconds Seconds since start",
    "# TYPE relayer_uptime_seconds gauge",
    `relayer_uptime_seconds ${s.uptimeSeconds}`,
    "# HELP relayer_in_flight In-flight nullifier claims",
    "# TYPE relayer_in_flight gauge",
    `relayer_in_flight ${inFlightCount()}`,
  ];
  for (const [chain, n] of Object.entries(s.relayedByChain)) {
    lines.push(`relayer_relayed_by_chain{chain_id="${chain}"} ${n}`);
  }
  for (const [ep, n] of Object.entries(s.relayedByEndpoint)) {
    lines.push(`relayer_relayed_by_endpoint{endpoint="${ep}"} ${n}`);
  }
  for (const line of renderDurationMetrics()) lines.push(line);
  res.setHeader("Content-Type", "text/plain; version=0.0.4");
  res.send(lines.join("\n") + "\n");
});

// ── /relay (fixed-denomination Mixer / ERC20Mixer) ──────────

app.post("/relay", writeLimit, apiKeyGate, asyncHandler(async (req, res) => {
  const chainId = asChainId(req.body?.chainId);
  const minFee = minFeeFor(chainId, RELAYER_FEE_MIN);
  const mixerAddress = asAddress(req.body?.mixerAddress, "mixerAddress");
  const proof = asProof(req.body?.proof);
  const root = asBytes32(req.body?.root, "root");
  const nullifierHash = asBytes32(req.body?.nullifierHash, "nullifierHash");
  const recipient = asAddress(req.body?.recipient, "recipient");
  const relayerFee = asBigInt(req.body?.relayerFee, "relayerFee", { min: minFee });

  const result = await submitRelay({
    chainId,
    contractAddress: mixerAddress,
    abi: MIXER_WITHDRAW_ABI as unknown as Abi,
    functionName: "withdraw",
    args: [proof, root, nullifierHash, recipient, account.address, relayerFee],
    endpoint: "mixer",
    relayerFeeWei: relayerFee,
    nullifier: nullifierHash,
    usePrivateMempool: chainId === 1, // mainnet only
    reqId: req.id,
  });

  res.json({ success: true, ...result });
}));

// ── /relay/shielded (unified ShieldedPool) ──────────────────

app.post("/relay/shielded", writeLimit, apiKeyGate, asyncHandler(async (req, res) => {
  const chainId = asChainId(req.body?.chainId);
  const minFee = minFeeFor(chainId, RELAYER_FEE_MIN);
  const poolAddress = asAddress(req.body?.poolAddress, "poolAddress");
  const proof = asProof(req.body?.proof);
  const root = asBytes32(req.body?.root, "root");
  const nullifierHash = asBytes32(req.body?.nullifierHash, "nullifierHash");
  const recipient = asAddress(req.body?.recipient, "recipient");
  const token = asAddress(req.body?.token, "token");
  const amount = asBigInt(req.body?.amount, "amount", { min: 1n });
  const relayerFee = asBigInt(req.body?.relayerFee, "relayerFee", { min: minFee });

  const result = await submitRelay({
    chainId,
    contractAddress: poolAddress,
    abi: SHIELDED_WITHDRAW_ABI as unknown as Abi,
    functionName: "withdraw",
    args: [proof, root, nullifierHash, recipient, token, amount, account.address, relayerFee],
    endpoint: "shielded",
    relayerFeeWei: relayerFee,
    nullifier: nullifierHash,
    usePrivateMempool: chainId === 1,
    reqId: req.id,
  });

  res.json({ success: true, ...result });
}));

// ── /relay/transfer (intra-pool private transfer) ───────────

/// No on-chain payout → no relayer fee. The relayer still gets the
/// privacy benefit of hiding the submitter's IP, but earns nothing.
/// Gated behind apiKeyGate if the operator doesn't want to donate
/// gas to the world.
app.post("/relay/transfer", writeLimit, apiKeyGate, asyncHandler(async (req, res) => {
  const chainId = asChainId(req.body?.chainId);
  const poolAddress = asAddress(req.body?.poolAddress, "poolAddress");
  const proof = asProof(req.body?.proof);
  const root = asBytes32(req.body?.root, "root");
  const inputNullifier = asBytes32(req.body?.inputNullifier, "inputNullifier");
  const outputCommitment1 = asBytes32(req.body?.outputCommitment1, "outputCommitment1");
  const outputCommitment2 = asBytes32(req.body?.outputCommitment2, "outputCommitment2");

  const result = await submitRelay({
    chainId,
    contractAddress: poolAddress,
    abi: SHIELDED_TRANSFER_ABI as unknown as Abi,
    functionName: "shieldedTransfer",
    args: [proof, root, inputNullifier, outputCommitment1, outputCommitment2],
    endpoint: "transfer",
    relayerFeeWei: 0n,
    // Dedup uses the input nullifier — a transfer's "spend" identifier.
    // Pre-flight view check is skipped (transfer storage layout differs);
    // submitRelay handles that branch.
    nullifier: inputNullifier,
    usePrivateMempool: chainId === 1,
    reqId: req.id,
  });

  res.json({ success: true, ...result });
}));

// ── /relay/yield (YieldPool withdrawal) ─────────────────────

app.post("/relay/yield", writeLimit, apiKeyGate, asyncHandler(async (req, res) => {
  const chainId = asChainId(req.body?.chainId);
  const minFee = minFeeFor(chainId, RELAYER_FEE_MIN);
  const poolAddress = asAddress(req.body?.poolAddress, "poolAddress");
  const proof = asProof(req.body?.proof);
  const root = asBytes32(req.body?.root, "root");
  const nullifierHash = asBytes32(req.body?.nullifierHash, "nullifierHash");
  const recipient = asAddress(req.body?.recipient, "recipient");
  const amount = asBigInt(req.body?.amount, "amount", { min: 1n });
  const relayerFee = asBigInt(req.body?.relayerFee, "relayerFee", { min: minFee });

  const result = await submitRelay({
    chainId,
    contractAddress: poolAddress,
    abi: YIELD_WITHDRAW_ABI as unknown as Abi,
    functionName: "withdraw",
    args: [proof, root, nullifierHash, recipient, amount, account.address, relayerFee],
    endpoint: "yield",
    relayerFeeWei: relayerFee,
    nullifier: nullifierHash,
    usePrivateMempool: chainId === 1,
    reqId: req.id,
  });

  res.json({ success: true, ...result });
}));

// ── /relay/cross-chain (CrossChainBridge) ───────────────────

app.post("/relay/cross-chain", writeLimit, apiKeyGate, asyncHandler(async (req, res) => {
  const destChainId = asChainId(req.body?.destinationChainId, "destinationChainId");
  const minFee = minFeeFor(destChainId, RELAYER_FEE_MIN);
  const bridgeAddress = asAddress(req.body?.bridgeAddress, "bridgeAddress");
  const proof = asProof(req.body?.proof);
  const sourceChain = asBigInt(req.body?.sourceChain, "sourceChain", { min: 1n });
  const root = asBytes32(req.body?.root, "root");
  const nullifierHash = asBytes32(req.body?.nullifierHash, "nullifierHash");
  const recipient = asAddress(req.body?.recipient, "recipient");
  const token = asAddress(req.body?.token, "token");
  const amount = asBigInt(req.body?.amount, "amount", { min: 1n });
  const relayerFee = asBigInt(req.body?.relayerFee, "relayerFee", { min: minFee });

  const result = await submitRelay({
    chainId: destChainId,
    contractAddress: bridgeAddress,
    abi: CROSS_CHAIN_WITHDRAW_ABI as unknown as Abi,
    functionName: "crossChainWithdraw",
    args: [
      proof,
      sourceChain,
      root,
      nullifierHash,
      recipient,
      token,
      amount,
      account.address,
      relayerFee,
    ],
    endpoint: "cross-chain",
    relayerFeeWei: relayerFee,
    nullifier: nullifierHash,
    usePrivateMempool: destChainId === 1,
    reqId: req.id,
  });

  res.json({ success: true, ...result });
}));

// ── Nullifier status ────────────────────────────────────────

app.get("/status/:chainId/:contractAddress/:nullifierHash", readLimit, asyncHandler(async (req, res) => {
  const chainId = asChainId(req.params.chainId);
  const contractAddress = asAddress(req.params.contractAddress, "contractAddress");
  const nullifierHash = asBytes32(req.params.nullifierHash, "nullifierHash");

  const client = getPublicClient(chainId);
  const spent = await client.readContract({
    address: contractAddress,
    abi: NULLIFIER_VIEW_ABI,
    functionName: "nullifierHashes",
    args: [nullifierHash],
  });

  res.json({ spent });
}));

// ── Admin endpoints ─────────────────────────────────────────

/// All gated by `RELAYER_ADMIN_KEY`. If unset, /admin/* returns 404
/// (not 403) so an attacker can't fingerprint admin presence.

app.get("/admin/balance", adminGate, asyncHandler(async (_req, res) => {
  const results = await Promise.all(
    Object.entries(CHAINS).map(async ([id, entry]) => {
      const chainId = Number(id);
      try {
        const balance = await getPublicClient(chainId).getBalance({ address: account.address });
        return {
          chainId,
          name: entry.name,
          balanceWei: balance.toString(),
          balanceFormatted: `${formatEther(balance)} ${entry.nativeSymbol}`,
        };
      } catch (e) {
        return { chainId, name: entry.name, error: (e as Error).message };
      }
    }),
  );
  res.json({ relayer: account.address, balances: results });
}));

app.post("/admin/stats/reset", adminGate, (_req, res) => {
  resetStats();
  log.warn("admin: stats reset");
  res.json({ ok: true });
});

app.post("/admin/nonce/reset", adminGate, (req, res) => {
  const chainIdRaw = req.body?.chainId;
  if (chainIdRaw === undefined || chainIdRaw === null) {
    res.status(400).json({ error: "chainId required" });
    return;
  }
  const chainId = asChainId(chainIdRaw);
  resetNonce(chainId);
  log.warn("admin: nonce reset", { chainId });
  res.json({ ok: true, chainId });
});

// ── 404 + error handling ────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

// ── Graceful shutdown ───────────────────────────────────────

const server = app.listen(PORT, () => {
  log.info("relayer started", {
    address: account.address,
    port: PORT,
    minFee: formatEther(RELAYER_FEE_MIN) + " ETH",
    chains: Object.keys(CHAINS).length,
    apiKey: !!API_KEY,
    adminKey: !!ADMIN_KEY,
    privateMempool: USE_PRIVATE_MEMPOOL,
    tor: isTorEnabled(),
    corsAllowlist: CORS_ORIGINS.length,
  });
});

let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info("shutting down", { signal });
  // Stop accepting new requests but let in-flight ones drain.
  server.close(() => {
    flushNow();
    log.info("shutdown complete");
    process.exit(0);
  });
  // Hard-kill after 15s if in-flight requests hang.
  setTimeout(() => {
    log.warn("shutdown timeout — forcing exit");
    flushNow();
    process.exit(1);
  }, 15_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (err) => {
  log.error("uncaughtException", { error: err.message, stack: err.stack });
});
process.on("unhandledRejection", (reason) => {
  log.error("unhandledRejection", { reason: String(reason) });
});
