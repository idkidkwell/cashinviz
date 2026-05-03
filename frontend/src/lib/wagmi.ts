import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
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
} from "wagmi/chains";

// ── Why this file is shaped this way ────────────────────────────────
// Previously we used `getDefaultConfig` with a placeholder WalletConnect
// project ID. That made the WalletConnect connector eagerly try to open a
// relay WSS connection on mount, hanging the "Connect Wallet" modal for
// 10-15 seconds before the user could even click MetaMask.
//
// Fixes applied here:
// 1. WalletConnect is ONLY registered when a real project ID is set via
//    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID. No placeholder = no dead WSS.
// 2. Injected / MetaMask are listed first so they load instantly via
//    window.ethereum (no network round-trip).
// 3. Transports use explicit http() with a short timeout and batching, so
//    chain-metadata probes don't block the UI.
// ────────────────────────────────────────────────────────────────────

// WalletConnect / Reown project ID. Despite the name, this is NOT a
// secret — it's a public identifier the WalletConnect cloud uses to
// attribute connection traffic to a project (the way Google Analytics
// uses a property ID). Uniswap / Aave / Lido all hardcode theirs in
// open-source frontends. Hardcoding ours here means a fresh clone of
// this repo Just Works without an .env file. Forks who want their
// connection metrics in their own Reown dashboard can override via
// NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID at build time.
const CASHINVIZ_WC_PROJECT_ID = "714dac64d9ad9183b836f85bceb3fdec";
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || CASHINVIZ_WC_PROJECT_ID;
const hasRealProjectId =
  !!walletConnectProjectId &&
  walletConnectProjectId !== "YOUR_PROJECT_ID" &&
  walletConnectProjectId.length > 8;

// Chains we actually ship to. Keep the list tight — every extra chain adds
// RPC probes, connector chain-switch listeners, and wallet-icon assets.
export const chains = [
  mainnet,
  sepolia,
  arbitrum,
  optimism,
  base,
  polygon,
  bsc,
  avalanche,
  gnosis,
] as const;

// Fast-path connectors (no network on load). Listed first so the modal
// renders them before WalletConnect's deferred init finishes.
const recommended = [injectedWallet, metaMaskWallet, coinbaseWallet, rainbowWallet];
const others = hasRealProjectId ? [walletConnectWallet] : [];

export const connectors = connectorsForWallets(
  [
    { groupName: "Recommended", wallets: recommended },
    ...(others.length ? [{ groupName: "Other", wallets: others }] : []),
  ],
  {
    appName: "Cashinviz",
    // connectorsForWallets requires a string — use a harmless placeholder
    // when we don't have a real one. Since walletConnectWallet is omitted
    // above unless `hasRealProjectId`, this value is never actually used.
    projectId: hasRealProjectId ? (walletConnectProjectId as string) : "disabled",
  },
);

// ── Privacy-respecting RPC defaults ─────────────────────────────────
// A mixer's whole value proposition collapses if the RPC provider can
// see every `eth_getBalance` / `eth_call` / `eth_getLogs` for the user's
// address. The defaults below are picked to minimise that leak:
//
// • Mainnet → MEV Blocker Full Privacy (`/fullprivacy`). Encrypts user
//   transactions to private builders, hides them from the public mempool,
//   and the operator commits to not logging IPs. Tradeoff: slightly
//   slower inclusion if no privacy-aware builder bids on the slot —
//   acceptable for withdraw txs since slow > sandwiched.
// • Other chains → publicnode.com. Their privacy policy commits to no
//   IP/header logging. Not as strong as MEV Blocker but better than
//   the Alchemy/Infura defaults wagmi falls back to.
//
// EVERY entry is overridable via `NEXT_PUBLIC_RPC_<chainId>` so an
// operator running their own node, Lava gateway, Tor-bridged endpoint,
// etc. can swap in something stronger without forking the file.
//
// Note: the CSP `connect-src` allowlist in next.config.mjs is the
// matching list. If you add a new chain or swap a default URL, update
// next.config.mjs in the same commit or the browser will block it.
const PRIVACY_RPCS: Record<number, string> = {
  [mainnet.id]:   "https://rpc.mevblocker.io/fullprivacy",
  [sepolia.id]:   "https://ethereum-sepolia-rpc.publicnode.com",
  [arbitrum.id]:  "https://arbitrum-one-rpc.publicnode.com",
  [optimism.id]:  "https://optimism-rpc.publicnode.com",
  [base.id]:      "https://base-rpc.publicnode.com",
  [polygon.id]:   "https://polygon-bor-rpc.publicnode.com",
  [bsc.id]:       "https://bsc-rpc.publicnode.com",
  [avalanche.id]: "https://avalanche-c-chain-rpc.publicnode.com",
  [gnosis.id]:    "https://gnosis-rpc.publicnode.com",
};

function rpcUrlFor(chainId: number): string | undefined {
  // Operator override wins. We read from process.env so Next.js
  // statically inlines the values at build time — no runtime lookup,
  // no chance for an attacker who poisons the env to redirect live
  // traffic post-deploy.
  const override = (process.env as Record<string, string | undefined>)[
    `NEXT_PUBLIC_RPC_${chainId}`
  ];
  return override || PRIVACY_RPCS[chainId];
}

