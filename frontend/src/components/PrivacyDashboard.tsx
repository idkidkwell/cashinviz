"use client";

import { useState, useEffect, useRef } from "react";

/* ─── Helpers ──────────────────────────────────── */

function useAnimatedNumber(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const start = ref.current;
    const t0 = performance.now();
    let raf: number;
    function tick(now: number) {
      const t = Math.min((now - t0) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setValue(start + (target - start) * e);
      if (t < 1) raf = requestAnimationFrame(tick);
      else ref.current = target;
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function formatNum(n: number) {
  return n.toLocaleString("en-US");
}

/* ─── Metric Card ──────────────────────────────── */

function MetricCard({
  label,
  value,
  sub,
  change,
  changeDir,
  accent = "#6366f1",
}: {
  label: string;
  value: string;
  sub?: string;
  change?: string;
  changeDir?: "up" | "down";
  accent?: string;
}) {
  return (
    <div className="wow-card relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-elevation-1" onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width * 100) + '%'); e.currentTarget.style.setProperty('--mouse-y', ((e.clientY - r.top) / r.height * 100) + '%'); }}>
      <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}40, transparent)` }} />
      <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[28px] font-semibold text-[var(--text-primary)] tracking-tight tabular-nums leading-none">{value}</span>
        {change && (
          <span className={`text-[12px] font-medium ${changeDir === "up" ? "text-emerald-400" : "text-red-400"}`}>
            {changeDir === "up" ? "+" : ""}{change}
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-[11px] text-[var(--text-muted)]">{sub}</p>}
    </div>
  );
}

/* ─── Sparkline ────────────────────────────────── */

function Sparkline({ data, color = "#6366f1", height = 40 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${w},${height}`}
        fill={`url(#sg-${color.replace("#", "")})`}
      />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Pool Composition Bar ─────────────────────── */

