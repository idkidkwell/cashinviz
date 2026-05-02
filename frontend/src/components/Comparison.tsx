"use client";

interface Feature {
  name: string;
  us: string;
  tornado: string;
  railgun: string;
  tumblio: string;
  wasabi: string;
}

const FEATURES: Feature[] = [
  // Core privacy
  { name: "No Trusted Setup", us: "yes", tornado: "no", railgun: "yes", tumblio: "no", wasabi: "yes" },
  { name: "Client-Side ZK Proving", us: "yes", tornado: "yes", railgun: "yes", tumblio: "no", wasabi: "no" },
  { name: "Variable Amounts", us: "yes", tornado: "no", railgun: "yes", tumblio: "yes", wasabi: "yes" },
  { name: "Shielded Transfers", us: "yes", tornado: "no", railgun: "yes", tumblio: "no", wasabi: "no" },
  // Chain support
  { name: "EVM Chains (9+)", us: "yes", tornado: "partial", railgun: "partial", tumblio: "yes", wasabi: "no" },
  { name: "Bitcoin Native", us: "yes", tornado: "no", railgun: "no", tumblio: "yes", wasabi: "yes" },
  { name: "Solana Native", us: "yes", tornado: "no", railgun: "no", tumblio: "partial", wasabi: "no" },
  { name: "Monero Privacy Route", us: "yes", tornado: "no", railgun: "no", tumblio: "no", wasabi: "no" },
  { name: "15+ Total Chains", us: "yes", tornado: "no", railgun: "no", tumblio: "partial", wasabi: "no" },
  // DeFi
  { name: "Private DeFi (Swap/Lend)", us: "yes", tornado: "no", railgun: "partial", tumblio: "no", wasabi: "no" },
  { name: "Yield on Deposits", us: "yes", tornado: "no", railgun: "no", tumblio: "no", wasabi: "no" },
  { name: "Cross-Asset Obfuscation", us: "yes", tornado: "no", railgun: "no", tumblio: "no", wasabi: "no" },
  // Advanced privacy
  { name: "Stealth Payments", us: "yes", tornado: "no", railgun: "no", tumblio: "no", wasabi: "no" },
  { name: "Time-Locked Withdrawals", us: "yes", tornado: "no", railgun: "no", tumblio: "partial", wasabi: "no" },
  { name: "Multi-Path Withdrawals", us: "yes", tornado: "no", railgun: "no", tumblio: "no", wasabi: "no" },
  { name: "AI Anti-Surveillance", us: "yes", tornado: "no", railgun: "no", tumblio: "partial", wasabi: "no" },
  { name: "MEV Protection", us: "yes", tornado: "no", railgun: "no", tumblio: "no", wasabi: "no" },
  { name: "Tor Network Routing", us: "yes", tornado: "no", railgun: "no", tumblio: "no", wasabi: "yes" },
  // Compliance & UX
  { name: "Proof of Innocence", us: "yes", tornado: "no", railgun: "partial", tumblio: "no", wasabi: "no" },
  { name: "Social Recovery", us: "yes", tornado: "no", railgun: "no", tumblio: "no", wasabi: "no" },
  { name: "Loyalty Discounts", us: "yes", tornado: "no", railgun: "no", tumblio: "no", wasabi: "no" },
  // Infrastructure
  { name: "Decentralized Relayers", us: "yes", tornado: "yes", railgun: "no", tumblio: "no", wasabi: "no" },
  { name: "Cross-Chain Withdrawals", us: "yes", tornado: "no", railgun: "no", tumblio: "partial", wasabi: "no" },
  { name: "IPFS + ENS Hosting", us: "yes", tornado: "yes", railgun: "no", tumblio: "no", wasabi: "no" },
  { name: "Open Source", us: "yes", tornado: "yes", railgun: "yes", tumblio: "no", wasabi: "yes" },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "yes")
    return <span className="comparison-check text-base">&#10003;</span>;
  if (status === "no")
    return <span className="comparison-x text-base">&#10007;</span>;
  return <span className="comparison-partial text-xs">~</span>;
}

