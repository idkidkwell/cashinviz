"use client";

import { useEffect, useState } from "react";

interface Exchange {
  name: string;
  icon: string;
  color: string;
  liquidity: string;
  spread: string;
  status: "live" | "beta" | "offline";
  volume24h: string;
}

const EXCHANGES: Exchange[] = [
  { name: "Binance", icon: "B", color: "#f0b90b", liquidity: "$2.4B", spread: "0.02%", status: "live", volume24h: "$847M" },
  { name: "Coinbase", icon: "C", color: "#0052ff", liquidity: "$1.8B", spread: "0.03%", status: "live", volume24h: "$523M" },
  { name: "Kraken", icon: "K", color: "#5741d9", liquidity: "$980M", spread: "0.04%", status: "live", volume24h: "$312M" },
  { name: "OKX", icon: "O", color: "#1a1a1a", liquidity: "$1.2B", spread: "0.03%", status: "live", volume24h: "$445M" },
  { name: "Bybit", icon: "B", color: "#f7a600", liquidity: "$760M", spread: "0.05%", status: "beta", volume24h: "$289M" },
  { name: "KuCoin", icon: "K", color: "#23af91", liquidity: "$540M", spread: "0.06%", status: "beta", volume24h: "$198M" },
  { name: "Gate.io", icon: "G", color: "#2354e6", liquidity: "$380M", spread: "0.07%", status: "offline", volume24h: "$142M" },
];

const STRATEGIES = [
  { id: "best-rate" as const, label: "Best rate", desc: "Route to lowest spread" },
  { id: "split" as const, label: "Split order", desc: "Distribute across venues" },
  { id: "random" as const, label: "Randomize", desc: "Maximum privacy" },
];

export function ExchangeLiquidityPanel() {
  const [enabled, setEnabled] = useState(true);
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([
    "Binance",
    "Coinbase",
    "Kraken",
    "OKX",
  ]);
  const [strategy, setStrategy] = useState<"best-rate" | "split" | "random">("best-rate");
  const [maxSlippage, setMaxSlippage] = useState(0.5);
  const [aggregatedLiquidity, setAggregatedLiquidity] = useState("$6.38B");

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      const base = 6.38;
      const fluctuation = (Math.random() - 0.5) * 0.2;
      setAggregatedLiquidity(`$${(base + fluctuation).toFixed(2)}B`);
    }, 3000);
    return () => clearInterval(interval);
  }, [enabled]);

  const toggleExchange = (name: string) => {
    setSelectedExchanges((prev) =>
      prev.includes(name) ? prev.filter((e) => e !== name) : [...prev, name]
    );
  };

  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Source withdrawal liquidity from centralized exchanges for better rates and stronger
        anonymity on large transactions. All API calls are routed through Tor — no KYC, no
        account linking.
      </p>

      {/* ── Master toggle ─────────────────────────── */}
      <div className="flex items-center justify-between bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-3">
        <div>
          <p className="text-[13px] text-[var(--text-primary)] font-medium">Exchange liquidity</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {enabled
              ? "Active — sourcing from selected exchanges"
              : "Disabled — using pool liquidity only"}
          </p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`shrink-0 w-10 rounded-full transition-colors ${
            enabled ? "bg-[#6366f1]" : "bg-[var(--border)]"
          }`}
          style={{ height: "22px" }}
        >
          <div
            className={`w-[18px] h-[18px] bg-white rounded-full transition-transform mx-0.5 ${
              enabled ? "translate-x-[18px]" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <>
          {/* ── Stats ───────────────────────────── */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <StatCard label="Total liquidity" value={aggregatedLiquidity} tone="primary" />
            <StatCard
              label="Active sources"
              value={selectedExchanges.length.toString()}
              tone="primary"
            />
            <StatCard label="Avg spread" value="0.03%" tone="indigo" />
          </div>

          {/* ── Exchange list ───────────────────── */}
          <div className="mb-5">
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
              Liquidity sources
            </p>
            <div className="space-y-1.5">
              {EXCHANGES.map((ex) => {
                const selected = selectedExchanges.includes(ex.name);
                return (
                  <button
                    key={ex.name}
                    onClick={() => ex.status !== "offline" && toggleExchange(ex.name)}
                    disabled={ex.status === "offline"}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                      selected
                        ? "bg-[#6366f1]/10 border border-[#6366f1]/30"
                        : "bg-[var(--card)] border border-[var(--border-subtle)] hover:border-[#6366f1]/30"
                    } ${ex.status === "offline" ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                      style={{ backgroundColor: ex.color }}
                    >
                      {ex.icon}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] text-[var(--text-primary)] font-medium">
                          {ex.name}
                        </p>
                        <span
                          className={`text-[9px] uppercase tracking-[0.05em] px-1.5 py-0.5 rounded-full ${
                            ex.status === "live"
                              ? "bg-emerald-400/10 text-emerald-400"
                              : ex.status === "beta"
                                ? "bg-amber-400/10 text-amber-400"
                                : "bg-mixer-red/10 text-mixer-red"
                          }`}
                        >
                          {ex.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] tabular-nums">
                        Vol {ex.volume24h}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[12px] text-[var(--text-primary)] tabular-nums">
                        {ex.liquidity}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] tabular-nums">
                        {ex.spread}
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                        selected ? "border-[#6366f1] bg-[#6366f1]" : "border-[var(--border)]"
                      }`}
                    >
                      {selected && (
                        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white">
                          <path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Routing strategy ────────────────── */}
          <div className="mb-5">
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
              Routing strategy
            </p>
            <div className="grid grid-cols-3 gap-2">
              {STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStrategy(s.id)}
                  className={`p-3 rounded-lg text-left transition-all border ${
                    strategy === s.id
                      ? "bg-[#6366f1]/10 border-[#6366f1]/40"
                      : "bg-[var(--card)] border-[var(--border-subtle)] hover:border-[#6366f1]/30"
                  }`}
                >
                  <p
                    className={`text-[13px] font-medium ${
                      strategy === s.id
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {s.label}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Slippage ─────────────────────────── */}
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
                Max slippage
              </p>
              <span className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">
                {maxSlippage.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={maxSlippage}
              onChange={(e) => setMaxSlippage(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-[var(--border)] cursor-pointer accent-[#6366f1]"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-[var(--text-muted)] tabular-nums">0.1%</span>
              <span className="text-[10px] text-[var(--text-muted)] tabular-nums">2.0%</span>
            </div>
          </div>

          <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-xl p-3">
            <p className="text-[11px] text-emerald-400/90 leading-relaxed">
              <span className="font-semibold">Privacy preserved:</span> API calls routed via
              Tor. No KYC, no account linking — your withdrawal address is never exposed to
              exchange APIs.
            </p>
          </div>
        </>
      )}

      {!enabled && (
        <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-3">
          <p className="text-[11px] text-amber-400">
            Exchange liquidity disabled. Large withdrawals (&gt;10 ETH) may see higher
            slippage using pool-only liquidity.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "indigo";
}) {
  const valueCls = tone === "indigo" ? "text-[#818cf8]" : "text-[var(--text-primary)]";
  return (
    <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3 text-center">
      <p className={`text-[18px] font-semibold tabular-nums ${valueCls}`}>{value}</p>
      <p className="text-[10px] text-[var(--text-muted)] mt-0.5 uppercase tracking-[0.06em]">
        {label}
      </p>
    </div>
  );
}
