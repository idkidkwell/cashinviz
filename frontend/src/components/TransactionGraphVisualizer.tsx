"use client";

import type { ReactNode } from "react";

/**
 * Anonymity-set visualization (deterministic sample).
 *
 * Shows deposits flowing into the mixer pool and withdrawals flowing out.
 * The point: from an observer's perspective, every withdrawal is equally
 * likely to correspond to every deposit — there is no on-chain link between
 * input and output. This is the privacy guarantee, not a simulation.
 *
 * Numbers are representative values for an active pool. Replace the constants
 * with on-chain reads once the pool contract is indexed.
 */

const DEPOSIT_COUNT = 12;
const WITHDRAWAL_COUNT = 12;
const USER_DEPOSIT_IDX = 4;

// Stable, deterministic sample — never regenerated on render.
const DEPOSIT_ADDRS = [
  "0x8a2f…e9b4",
  "0xc1d5…3a76",
  "0x4e8b…9c2f",
  "0xa7f3…1d4e",
  "0x9b2c…6e8a",
  "0x3f7e…8a1b",
  "0xe4c9…2f5d",
  "0x6d8a…4b7c",
  "0xb1e3…8f2a",
  "0x2c4d…a9b7",
  "0x7e9f…3c1d",
  "0x5a8b…e4f2",
];

const WITHDRAWAL_ADDRS = [
  "0xfe12…7b3a",
  "0x4a9c…1e8d",
  "0x8f2e…6c9b",
  "0xd3b7…a4f1",
  "0x1c5e…9b2d",
  "0x7a8f…3e6c",
  "0xb4d9…1a8f",
  "0x2e7c…5d3b",
  "0x9f1a…c8e4",
  "0x6b3d…8f7a",
  "0xa2c5…4b9e",
  "0x3d8f…2a6c",
];

const SVG_W = 640;
const SVG_H = 420;
const COL_LEFT = 90;
const COL_RIGHT = SVG_W - 90;
const COL_CENTER = SVG_W / 2;
const NODE_R = 7;
const MIXER_R = 44;

const C_USER = "#22c55e";
const C_OTHER = "#6366f1";
const C_WITHDRAW = "#8b5cf6";
const C_POOL = "#eab308";

function yPositions(count: number): number[] {
  const margin = 42;
  const usable = SVG_H - margin * 2;
  const step = count > 1 ? usable / (count - 1) : 0;
  return Array.from({ length: count }, (_, i) => margin + i * step);
}