export function Comparison() {
  const count = (key: keyof Feature) => FEATURES.filter((f) => f[key] === "yes").length;
  const ourCount = count("us");
  const tornadoCount = count("tornado");
  const railgunCount = count("railgun");
  const tumblioCount = count("tumblio");
  const wasabiCount = count("wasabi");

  const competitors = [
    { name: "Cashinviz", count: ourCount, accent: true },
    { name: "Tornado Cash", count: tornadoCount },
    { name: "Railgun", count: railgunCount },
    { name: "Tumblio", count: tumblioCount },
    { name: "Wasabi", count: wasabiCount },
  ];

  return (
    <div className="w-full max-w-[960px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[24px] font-semibold tracking-tight text-[var(--text-primary)]">
          How Cashinviz compares
        </h2>
        <p className="mt-2 text-[13px] leading-[1.65] text-[var(--text-secondary)]">
          {FEATURES.length} feature checks against the four mainstream privacy
          tools. The full table is below; rows highlighted in green are
          features only Cashinviz ships.
        </p>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {competitors.map((c) => (
          <div
            key={c.name}
            className={`rounded-[var(--radius-lg)] p-3 text-center ${
              c.accent
                ? "bg-[var(--card)] border border-[var(--accent)]/40"
                : "bg-[var(--card)] border border-[var(--border)]"
            }`}
          >
            <p className={`text-[20px] font-semibold tabular-nums ${c.accent ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}>
              {c.count}/{FEATURES.length}
            </p>
            <p className={`text-[10px] mt-1 ${c.accent ? "text-[var(--accent)] font-semibold" : "text-[var(--text-secondary)]"}`}>
              {c.name}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_50px_50px_50px_50px_50px] bg-[var(--bg-elevated)] px-4 py-3 border-b border-[var(--border)]">
          <span className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-[0.06em]">Feature</span>
          <span className="text-[11px] font-medium text-[var(--accent)] text-center">Us</span>
          <span className="text-[11px] font-medium text-[var(--text-secondary)] text-center">TC</span>
          <span className="text-[11px] font-medium text-[var(--text-secondary)] text-center">RG</span>
          <span className="text-[11px] font-medium text-[var(--text-secondary)] text-center">TB</span>
          <span className="text-[11px] font-medium text-[var(--text-secondary)] text-center">WB</span>
        </div>

        {/* Table rows */}
        {FEATURES.map((feature, i) => {
          const onlyUs = feature.us === "yes" &&
            feature.tornado !== "yes" && feature.railgun !== "yes" &&
            feature.tumblio !== "yes" && feature.wasabi !== "yes";
          return (
            <div
              key={feature.name}
              className={`grid grid-cols-[1fr_50px_50px_50px_50px_50px] px-4 py-2 items-center ${
                i !== FEATURES.length - 1 ? "border-b border-[var(--border-subtle)]" : ""
              } ${onlyUs ? "bg-[var(--accent)]/[0.04]" : ""}`}
            >
              <span className={`text-[12.5px] ${onlyUs ? "text-[var(--accent)] font-medium" : "text-[var(--text-primary)]"}`}>
                {feature.name}
              </span>
              <span className="text-center"><StatusIcon status={feature.us} /></span>
              <span className="text-center"><StatusIcon status={feature.tornado} /></span>
              <span className="text-center"><StatusIcon status={feature.railgun} /></span>
              <span className="text-center"><StatusIcon status={feature.tumblio} /></span>
              <span className="text-center"><StatusIcon status={feature.wasabi} /></span>
            </div>
          );
        })}
      </div>

      {/* Bottom note */}
      <p className="text-[11px] text-[var(--text-muted)] mt-4">
        TC = Tornado Cash · RG = Railgun · TB = Tumblio · WB = Wasabi Wallet
      </p>
    </div>
  );
}
