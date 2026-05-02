"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Mock data ── */

const MOCK_GAS_24H = [
  32, 30, 28, 24, 20, 16, 14, 15, 18, 22, 28, 35,
  40, 42, 38, 36, 34, 30, 28, 25, 22, 20, 18, 23,
];

const BEST_HOUR = 6;
const CURRENT_HOUR = 23;

const NETWORK_DATA = [
  { chain: "Ethereum", gasPrice: "23 Gwei", deposit: "$4.82", withdraw: "$3.17", tier: "high" as const },
  { chain: "Arbitrum", gasPrice: "0.1 Gwei", deposit: "$0.42", withdraw: "$0.28", tier: "mid" as const },
  { chain: "Optimism", gasPrice: "0.05 Gwei", deposit: "$0.38", withdraw: "$0.24", tier: "mid" as const },
  { chain: "Base", gasPrice: "0.03 Gwei", deposit: "$0.31", withdraw: "$0.19", tier: "low" as const },
  { chain: "Polygon", gasPrice: "30 Gwei", deposit: "$0.02", withdraw: "$0.01", tier: "low" as const },
  { chain: "BSC", gasPrice: "3 Gwei", deposit: "$0.08", withdraw: "$0.05", tier: "low" as const },
];

const BATCH_ITEMS_INIT = [
  { label: "Deposit", cost: 4.82, checked: true },
  { label: "Shield", cost: 5.18, checked: true },
  { label: "Set Timelock", cost: 4.50, checked: true },
];

type GasStrategy = "fast" | "standard" | "economy";

const STRATEGIES = [
  { key: "fast" as const, label: "Fast", time: "~30s", gwei: 28, cost: "$5.40" },
  { key: "standard" as const, label: "Standard", time: "~2m", gwei: 23, cost: "$4.82" },
  { key: "economy" as const, label: "Economy", time: "~5m", gwei: 18, cost: "$3.50" },
];

/* ── Component ── */