export function TransactionGraphVisualizer() {
  const depY = yPositions(DEPOSIT_COUNT);
  const wdY = yPositions(WITHDRAWAL_COUNT);

  const depPaths = depY.map((y, i) => ({
    key: `dep-p-${i}`,
    d: `M${COL_LEFT + NODE_R},${y} C${COL_LEFT + 110},${y} ${COL_CENTER - 100},${SVG_H / 2} ${COL_CENTER - MIXER_R},${SVG_H / 2}`,
    isUser: i === USER_DEPOSIT_IDX,
  }));

  const wdPaths = wdY.map((y, i) => ({
    key: `wd-p-${i}`,
    d: `M${COL_CENTER + MIXER_R},${SVG_H / 2} C${COL_CENTER + 100},${SVG_H / 2} ${COL_RIGHT - 110},${y} ${COL_RIGHT - NODE_R},${y}`,
  }));

  return (
    <div className="max-w-[960px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[640px]">
        Pool overview. Every deposit converges into a single anonymity set, and every
        withdrawal originates from the same set — so from an observer's perspective, any
        withdrawal is equally likely to correspond to any deposit.
      </p>

      <div className="grid md:grid-cols-[1fr_280px] gap-5">
        {/* ── LEFT: graph ───────────────────────────────────── */}
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 min-w-0">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full h-auto"
            style={{ minHeight: 320 }}
            aria-label="Anonymity set graph"
          >
            {/* Column headers */}
            <text
              x={COL_LEFT}
              y={18}
              textAnchor="middle"
              fontSize={9}
              fill="var(--text-muted)"
              style={{ letterSpacing: "0.14em" }}
            >
              DEPOSITS
            </text>
            <text
              x={COL_CENTER}
              y={18}
              textAnchor="middle"
              fontSize={9}
              fill="var(--text-muted)"
              style={{ letterSpacing: "0.14em" }}
            >
              POOL
            </text>
            <text
              x={COL_RIGHT}
              y={18}
              textAnchor="middle"
              fontSize={9}
              fill="var(--text-muted)"
              style={{ letterSpacing: "0.14em" }}
            >
              WITHDRAWALS
            </text>

            {/* Deposit paths */}
            {depPaths.map((p) => (
              <path
                key={p.key}
                d={p.d}
                fill="none"
                stroke={p.isUser ? C_USER : C_OTHER}
                strokeWidth={p.isUser ? 1.4 : 0.7}
                strokeOpacity={p.isUser ? 0.7 : 0.3}
              />
            ))}

            {/* Withdrawal paths */}
            {wdPaths.map((p) => (
              <path
                key={p.key}
                d={p.d}
                fill="none"
                stroke={C_WITHDRAW}
                strokeWidth={0.7}
                strokeOpacity={0.3}
              />
            ))}

            {/* Mixer pool */}
            <g transform={`translate(${COL_CENTER},${SVG_H / 2})`}>
              <circle
                r={MIXER_R + 4}
                fill="none"
                stroke={C_POOL}
                strokeWidth={0.6}
                strokeOpacity={0.2}
              />
              <circle
                r={MIXER_R}
                fill={C_POOL}
                fillOpacity={0.08}
                stroke={C_POOL}
                strokeWidth={1.2}
                strokeOpacity={0.5}
              />
              <circle
                r={MIXER_R - 10}
                fill="none"
                stroke={C_POOL}
                strokeWidth={0.5}
                strokeOpacity={0.3}
                strokeDasharray="3 5"
              />
              <text
                textAnchor="middle"
                dy="3"
                fontSize={11}
                fontWeight={600}
                fill="white"
                fillOpacity={0.9}
              >
                Mixer
              </text>
            </g>

            {/* Deposit nodes */}
            {depY.map((y, i) => {
              const isUser = i === USER_DEPOSIT_IDX;
              const c = isUser ? C_USER : C_OTHER;
              return (
                <g key={`dep-n-${i}`}>
                  <circle
                    cx={COL_LEFT}
                    cy={y}
                    r={NODE_R}
                    fill={c}
                    fillOpacity={isUser ? 0.3 : 0.15}
                    stroke={c}
                    strokeWidth={isUser ? 1.5 : 1}
                    strokeOpacity={isUser ? 0.9 : 0.55}
                  />
                  <text
                    x={COL_LEFT - NODE_R - 6}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={8}
                    fontFamily="ui-monospace, monospace"
                    fill={c}
                    fillOpacity={isUser ? 0.95 : 0.55}
                  >
                    {DEPOSIT_ADDRS[i]}
                  </text>
                  {isUser && (
                    <text
                      x={COL_LEFT - NODE_R - 6}
                      y={y + 10}
                      textAnchor="end"
                      fontSize={7}
                      fontWeight={600}
                      fill={C_USER}
                    >
                      you
                    </text>
                  )}
                </g>
              );
            })}

            {/* Withdrawal nodes */}
            {wdY.map((y, i) => (
              <g key={`wd-n-${i}`}>
                <circle
                  cx={COL_RIGHT}
                  cy={y}
                  r={NODE_R}
                  fill={C_WITHDRAW}
                  fillOpacity={0.15}
                  stroke={C_WITHDRAW}
                  strokeWidth={1}
                  strokeOpacity={0.55}
                />
                <text
                  x={COL_RIGHT + NODE_R + 6}
                  y={y}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={8}
                  fontFamily="ui-monospace, monospace"
                  fill={C_WITHDRAW}
                  fillOpacity={0.55}
                >
                  {WITHDRAWAL_ADDRS[i]}
                </text>
              </g>
            ))}
          </svg>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2 px-1">
            <LegendItem color={C_USER} label="Your deposit" />
            <LegendItem color={C_OTHER} label="Other deposits" />
            <LegendItem color={C_WITHDRAW} label="Withdrawals" />
            <LegendItem color={C_POOL} label="Mixer pool" />
          </div>
        </div>

        {/* ── RIGHT: stats + explainer ──────────────────────── */}
        <aside className="md:sticky md:top-4 self-start">
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
              Anonymity set
            </p>

            <div>
              <p className="text-[11px] text-[var(--text-muted)] mb-1">Active deposits</p>
              <p className="text-[22px] font-semibold text-[var(--text-primary)] tabular-nums leading-none">
                2,847
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat
                label="Last 24h"
                value={
                  <>
                    43<span className="text-[var(--text-muted)] font-normal"> in</span> · 38
                    <span className="text-[var(--text-muted)] font-normal"> out</span>
                  </>
                }
              />
              <Stat
                label="Last 7d"
                value={
                  <>
                    312<span className="text-[var(--text-muted)] font-normal"> in</span> · 298
                    <span className="text-[var(--text-muted)] font-normal"> out</span>
                  </>
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="Unique depositors" value="1,927" />
              <Stat label="Time spread" value="94 days" />
            </div>

            <div className="h-px bg-[var(--border-subtle)]" />

            <div className="space-y-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
              <p>
                <span className="text-[var(--text-secondary)]">No cryptographic link</span>{" "}
                exists between any specific deposit and any specific withdrawal — every
                output is equally likely to correspond to every input.
              </p>
              <p>
                <span className="text-[var(--text-secondary)]">Larger sets</span> mean
                stronger privacy. Waiting for more activity before withdrawing blends you in
                further.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─── Tiny helpers ─────────────────────────────────── */

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-[var(--text-muted)] mb-1">{label}</p>
      <p className="text-[13px] font-medium text-[var(--text-primary)] tabular-nums">
        {value}
      </p>
    </div>
  );
}
