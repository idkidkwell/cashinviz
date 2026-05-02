/**
 * Chain registry + client cache.
 *
 * The original relayer created a fresh viem `PublicClient` and
 * `WalletClient` on every request. Two problems with that:
 *   1. Connection-pool churn on the RPC endpoint.
 *   2. Nonce races — two concurrent relays on the same chain would
 *      both read the deployer's nonce, get the same value, and one
 *      of them would later revert with "nonce already used".
 *
 * Caching one client per chain fixes both. Concurrent writes on the
 * same chain serialize through `queue.ts`'s `withChainLock`, which
 * tracks nonce in memory and passes it explicitly to `writeContract`.
 *
 * Per-chain knobs:
 *   - `minFeeWei`: override the global RELAYER_FEE for this chain.
 *     Useful because 0.001 ETH on mainnet is reasonable but 0.001
 *     ETH on Polygon (paid in MATIC) is nonsense. Set per-chain via
 *     `RELAYER_MIN_FEE_<chainId>` in wei (e.g. `RELAYER_MIN_FEE_137=
 *     50000000000000000` = 0.05 MATIC).
 *   - `nativeSymbol`: cosmetic — appears in /health.
 *   - `privateMempool`: Flashbots-style private RPC. Only set for
 *     mainnet by default; op-stack L2s don't have meaningful MEV so
 *     adding private endpoints there is a honeypot.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Chain,
  type PublicClient,
  type WalletClient,
} from "viem";
import {
  mainnet,
  sepolia,
  polygon,
  arbitrum,
  optimism,
  base,
  bsc,
  avalanche,
  gnosis,
} from "viem/chains";
import type { PrivateKeyAccount } from "viem/accounts";
import { getTorFetch } from "./tor";

export interface ChainEntry {
  chain: Chain;
  rpcUrl: string;
  name: string;
  nativeSymbol: string;
  /** True if this chain has a Flashbots / private-tx endpoint we can use. */
  privateMempool?: string;
  /** Override the global min fee for this chain. Falls back to RELAYER_FEE. */
  minFeeWei?: bigint;
}

function envMinFee(chainId: number): bigint | undefined {
  const raw = process.env[`RELAYER_MIN_FEE_${chainId}`];
  if (!raw) return undefined;
  try {
    return BigInt(raw);
  } catch {
    return undefined;
  }
}

export const CHAINS: Record<number, ChainEntry> = {
  1: {
    chain: mainnet,
    rpcUrl: process.env.RPC_URL_MAINNET || "https://eth.llamarpc.com",
    name: "Ethereum",
    nativeSymbol: "ETH",
    privateMempool: process.env.FLASHBOTS_RPC_URL || "https://rpc.flashbots.net",
    minFeeWei: envMinFee(1),
  },
  11155111: {
    chain: sepolia,
    rpcUrl: process.env.RPC_URL_SEPOLIA || "https://ethereum-sepolia-rpc.publicnode.com",
    name: "Sepolia",
    nativeSymbol: "ETH",
    minFeeWei: envMinFee(11155111),
  },
  137: {
    chain: polygon,
    rpcUrl: process.env.RPC_URL_POLYGON || "https://polygon-rpc.com",
    name: "Polygon",
    nativeSymbol: "MATIC",
    minFeeWei: envMinFee(137),
  },
  42161: {
    chain: arbitrum,
    rpcUrl: process.env.RPC_URL_ARBITRUM || "https://arb1.arbitrum.io/rpc",
    name: "Arbitrum",
    nativeSymbol: "ETH",
    minFeeWei: envMinFee(42161),
  },
  10: {
    chain: optimism,
    rpcUrl: process.env.RPC_URL_OPTIMISM || "https://mainnet.optimism.io",
    name: "Optimism",
    nativeSymbol: "ETH",
    minFeeWei: envMinFee(10),
  },
  8453: {
    chain: base,
    rpcUrl: process.env.RPC_URL_BASE || "https://mainnet.base.org",
    name: "Base",
    nativeSymbol: "ETH",
    minFeeWei: envMinFee(8453),
  },
  56: {
    chain: bsc,
    rpcUrl: process.env.RPC_URL_BSC || "https://bsc-dataseed.binance.org",
    name: "BSC",
    nativeSymbol: "BNB",
    minFeeWei: envMinFee(56),
  },
  43114: {
    chain: avalanche,
    rpcUrl: process.env.RPC_URL_AVALANCHE || "https://api.avax.network/ext/bc/C/rpc",
    name: "Avalanche",
    nativeSymbol: "AVAX",
    minFeeWei: envMinFee(43114),
  },
  100: {
    chain: gnosis,
    rpcUrl: process.env.RPC_URL_GNOSIS || "https://rpc.gnosischain.com",
    name: "Gnosis",
    nativeSymbol: "xDAI",
    minFeeWei: envMinFee(100),
  },
};

// ── Client cache ─────────────────────────────────────────────

const publicClientCache = new Map<number, PublicClient>();
const walletClientCache = new Map<number, WalletClient>();

function chainEntryOrThrow(chainId: number): ChainEntry {
  const entry = CHAINS[chainId];
  if (!entry) {
    throw Object.assign(new Error(`unsupported chain: ${chainId}`), {
      statusCode: 400,
      code: "unsupported_chain",
    });
  }
  return entry;
}

function transport(url: string, timeout: number) {
  // If Tor is enabled, swap viem's fetch for our SOCKS5-backed one.
  // We don't enable `batch: true` on Tor because coalescing requests
  // across a Tor circuit delays EVERY call by up to the batch window;
  // latency beats throughput here.
  const torFetch = getTorFetch();
  if (torFetch) {
    return http(url, { timeout, fetchFn: torFetch });
  }
  return http(url, { batch: true, timeout });
}

export function getPublicClient(chainId: number): PublicClient {
  const cached = publicClientCache.get(chainId);
  if (cached) return cached;
  const entry = chainEntryOrThrow(chainId);
  const client = createPublicClient({
    chain: entry.chain,
    transport: transport(entry.rpcUrl, 10_000),
  });
  publicClientCache.set(chainId, client);
  return client;
}

export function getWalletClient(
  chainId: number,
  account: PrivateKeyAccount,
  opts: { privateMempool?: boolean } = {},
): WalletClient {
  const cacheKey = opts.privateMempool ? chainId + 1_000_000 : chainId;
  const cached = walletClientCache.get(cacheKey);
  if (cached) return cached;
  const entry = chainEntryOrThrow(chainId);
  const rpcUrl = opts.privateMempool && entry.privateMempool ? entry.privateMempool : entry.rpcUrl;
  const client = createWalletClient({
    account,
    chain: entry.chain,
    transport: transport(rpcUrl, 15_000),
  });
  walletClientCache.set(cacheKey, client);
  return client;
}

export function listChains(): { chainId: number; name: string; nativeSymbol: string }[] {
  return Object.entries(CHAINS).map(([id, e]) => ({
    chainId: Number(id),
    name: e.name,
    nativeSymbol: e.nativeSymbol,
  }));
}

/**
 * Effective minimum fee for this chain. Falls back to the given
 * `globalDefault` (i.e., RELAYER_FEE) when no per-chain override.
 */
export function minFeeFor(chainId: number, globalDefault: bigint): bigint {
  const entry = CHAINS[chainId];
  return entry?.minFeeWei ?? globalDefault;
}