export function GasOptimizer() {
  const [strategy, setStrategy] = useState<GasStrategy>("standard");
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [countdown, setCountdown] = useState(8 * 3600 + 23 * 60);
  const [batchItems, setBatchItems] = useState(BATCH_ITEMS_INIT);
  const [currentGas, setCurrentGas] = useState(23);

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentGas((g) => {
        const delta = (Math.random() - 0.5) * 2;
        return Math.max(10, Math.min(50, +(g + delta).toFixed(1)));
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const formatCountdown = useCallback((s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m ${sec.toString().padStart(2, "0")}s`;
  }, []);

  const toggleBatch = (i: number) => {
    setBatchItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, checked: !item.checked } : item))
    );
  };

  const checkedItems = batchItems.filter((b) => b.checked);
  const individualCost = checkedItems.reduce((a, b) => a + b.cost, 0);
  const batchedCost = +(individualCost * 0.565).toFixed(2);
  const savings = +(individualCost - batchedCost).toFixed(2);
  const savingsPct = individualCost > 0 ? Math.round((savings / individualCost) * 100) : 0;

  const gasTone =
    currentGas < 20 ? "emerald" : currentGas < 35 ? "amber" : "red";
  const gasColor =
    gasTone === "emerald" ? "text-emerald-400" : gasTone === "amber" ? "text-amber-400" : "text-mixer-red";
  const gasDot =
    gasTone === "emerald" ? "bg-emerald-400" : gasTone === "amber" ? "bg-amber-400" : "bg-mixer-red";

  /* SVG chart helpers */
  const chartW = 600;
  const chartH = 140;
  const padX = 34;
  const padY = 18;
  const maxGas = Math.max(...MOCK_GAS_24H);
  const minGas = Math.min(...MOCK_GAS_24H);

  const toX = (i: number) => padX + (i / (MOCK_GAS_24H.length - 1)) * (chartW - padX * 2);
  const toY = (v: number) =>
    padY + ((maxGas - v) / (maxGas - minGas)) * (chartH - padY * 2);

  const linePath = MOCK_GAS_24H.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v)}`).join(" ");
  const areaPath = `${linePath} L${toX(MOCK_GAS_24H.length - 1)},${chartH - padY} L${toX(0)},${chartH - padY} Z`;

  const bestX = toX(BEST_HOUR);
  const bestY = toY(MOCK_GAS_24H[BEST_HOUR]);
  const currentX = toX(CURRENT_HOUR);
  const currentY = toY(MOCK_GAS_24H[CURRENT_HOUR]);

  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Live gas prices, optimal transaction windows, and batched execution — minimize
        what you pay every time you touch the pool.
      </p>

      {/* ── Top stats ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Current gas" delta="+8.2% · 1h" deltaTone="red">
          <div className="flex items-center gap-1.5">
            <span className={`text-[22px] font-semibold tabular-nums ${gasColor}`}>
              {currentGas}
            </span>
            <span className="text-[13px] text-[var(--text-muted)]">Gwei</span>
            <span className={`ml-1 inline-block h-1.5 w-1.5 rounded-full ${gasDot} animate-pulse`} />
          </div>
        </StatCard>

        <StatCard label="Est. deposit" delta="+5.4% · 1h" deltaTone="red">
          <p className="text-[22px] font-semibold tabular-nums text-[var(--text-primary)]">$4.82</p>
        </StatCard>

        <StatCard label="Est. withdraw" delta="−3.1% · 1h" deltaTone="emerald">
          <p className="text-[22px] font-semibold tabular-nums text-[var(--text-primary)]">$3.17</p>
        </StatCard>
      </div>

      {/* ── Chart ───────────────────────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-5">
        <div className="flex justify-between items-baseline mb-2">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
            Gas price · last 24h
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">Gwei</p>
        </div>
        <svg
          viewBox={`0 0 ${chartW} ${chartH + 20}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="gasAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[minGas, Math.round((minGas + maxGas) / 2), maxGas].map((v) => (
            <g key={v}>
              <line
                x1={padX}
                x2={chartW - padX}
                y1={toY(v)}
                y2={toY(v)}
                stroke="rgba(255,255,255,0.05)"
              />
              <text x={4} y={toY(v) + 4} fill="#6b7280" fontSize="10">
                {v}
              </text>
            </g>
          ))}

          {[0, 6, 12, 18, 23].map((h) => (
            <text
              key={h}
              x={toX(h)}
              y={chartH + 10}
              textAnchor="middle"
              fill="#6b7280"
              fontSize="10"
            >
              {h}h
            </text>
          ))}

          <path d={areaPath} fill="url(#gasAreaGrad)" />
          <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="1.75" />

          {/* Best point */}
          <circle cx={bestX} cy={bestY} r="4" fill="#34d399" />
          <rect
            x={bestX - 52}
            y={bestY - 26}
            width="104"
            height="18"
            rx="4"
            fill="rgba(52,211,153,0.12)"
            stroke="#34d399"
            strokeWidth="0.5"
          />
          <text x={bestX} y={bestY - 14} textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="600">
            Best: 14 Gwei · 3:00 AM
          </text>

          {/* Current point */}
          <circle cx={currentX} cy={currentY} r="6" fill="rgba(251,191,36,0.25)">
            <animate attributeName="r" values="5;9;5" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={currentX} cy={currentY} r="3" fill="#fbbf24" />
        </svg>
      </div>

      {/* ── Best windows ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">
            Best window today
          </p>
          <p className="text-[13px] font-medium text-[var(--text-primary)] tabular-nums">
            2:00 AM – 4:00 AM UTC
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">Save ~62% vs now</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">
            Next low window
          </p>
          <p className="text-[13px] font-mono text-[var(--text-primary)] tabular-nums">
            {formatCountdown(countdown)}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Countdown to optimal</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">
              Gas alert
            </p>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              {alertEnabled ? "Alert set for below 15 Gwei" : "Notify me when gas drops"}
            </p>
          </div>
          <button
            onClick={() => setAlertEnabled((v) => !v)}
            className={`mt-3 w-full py-2 rounded-lg text-[12px] font-medium transition-colors ${
              alertEnabled
                ? "bg-emerald-400/15 text-emerald-400 border border-emerald-400/30"
                : "bg-[#6366f1] text-white hover:bg-[#6366f1]/85"
            }`}
          >
            {alertEnabled ? "Alert enabled" : "Set alert"}
          </button>
        </div>
      </div>

      {/* ── Strategy ─────────────────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">
          Gas strategy
        </p>
        <div className="grid grid-cols-3 gap-2">
          {STRATEGIES.map((opt) => {
            const selected = strategy === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setStrategy(opt.key)}
                className={`rounded-lg px-3 py-2.5 border transition-all text-left ${
                  selected
                    ? "border-[#6366f1] bg-[#6366f1]/10"
                    : "border-[var(--border)] bg-[var(--bg)] hover:border-[#6366f1]/40"
                }`}
              >
                <p
                  className={`text-[13px] font-medium ${
                    selected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  }`}
                >
                  {opt.label}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                  {opt.gwei} Gwei · {opt.time}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] tabular-nums">{opt.cost}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Batch optimizer ─────────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3 mb-5">
        <div>
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">
            Batch optimizer
          </p>
          <p className="text-[12px] text-[var(--text-muted)]">
            Combine operations into a single tx to save gas
          </p>
        </div>

        <div className="space-y-1.5">
          {batchItems.map((item, i) => (
            <label
              key={item.label}
              className="flex items-center gap-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 cursor-pointer hover:border-[#6366f1]/40 transition-colors"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleBatch(i)}
                className="accent-[#6366f1] h-3.5 w-3.5"
              />
              <span className="text-[13px] text-[var(--text-primary)] flex-1">{item.label}</span>
              <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
                ${item.cost.toFixed(2)}
              </span>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg px-3.5 py-2.5">
          <div className="space-y-0.5">
            <p className="text-[11px] text-[var(--text-muted)]">
              Individual:{" "}
              <span className="text-[var(--text-primary)] font-medium tabular-nums">
                ${individualCost.toFixed(2)}
              </span>
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Batched:{" "}
              <span className="text-emerald-400 font-medium tabular-nums">
                ${batchedCost.toFixed(2)}
              </span>
            </p>
          </div>
          {savings > 0 && (
            <div className="bg-emerald-400/10 border border-emerald-400/25 rounded-lg px-3 py-1.5 text-center">
              <p className="text-[13px] font-semibold text-emerald-400 tabular-nums">
                Save ${savings.toFixed(2)}
              </p>
              <p className="text-[10px] text-emerald-400/70">{savingsPct}% cheaper</p>
            </div>
          )}
        </div>

        <button
          disabled={checkedItems.length < 2}
          className="btn-primary w-full py-2.5 text-[13px] font-semibold"
        >
          Execute batch
        </button>
      </div>

      {/* ── Network comparison ──────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">
          Network comparison
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[var(--text-muted)] text-[11px] border-b border-[var(--border-subtle)]">
                <th className="text-left py-2 pr-4 font-medium">Chain</th>
                <th className="text-right py-2 px-4 font-medium">Gas</th>
                <th className="text-right py-2 px-4 font-medium">Deposit</th>
                <th className="text-right py-2 pl-4 font-medium">Withdraw</th>
              </tr>
            </thead>
            <tbody>
              {NETWORK_DATA.map((row) => {
                const color =
                  row.tier === "low"
                    ? "text-emerald-400"
                    : row.tier === "mid"
                      ? "text-[var(--text-primary)]"
                      : "text-amber-400";
                return (
                  <tr
                    key={row.chain}
                    className="border-b border-[var(--border-subtle)]/60 last:border-0"
                  >
                    <td className="py-2.5 pr-4 text-[var(--text-primary)] font-medium">{row.chain}</td>
                    <td className={`py-2.5 px-4 text-right tabular-nums ${color}`}>{row.gasPrice}</td>
                    <td className={`py-2.5 px-4 text-right tabular-nums ${color}`}>{row.deposit}</td>
                    <td className={`py-2.5 pl-4 text-right tabular-nums ${color}`}>{row.withdraw}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Tiny helpers ─────────────────────────────────── */

function StatCard({
  label,
  delta,
  deltaTone,
  children,
}: {
  label: string;
  delta: string;
  deltaTone: "red" | "emerald";
  children: React.ReactNode;
}) {
  const toneClass = deltaTone === "red" ? "text-mixer-red" : "text-emerald-400";
  return (
    <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4">
      <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">
        {label}
      </p>
      {children}
      <p className={`text-[11px] ${toneClass} mt-1 tabular-nums`}>{delta}</p>
    </div>
  );
}
