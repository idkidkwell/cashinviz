"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RelayNode {
  id: string;
  x: number;
  y: number;
  status: "active" | "syncing" | "offline";
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  staked: string;
  txsRelayed: number;
  uptime: string;
  earnings: string;
}

type Bandwidth = "low" | "medium" | "high";
type Region = "americas" | "europe" | "asia" | "global";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BANDWIDTH_OPTIONS: { key: Bandwidth; label: string; speed: string }[] = [
  { key: "low", label: "Low", speed: "1 MB/s" },
  { key: "medium", label: "Medium", speed: "5 MB/s" },
  { key: "high", label: "High", speed: "10 MB/s" },
];

const REGION_OPTIONS: { key: Region; label: string }[] = [
  { key: "americas", label: "Americas" },
  { key: "europe", label: "Europe" },
  { key: "asia", label: "Asia" },
  { key: "global", label: "Global" },
];

const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, id: "relay-7f3a", staked: "52,000", txsRelayed: 14320, uptime: "99.99%", earnings: "$4,210" },
  { rank: 2, id: "relay-2c8b", staked: "48,500", txsRelayed: 12870, uptime: "99.97%", earnings: "$3,890" },
  { rank: 3, id: "relay-9d1e", staked: "41,200", txsRelayed: 11540, uptime: "99.95%", earnings: "$3,420" },
  { rank: 4, id: "relay-4a6f", staked: "38,000", txsRelayed: 10210, uptime: "99.92%", earnings: "$2,970" },
  { rank: 5, id: "relay-b5c2", staked: "35,700", txsRelayed: 9680,  uptime: "99.90%", earnings: "$2,610" },
];

const STEPS = [
  { num: 1, title: "Stake MIX", desc: "Lock tokens into the relay contract" },
  { num: 2, title: "Relay txs", desc: "Privately forward other users' transactions" },
  { num: 3, title: "Earn fees", desc: "Collect a cut of every relayed transaction" },
  { num: 4, title: "Strengthen", desc: "More relayers = stronger privacy for all" },
];

function generateNodes(): RelayNode[] {
  const nodes: RelayNode[] = [];
  for (let i = 0; i < 18; i++) {
    const statuses: RelayNode["status"][] = [
      "active", "active", "active", "active", "syncing", "offline",
    ];
    nodes.push({
      id: `node-${i}`,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      status: statuses[Math.floor(Math.random() * statuses.length)],
    });
  }
  return nodes;
}

function generateEdges(nodes: RelayNode[]): [number, number][] {
  const edges: [number, number][] = [];
  for (let i = 0; i < nodes.length; i++) {
    const numConnections = 1 + Math.floor(Math.random() * 2);
    for (let c = 0; c < numConnections; c++) {
      const j = (i + 1 + Math.floor(Math.random() * (nodes.length - 1))) % nodes.length;
      if (nodes[i].status !== "offline" && nodes[j].status !== "offline") {
        edges.push([i, j]);
      }
    }
  }
  return edges;
}

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */

function useAnimatedCount(target: number, duration = 1200): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(target / (duration / 16)));
    const id = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(id);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(id);
  }, [target, duration]);

  return count;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: string;
  tone?: "primary" | "indigo";
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