function PoolBar() {
  const pools = [
    { label: "ETH", pct: 42, color: "#627eea" },
    { label: "USDC", pct: 28, color: "#2775ca" },
    { label: "USDT", pct: 15, color: "#26a17b" },
    { label: "DAI", pct: 8, color: "#f5ac37" },
    { label: "Other", pct: 7, color: "#4a4a55" },
  ];
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden gap-[2px]">
        {pools.map((p) => (
          <div
            key={p.label}
            style={{ width: `${p.pct}%`, backgroundColor: p.color }}
            className="rounded-full transition-all duration-700"
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {pools.map((p) => (
          <div key={p.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-[11px] text-[var(--text-secondary)]">{p.label}</span>
            <span className="text-[11px] font-medium text-[var(--text-muted)]">{p.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Recent Activity Row ──────────────────────── */

const ACTIVITY_DATA = [
  { type: "deposit", amount: "10 ETH", chain: "Ethereum", time: "2m ago", hash: "0x7f2a...e3b1" },
  { type: "withdraw", amount: "5,000 USDC", chain: "Arbitrum", time: "5m ago", hash: "0x3c9d...a7f2" },
  { type: "deposit", amount: "2.5 ETH", chain: "Base", time: "8m ago", hash: "0xb1e4...9c3d" },
  { type: "withdraw", amount: "1.2 ETH", chain: "Optimism", time: "12m ago", hash: "0x9a2f...d4e8" },
  { type: "deposit", amount: "25,000 USDT", chain: "Polygon", time: "15m ago", hash: "0x4d7c...b2a9" },
  { type: "deposit", amount: "0.5 BTC", chain: "Bitcoin", time: "18m ago", hash: "bc1q...x7r3" },
  { type: "withdraw", amount: "8,400 DAI", chain: "Ethereum", time: "22m ago", hash: "0x6e1b...f5c0" },
];

/* ─── Relayer Status ───────────────────────────── */

const RELAYERS = [
  { name: "relay-alpha", region: "US-East", latency: 120, status: "online" },
  { name: "relay-bravo", region: "EU-West", latency: 85, status: "online" },
  { name: "relay-charlie", region: "AP-SE", latency: 210, status: "online" },
  { name: "relay-delta", region: "US-West", latency: 95, status: "online" },
  { name: "relay-echo", region: "EU-East", latency: 0, status: "offline" },
];

/* ─── Main Dashboard ───────────────────────────── */

export function PrivacyDashboard() {
  const [depositsToday, setDepositsToday] = useState(387);
  const [tvl, setTvl] = useState(47.2);
  const [users, setUsers] = useState(8214);
  const [avgMixTime, setAvgMixTime] = useState(4.2);

  useEffect(() => {
    const id = setInterval(() => {
      setDepositsToday((d) => d + Math.floor(Math.random() * 3));
      setTvl((v) => +(v + (Math.random() - 0.45) * 0.1).toFixed(1));
      setUsers((u) => u + Math.floor(Math.random() * 2));
      setAvgMixTime((t) => +Math.max(1, t + (Math.random() - 0.5) * 0.2).toFixed(1));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const aDep = useAnimatedNumber(depositsToday, 800);
  const aTvl = useAnimatedNumber(tvl, 800);
  const aUsers = useAnimatedNumber(users, 800);
  const aAvg = useAnimatedNumber(avgMixTime, 800);

  const volumeData = [12, 18, 15, 24, 22, 30, 28, 35, 32, 41, 38, 47];
  const usersData = [120, 145, 132, 178, 165, 201, 189, 220, 215, 248, 235, 267];
  const mixTimeData = [6.2, 5.8, 5.1, 4.9, 5.3, 4.6, 4.2, 4.5, 4.0, 3.8, 4.2, 3.9];

  return (
    <div className="w-full space-y-5">
      {/* ── Top Metrics ── */}
      <div className="stagger-in grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Value Locked"
          value={`$${aTvl.toFixed(1)}M`}
          change="12.3%"
          changeDir="up"
          accent="#6366f1"
        />
        <MetricCard
          label="Deposits Today"
          value={formatNum(Math.round(aDep))}
          change="8.7%"
          changeDir="up"
          accent="#22c55e"
        />
        <MetricCard
          label="Unique Users"
          value={formatNum(Math.round(aUsers))}
          change="4.2%"
          changeDir="up"
          accent="#8b5cf6"
        />
        <MetricCard
          label="Avg Mix Time"
          value={`${aAvg.toFixed(1)}h`}
          sub="Target: < 4.0h"
          change="0.3h"
          changeDir="down"
          accent="#f59e0b"
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="stagger-in grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="wow-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-elevation-1" onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width * 100) + '%'); e.currentTarget.style.setProperty('--mouse-y', ((e.clientY - r.top) / r.height * 100) + '%'); }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-medium text-[var(--text-secondary)]">Volume (12w)</p>
            <span className="text-[11px] text-emerald-400 font-medium">+31.2%</span>
          </div>
          <Sparkline data={volumeData} color="#6366f1" height={64} />
        </div>
        <div className="wow-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-elevation-1" onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width * 100) + '%'); e.currentTarget.style.setProperty('--mouse-y', ((e.clientY - r.top) / r.height * 100) + '%'); }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-medium text-[var(--text-secondary)]">Users (12w)</p>
            <span className="text-[11px] text-emerald-400 font-medium">+18.5%</span>
          </div>
          <Sparkline data={usersData} color="#8b5cf6" height={64} />
        </div>
        <div className="wow-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-elevation-1" onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width * 100) + '%'); e.currentTarget.style.setProperty('--mouse-y', ((e.clientY - r.top) / r.height * 100) + '%'); }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-medium text-[var(--text-secondary)]">Avg Mix Time (12w)</p>
            <span className="text-[11px] text-emerald-400 font-medium">-37.1%</span>
          </div>
          <Sparkline data={mixTimeData} color="#22c55e" height={64} />
        </div>
      </div>

      {/* ── Pool Composition + Anonymity Set ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Pool Composition */}
        <div className="lg:col-span-3 wow-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-elevation-1" onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width * 100) + '%'); e.currentTarget.style.setProperty('--mouse-y', ((e.clientY - r.top) / r.height * 100) + '%'); }}>
          <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-4">Pool Composition</p>
          <PoolBar />
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-[var(--border-subtle)]">
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Pool Size</p>
              <p className="text-[16px] font-semibold text-[var(--text-primary)] mt-0.5">1,243.7 ETH</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Utilization</p>
              <p className="text-[16px] font-semibold text-[var(--text-primary)] mt-0.5">78%</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Capacity</p>
              <p className="text-[16px] font-semibold text-[var(--text-primary)] mt-0.5">5,000 deposits</p>
            </div>
          </div>
        </div>

        {/* Anonymity Set */}
        <div className="lg:col-span-2 wow-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-elevation-1" onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width * 100) + '%'); e.currentTarget.style.setProperty('--mouse-y', ((e.clientY - r.top) / r.height * 100) + '%'); }}>
          <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-4">Anonymity Set</p>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth={8} />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke="#6366f1" strokeWidth={8} strokeLinecap="round"
                  strokeDasharray={`${0.57 * 2 * Math.PI * 40} ${2 * Math.PI * 40}`}
                  style={{ filter: "drop-shadow(0 0 4px rgba(99,102,241,0.4))" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[18px] font-bold text-[var(--text-primary)]">2,847</span>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Current</span>
                <span className="text-[var(--text-primary)] font-medium">2,847</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Max Capacity</span>
                <span className="text-[var(--text-primary)] font-medium">5,000</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Utilization</span>
                <span className="text-emerald-400 font-medium">57%</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">24h Growth</span>
                <span className="text-emerald-400 font-medium">+127</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Activity + Relayers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Recent Activity */}
        <div className="lg:col-span-3 wow-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-elevation-1" onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width * 100) + '%'); e.currentTarget.style.setProperty('--mouse-y', ((e.clientY - r.top) / r.height * 100) + '%'); }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">Recent Activity</p>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 live-pulse" />
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-faint)]">Live</span>
          </div>
          <div className="space-y-0">
            {ACTIVITY_DATA.map((tx, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-0"
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                  tx.type === "deposit" ? "bg-[#6366f1]/10" : "bg-emerald-400/10"
                }`}>
                  <svg className={`w-3 h-3 ${tx.type === "deposit" ? "text-[#6366f1]" : "text-emerald-400"}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    {tx.type === "deposit" ? <path d="M8 3v10m0 0l-3-3m3 3l3-3" /> : <path d="M8 13V3m0 0L5 6m3-3l3 3" />}
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-[var(--text-primary)]">{tx.amount}</span>
                    <span className="text-[10px] text-[var(--text-faint)]">{tx.chain}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">{tx.hash}</span>
                </div>
                <span className="text-[10px] text-[var(--text-faint)] shrink-0">{tx.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Relayer Status */}
        <div className="lg:col-span-2 wow-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-elevation-1" onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width * 100) + '%'); e.currentTarget.style.setProperty('--mouse-y', ((e.clientY - r.top) / r.height * 100) + '%'); }}>
          <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-4">Relayer Network</p>
          <div className="space-y-0">
            {RELAYERS.map((r) => (
              <div key={r.name} className="flex items-center gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  r.status === "online" ? "bg-emerald-400" : "bg-red-400"
                }`} style={{ boxShadow: r.status === "online" ? "0 0 4px #22c55e" : "0 0 4px #ef4444" }} />
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-medium text-[var(--text-primary)]">{r.name}</span>
                  <span className="text-[10px] text-[var(--text-faint)] ml-2">{r.region}</span>
                </div>
                {r.status === "online" ? (
                  <span className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">{r.latency}ms</span>
                ) : (
                  <span className="text-[10px] text-red-400 font-medium">Offline</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Online</p>
              <p className="text-[14px] font-semibold text-emerald-400 mt-0.5">4/5</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Avg Latency</p>
              <p className="text-[14px] font-semibold text-[var(--text-primary)] mt-0.5">128ms</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Network Status ── */}
      <div className="wow-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-elevation-1" onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width * 100) + '%'); e.currentTarget.style.setProperty('--mouse-y', ((e.clientY - r.top) / r.height * 100) + '%'); }}>
        <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-4">Network Status</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Uptime", value: "99.97%", color: "#22c55e" },
            { label: "Contracts", value: "Verified", color: "#22c55e" },
            { label: "Failed Txs", value: "0.02%", color: "#22c55e" },
            { label: "Governance", value: "Active", color: "#6366f1" },
            { label: "Circuits", value: "Audited", color: "#22c55e" },
            { label: "IPFS", value: "Pinned", color: "#22c55e" },
          ].map((s) => (
            <div key={s.label} className="text-center py-3 rounded-lg bg-[var(--bg)] border border-[var(--border-subtle)]">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{s.label}</p>
              <p className="text-[13px] font-semibold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