// Explicit transports: short timeout, batched requests. Wagmi's default is
// batching=off and timeout=10s which makes cold-start feel frozen.
const transportOpts = { batch: true, timeout: 3_000 } as const;

export const config = createConfig({
  chains,
  connectors,
  ssr: true,
  transports: {
    [mainnet.id]:   http(rpcUrlFor(mainnet.id),   transportOpts),
    [sepolia.id]:   http(rpcUrlFor(sepolia.id),   transportOpts),
    [arbitrum.id]:  http(rpcUrlFor(arbitrum.id),  transportOpts),
    [optimism.id]:  http(rpcUrlFor(optimism.id),  transportOpts),
    [base.id]:      http(rpcUrlFor(base.id),      transportOpts),
    [polygon.id]:   http(rpcUrlFor(polygon.id),   transportOpts),
    [bsc.id]:       http(rpcUrlFor(bsc.id),       transportOpts),
    [avalanche.id]: http(rpcUrlFor(avalanche.id), transportOpts),
    [gnosis.id]:    http(rpcUrlFor(gnosis.id),    transportOpts),
  },
});

// Contract addresses per chain — update after deployment.
// Zero addresses mean "not deployed yet on this chain". Use the
// `getMixerFactoryAddress` helper below at any call site that's about
// to send a transaction — it throws instead of silently sending funds
// to address(0) (which would burn them irrecoverably).
export const MIXER_FACTORY_ADDRESSES: Record<number, `0x${string}`> = {
  // Sepolia testnet — first live deploy of Cashinviz, 2026-04
  // Tx batch: see contracts/deployments/11155111.json
  11155111: "0x61D24047882cED4C022fFf1725A3B325aDdD186f",
  // Mainnet — pending audit
  1: "0x0000000000000000000000000000000000000000",
};

// Other deployed contracts on each chain. Read directly when the
// frontend needs to talk to a specific pool (ShieldedPool for the
// shielded-transfer flow, YieldPool for the yield page, etc.).
// Source of truth: contracts/deployments/<chainId>.json.
export const DEPLOYED_CONTRACTS: Record<
  number,
  {
    verifier: `0x${string}`;
    shieldedPool: `0x${string}`;
    yieldPool: `0x${string}`;
    crossChainBridge: `0x${string}`;
  }
> = {
  11155111: {
    verifier: "0x1Ba838af0f4539aC11b5c4098Bf40AE474046B4F",
    shieldedPool: "0x1bBd9937A470b0Ae5aab7Acd3E57163360c4ce44",
    yieldPool: "0xE8bBa4dC808d4cf7f93AB57efa1a2a6025A869Db",
    crossChainBridge: "0x5C7132eB1b9EC4a1D9295f646011C38727B1Db71",
  },
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export class MixerNotDeployedError extends Error {
  constructor(public readonly chainId: number) {
    super(
      `Cashinviz is not deployed on chain ${chainId}. ` +
        `Switch to a supported network or deploy the contracts on this chain first.`,
    );
    this.name = "MixerNotDeployedError";
  }
}

/**
 * Resolve the MixerFactory address for the connected chain, or throw
 * if the chain isn't supported / the contract is the placeholder zero
 * address. Always call this before constructing a transaction — never
 * read MIXER_FACTORY_ADDRESSES[chainId] directly at a write site.
 */
export function getMixerFactoryAddress(chainId: number | undefined): `0x${string}` {
  if (chainId === undefined) throw new MixerNotDeployedError(-1);
  const addr = MIXER_FACTORY_ADDRESSES[chainId];
  if (!addr || addr.toLowerCase() === ZERO_ADDRESS) {
    throw new MixerNotDeployedError(chainId);
  }
  return addr;
}

export function isMixerDeployedOn(chainId: number | undefined): boolean {
  if (chainId === undefined) return false;
  const addr = MIXER_FACTORY_ADDRESSES[chainId];
  return !!addr && addr.toLowerCase() !== ZERO_ADDRESS;
}

// Raw denomination values (in wei) — labels are built dynamically from chain
export const DENOMINATION_VALUES = [
  BigInt("100000000000000000"),    // 0.1
  BigInt("1000000000000000000"),   // 1
  BigInt("10000000000000000000"),  // 10
  BigInt("100000000000000000000"), // 100
];

// Native token symbol per chain ID
export const NATIVE_TOKEN: Record<number, string> = {
  1: "ETH",         // Ethereum
  11155111: "ETH",   // Sepolia
  137: "MATIC",      // Polygon
  42161: "ETH",      // Arbitrum
  10: "ETH",         // Optimism
  8453: "ETH",       // Base
  56: "BNB",         // BSC
  43114: "AVAX",     // Avalanche
  100: "xDAI",       // Gnosis
};

// Get denominations with correct token symbol for the connected chain
export function getDenominations(chainId: number | undefined) {
  const symbol = NATIVE_TOKEN[chainId ?? 1] ?? "ETH";
  return DENOMINATION_VALUES.map((value) => ({
    label: `${Number(value) / 1e18} ${symbol}`,
    value,
    symbol,
  }));
}