function NetworkMap({
  nodes,
  edges,
}: {
  nodes: RelayNode[];
  edges: [number, number][];
}) {
  const statusColor = (s: RelayNode["status"]) =>
    s === "active" ? "#34d399" : s === "syncing" ? "#f59e0b" : "#ef4444";

  return (
    <div>
      <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
        Network map
      </p>
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-52 rounded-lg bg-[var(--bg)]"
        >
          {edges.map(([i, j], idx) => (
            <line
              key={`edge-${idx}`}
              x1={`${nodes[i].x}%`}
              y1={`${nodes[i].y}%`}
              x2={`${nodes[j].x}%`}
              y2={`${nodes[j].y}%`}
              stroke="#6366f1"
              strokeOpacity={0.3}
              strokeWidth={0.3}
              strokeDasharray="1 1"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-4"
                dur={`${2 + (idx % 3)}s`}
                repeatCount="indefinite"
              />
            </line>
          ))}

          {nodes.map((n) => (
            <g key={n.id}>
              {n.status === "active" && (
                <circle
                  cx={`${n.x}%`}
                  cy={`${n.y}%`}
                  r="1.6"
                  fill="none"
                  stroke={statusColor(n.status)}
                  strokeWidth={0.25}
                >
                  <animate attributeName="r" from="1.1" to="2.6" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={`${n.x}%`} cy={`${n.y}%`} r="1" fill={statusColor(n.status)} />
            </g>
          ))}

          <text
            x="50"
            y="52"
            textAnchor="middle"
            fill="#9ca3af"
            fontSize="2.6"
            fontWeight="500"
            opacity={0.75}
          >
            247 nodes · 38 countries
          </text>
        </svg>

        <div className="flex items-center gap-4 mt-2 px-1 text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" /> Syncing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-mixer-red" /> Offline
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function PrivacyRelayNetwork() {
  /* ---------- state ---------- */
  const [nodes] = useState<RelayNode[]>(() => generateNodes());
  const [edges] = useState<[number, number][]>(() => generateEdges(nodes));

  const [stakeInput, setStakeInput] = useState("");
  const [bandwidth, setBandwidth] = useState<Bandwidth>("medium");
  const [region, setRegion] = useState<Region>("global");
  const [isStaking, setIsStaking] = useState(false);
  const [showMyStats, setShowMyStats] = useState(true);

  const stakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (stakeTimerRef.current) clearTimeout(stakeTimerRef.current);
    },
    []
  );

  const animatedRelayers = useAnimatedCount(247);
  const stakeNum = Math.max(Number(stakeInput) || 0, 0);
  const estimatedMonthly =
    stakeNum > 0 ? ((stakeNum * 0.142) / 12).toFixed(2) : "0.00";

  const handleStake = useCallback(() => {
    if (stakeNum < 1000) return;
    setIsStaking(true);
    if (stakeTimerRef.current) clearTimeout(stakeTimerRef.current);
    stakeTimerRef.current = setTimeout(() => {
      setIsStaking(false);
      setShowMyStats(true);
      stakeTimerRef.current = null;
    }, 1500);
  }, [stakeNum]);

  /* ---------- render ---------- */
  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Stake MIX, relay transactions, earn fees. The relay network provides the anonymity set
        every withdrawal depends on — more relayers means stronger privacy for everyone.
      </p>

      {/* ── Network stats ────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
        <StatCard label="Relayers" value={animatedRelayers.toLocaleString()} tone="indigo" />
        <StatCard label="Staked" value="$12.4M" />
        <StatCard label="Privacy" value="96/100" tone="indigo" />
        <StatCard label="24h fees" value="$18,420" />
        <StatCard label="Avg APY" value="14.2%" />
      </div>

      {/* ── Network map ──────────────────────────── */}
      <div className="mb-5">
        <NetworkMap nodes={nodes} edges={edges} />
      </div>

      {/* ── Become a relayer ─────────────────────── */}
      <div className="mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
          Become a relayer
        </p>
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
          {/* stake input */}
          <div>
            <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] block mb-1.5">
              Stake amount (MIX)
            </label>
            <input
              type="number"
              min={0}
              placeholder="Min 1,000 MIX"
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#6366f1]/60 transition"
            />
            <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-1.5 tabular-nums">
              <span>Current stake: 0 MIX</span>
              <span>
                Est. earnings:{" "}
                <span className="text-[#818cf8] font-medium">${estimatedMonthly}/mo</span>
              </span>
            </div>
          </div>

          {/* bandwidth */}
          <div>
            <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] block mb-1.5">
              Bandwidth
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BANDWIDTH_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setBandwidth(opt.key)}
                  className={`py-2 rounded-lg text-center transition-all border ${
                    bandwidth === opt.key
                      ? "bg-[#6366f1]/10 border-[#6366f1]/40"
                      : "bg-[var(--bg)] border-[var(--border-subtle)] hover:border-[#6366f1]/30"
                  }`}
                >
                  <p
                    className={`text-[13px] font-medium ${
                      bandwidth === opt.key
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] tabular-nums">
                    {opt.speed}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* region */}
          <div>
            <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] block mb-1.5">
              Region
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {REGION_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setRegion(opt.key)}
                  className={`py-2 rounded-lg text-[12px] font-medium transition-all border ${
                    region === opt.key
                      ? "bg-[#6366f1]/10 border-[#6366f1]/40 text-[var(--text-primary)]"
                      : "bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[#6366f1]/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* stake button */}
          <button
            onClick={handleStake}
            disabled={stakeNum < 1000 || isStaking}
            className="btn-primary w-full py-2.5 text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isStaking ? "Staking…" : "Stake & start relaying"}
          </button>

          {/* requirements */}
          <ul className="text-[11px] text-[var(--text-muted)] space-y-1 pt-1">
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Minimum 1,000 MIX staked
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> 99% uptime SLA
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> No-logging policy enforced on-chain
            </li>
          </ul>
        </div>
      </div>

      {/* ── My relay stats ───────────────────────── */}
      {showMyStats && (
        <div className="mb-5">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
            My relay stats
          </p>
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div>
                <p className="text-[18px] font-semibold text-[var(--text-primary)] tabular-nums">
                  1,847
                </p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.06em]">
                  Txs relayed
                </p>
              </div>
              <div>
                <p className="text-[18px] font-semibold text-[#818cf8] tabular-nums">$342.50</p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.06em]">
                  Fees earned
                </p>
              </div>
              <div>
                <p className="text-[18px] font-semibold text-[var(--text-primary)] tabular-nums">
                  99.7%
                </p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.06em]">
                  Uptime
                </p>
              </div>
              <div>
                <p className="text-[18px] font-semibold text-[var(--text-primary)] tabular-nums">
                  4.8<span className="text-[11px] text-[var(--text-muted)]">/5</span>
                </p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.06em]">
                  Reputation
                </p>
              </div>
              <div>
                <p className="text-[18px] font-semibold text-[var(--text-primary)] tabular-nums">
                  23d
                </p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.06em]">
                  Active
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-lg text-[12px] font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:border-mixer-red/40 hover:text-mixer-red transition">
                Unstake
              </button>
              <button className="flex-1 btn-primary py-2 text-[12px] font-semibold">
                Claim rewards
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Leaderboard ──────────────────────────── */}
      <div className="mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
          Leaderboard
        </p>
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  <th className="px-3 py-2 font-medium">Rank</th>
                  <th className="px-3 py-2 font-medium">Relayer</th>
                  <th className="px-3 py-2 font-medium text-right">Staked</th>
                  <th className="px-3 py-2 font-medium text-right">Txs</th>
                  <th className="px-3 py-2 font-medium text-right">Uptime</th>
                  <th className="px-3 py-2 font-medium text-right">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {LEADERBOARD.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[#6366f1]/5 transition"
                  >
                    <td className="px-3 py-2 font-medium text-[#818cf8] tabular-nums">
                      #{entry.rank}
                    </td>
                    <td className="px-3 py-2 font-mono text-[var(--text-primary)]">
                      {entry.id}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)] tabular-nums text-right">
                      {entry.staked}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)] tabular-nums text-right">
                      {entry.txsRelayed.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)] tabular-nums text-right">
                      {entry.uptime}
                    </td>
                    <td className="px-3 py-2 text-[#818cf8] font-medium tabular-nums text-right">
                      {entry.earnings}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── How it works ────────────────────────── */}
      <div>
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
          How it works
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#6366f1] text-white font-semibold text-[10px] tabular-nums shrink-0">
                  {step.num}
                </span>
                <p className="text-[13px] text-[var(--text-primary)] font-medium">
                  {step.title}
                </p>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
