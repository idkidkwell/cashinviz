"use client";

const FEATURE_CATEGORIES = [
  {
    title: "Privacy Engine",
    features: [
      { name: "Zero-Knowledge Proofs (Noir + UltraPLONK)", desc: "Client-side proof generation, no trusted setup" },
      { name: "Shielded Transfers", desc: "Move funds inside the pool without revealing sender or receiver" },
      { name: "Stealth Payments", desc: "One-time addresses generated per payment via ECC" },
      { name: "Cross-Asset Obfuscation", desc: "Deposit ETH, withdraw USDC — breaks token-type correlation" },
      { name: "Monero Privacy Route", desc: "Optional double-layer: XMR ring signatures + ZK proofs" },
      { name: "CoinJoin Mixing", desc: "Collaborative transaction mixing — multiple users in one tx" },
    ],
  },
  {
    title: "Anti-Surveillance",
    features: [
      { name: "AI Anti-Surveillance Decoys", desc: "Fake deposits & chaff transfers poison chain analysis" },
      { name: "Multi-Path Withdrawals", desc: "Split across up to 10 addresses with staggered delays" },
      { name: "Time-Locked Withdrawals", desc: "Configurable 1h–7d delay with random jitter" },
      { name: "MEV Shield (Commit-Reveal)", desc: "Encrypted intents prevent front-running and sandwich attacks" },
      { name: "Tor Network Routing", desc: "SOCKS5 proxy + .onion service hides IP from relayers" },
      { name: "Randomized Pattern Breaking", desc: "Auto-splits amounts and timings to defeat timing analysis" },
    ],
  },
  {
    title: "Multi-Chain",
    features: [
      { name: "9 EVM Chains", desc: "Ethereum, Arbitrum, Optimism, Base, Polygon, BSC, Avalanche, Gnosis, Linea" },
      { name: "Bitcoin (HTLC Atomic Swaps)", desc: "Trustless BTC bridging, no custodian" },
      { name: "Solana (Native Program)", desc: "Anchor-based on-chain mixer + Wormhole bridge" },
      { name: "Monero (Atomic Swap)", desc: "XMR as privacy intermediary or direct mixing" },
      { name: "Cosmos, Tron, TON", desc: "Via Wormhole + IBC + Axelar bridges" },
      { name: "Cross-Chain Withdrawals", desc: "Deposit on chain A, withdraw on chain B" },
    ],
  },
  {
    title: "Mixing Modes",
    features: [
      { name: "Standard Mode", desc: "Fixed denomination pools — fast, simple, strong anonymity set" },
      { name: "CoinJoin Mode", desc: "Collaborative mixing — multiple users sign a single transaction" },
      { name: "Monero Route Mode", desc: "Convert to XMR → ring signature mixing → convert back" },
      { name: "Complete Anonymity Mode", desc: "Max delay + multi-path + decoys + Tor — ultimate privacy" },
    ],
  },
  {
    title: "DeFi Integration",
    features: [
      { name: "Yield on Deposits (Aave V3)", desc: "Earn APY while your funds stay shielded" },
      { name: "Private Swaps (Uniswap V3)", desc: "Swap tokens without revealing your address" },
      { name: "Private Lending", desc: "Supply/withdraw from Aave with shielded notes" },
      { name: "Exchange Liquidity Sourcing", desc: "Large withdrawals source from CEX liquidity for better rates" },
    ],
  },
  {
    title: "Security & Recovery",
    features: [
      { name: "AES-GCM 256-bit Encryption", desc: "Password-encrypted note storage in browser" },
      { name: "Shamir Secret Sharing", desc: "Split notes into K-of-N shares for social recovery" },
      { name: "Proof of Innocence", desc: "ZK proof your funds aren't from sanctioned addresses" },
      { name: "IPFS + ENS Hosting", desc: "Censorship-resistant frontend deployment" },
    ],
  },
  {
    title: "Infrastructure",
    features: [
      { name: "Decentralized Relayers", desc: "Staked relayer network with reputation + fee competition" },
      { name: "Loyalty Discounts", desc: "1% → 0.25% fee reduction for repeat users + referral program" },
      { name: "Multi-Token Support", desc: "ETH, USDC, USDT, DAI, WBTC, BNB, MATIC, AVAX and more" },
      { name: "Variable Amounts", desc: "No fixed denominations required — mix any amount" },
      { name: "Open Source", desc: "Fully auditable, no backdoors" },
    ],
  },
];

export function FeatureShowcase() {
  const totalFeatures = FEATURE_CATEGORIES.reduce((sum, c) => sum + c.features.length, 0);

  return (
    <div className="w-full max-w-[960px] mx-auto">
      <div className="mb-8">
        <h2 className="text-[24px] font-semibold tracking-tight text-[var(--text-primary)]">
          What&apos;s built in
        </h2>
        <p className="mt-2 text-[13px] leading-[1.65] text-[var(--text-secondary)]">
          {totalFeatures} concrete features across privacy, anti-surveillance,
          multi-chain, DeFi, security, and infrastructure. No vapor — every line
          maps to a contract, circuit, or library that already lives in the repo.
        </p>
      </div>

      <div className="space-y-6">
        {FEATURE_CATEGORIES.map((category) => (
          <div key={category.title}>
            <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] mb-3 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
              {category.title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {category.features.map((feature) => (
                <div
                  key={feature.name}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-3.5 transition-colors hover:border-[var(--text-faint)]"
                >
                  <p className="text-[13px] text-[var(--text-primary)] font-medium leading-snug">{feature.name}</p>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-1 leading-[1.5]">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
