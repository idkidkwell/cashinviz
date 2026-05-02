"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ---------- types ---------- */
type ScanState = "idle" | "scanning" | "results";
type Severity = "HIGH" | "MEDIUM" | "LOW";

interface RiskCard {
  title: string;
  severity: Severity;
  description: string;
}

interface LinkedWallet {
  address: string;
  confidence: number;
  linkType: string;
  firstSeen: string;
}

interface Recommendation {
  text: string;
  impact: number;
  action: "fix" | "enable" | "learn";
  actionLabel: string;
}

interface FlowNode {
  id: string;
  label: string;
  type: "center" | "exchange" | "defi" | "wallet" | "unknown";
  x: number;
  y: number;
  amount: string;
}

/* ---------- constants / mock data ---------- */
const CHAINS = [
  "Ethereum",
  "Arbitrum",
  "Polygon",
  "BSC",
  "Optimism",
  "Avalanche",
  "Base",
  "zkSync",
];

const MOCK_SCORE = 73;
const MOCK_GRADE = "D";
const MOCK_GRADE_LABEL = "Highly exposed";

const MOCK_RISKS: RiskCard[] = [
  {
    title: "Exchange exposure",
    severity: "HIGH",
    description: "Funds traced to 3 centralized exchanges (Coinbase, Binance, Kraken)",
  },
  {
    title: "Wallet clustering",
    severity: "MEDIUM",
    description: "4 wallets linked with 87% confidence",
  },
  {
    title: "ENS / social links",
    severity: "HIGH",
    description: "ENS name resolves to this address, Twitter linked",
  },
  {
    title: "Token diversity",
    severity: "LOW",
    description: "Assets spread across 12 tokens",
  },
  {
    title: "Transaction patterns",
    severity: "HIGH",
    description: "Regular weekly transfers suggest salary/income",
  },
  {
    title: "Smart contract history",
    severity: "MEDIUM",
    description: "Interacted with 23 DeFi protocols",
  },
];

const MOCK_LINKED: LinkedWallet[] = [
  { address: "0x3f2a...8c1d", confidence: 94, linkType: "Shared exchange deposit", firstSeen: "47 days" },
  { address: "0x7b91...2e4f", confidence: 87, linkType: "On-chain transfer cluster", firstSeen: "112 days" },
  { address: "0xd4c8...a037", confidence: 71, linkType: "Gas-station correlation", firstSeen: "203 days" },
  { address: "0x91fe...5b22", confidence: 63, linkType: "Timing heuristic", firstSeen: "18 days" },
  { address: "0x0a4d...cc98", confidence: 52, linkType: "Token overlap", firstSeen: "331 days" },
];

const MOCK_RECS: Recommendation[] = [
  { text: "Mix 2.4 ETH currently in main wallet", impact: 12, action: "fix", actionLabel: "Fix now" },
  { text: "Break link between Wallet A and Wallet B", impact: 9, action: "fix", actionLabel: "Fix now" },
  { text: "Remove ENS name to reduce exposure", impact: 7, action: "learn", actionLabel: "Learn more" },
  { text: "Use stealth addresses for future receives", impact: 5, action: "enable", actionLabel: "Enable" },
];

const MOCK_FLOW_NODES: FlowNode[] = [
  { id: "center", label: "Your wallet", type: "center", x: 300, y: 200, amount: "" },
  { id: "coinbase", label: "Coinbase", type: "exchange", x: 80, y: 80, amount: "4.2 ETH" },
  { id: "binance", label: "Binance", type: "exchange", x: 520, y: 70, amount: "1.8 ETH" },
  { id: "kraken", label: "Kraken", type: "exchange", x: 100, y: 340, amount: "0.6 ETH" },
  { id: "uniswap", label: "Uniswap", type: "defi", x: 520, y: 320, amount: "3.1 ETH" },
  { id: "aave", label: "Aave", type: "defi", x: 500, y: 190, amount: "7.0 ETH" },
  { id: "wallet1", label: "0x3f2a...8c1d", type: "wallet", x: 80, y: 200, amount: "0.9 ETH" },
  { id: "unknown1", label: "Unknown", type: "unknown", x: 300, y: 370, amount: "2.3 ETH" },
];

/* ---------- helpers ---------- */
function sevClasses(s: Severity) {
  if (s === "HIGH") return "bg-mixer-red/10 text-mixer-red border-mixer-red/25";
  if (s === "MEDIUM") return "bg-amber-400/10 text-amber-400 border-amber-400/25";
  return "bg-emerald-400/10 text-emerald-400 border-emerald-400/25";
}

function nodeColor(t: FlowNode["type"]) {
  switch (t) {
    case "exchange":
      return "#f87171"; // warning — exchanges are a privacy risk
    case "defi":
      return "#818cf8"; // indigo — brand
    case "wallet":
      return "#9ca3af"; // neutral
    case "unknown":
      return "#a78bfa"; // violet — unknown / suspicious
    default:
      return "#6366f1"; // center
  }
}

function scoreColor(s: number) {
  if (s >= 80) return { ring: "#ef4444", text: "text-mixer-red" };
  if (s >= 60) return { ring: "#f59e0b", text: "text-amber-400" };
  if (s >= 40) return { ring: "#fbbf24", text: "text-amber-300" };
  if (s >= 20) return { ring: "#818cf8", text: "text-[#818cf8]" };
  return { ring: "#34d399", text: "text-emerald-400" };
}

/* ---------- animated counter hook ---------- */
function useAnimatedNumber(target: number, duration = 1200, active = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.round(target * easeOut(progress)));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);
  return value;
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/* ================================================================
   COMPONENT
   ================================================================ */

export function PrivacyAuditor() {
  const [state, setState] = useState<ScanState>("idle");
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState("Ethereum");
  const [chainOpen, setChainOpen] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [scanStep, setScanStep] = useState(0);

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const animatedScore = useAnimatedNumber(MOCK_SCORE, 1400, state === "results");
  const sc = scoreColor(MOCK_SCORE);

  /* cleanup on unmount */
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      stepTimersRef.current.forEach((t) => clearTimeout(t));
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, []);

  /* kick off scan */
  const startScan = useCallback(() => {
    if (!address.trim()) return;

    // clear any in-flight scan
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    stepTimersRef.current.forEach((t) => clearTimeout(t));
    stepTimersRef.current = [];
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);

    setState("scanning");
    setScanCount(0);
    setScanStep(0);

    let count = 0;
    scanIntervalRef.current = setInterval(() => {
      count += Math.floor(Math.random() * 38) + 12;
      if (count > 847) count = 847;
      setScanCount(count);
    }, 60);

    [0, 1, 2, 3, 4].forEach((s, i) => {
      stepTimersRef.current.push(setTimeout(() => setScanStep(s), i * 500));
    });

    finishTimerRef.current = setTimeout(() => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      setScanCount(847);
      setState("results");
    }, 2800);
  }, [address]);

  const reset = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    stepTimersRef.current.forEach((t) => clearTimeout(t));
    stepTimersRef.current = [];
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    setState("idle");
    setAddress("");
    setScanCount(0);
    setScanStep(0);
  };

  /* circumference for the score ring */
  const RADIUS = 72;
  const CIRC = 2 * Math.PI * RADIUS;
  const offset = CIRC - (CIRC * animatedScore) / 100;

  const scanSteps = [
    "Resolving address",
    "Fetching transactions",
    "Analyzing clusters",
    "Scanning cross-chain",
    "Computing exposure",
  ];

  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Scan any wallet to reveal how exposed it is on-chain. Resolves ENS, traces transaction
        flow across eight chains, and clusters linked addresses. No connection required.
      </p>

      {/* ── Search bar ───────────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-4">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
          Target
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startScan()}
            placeholder="0x... or vitalik.eth"
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#6366f1]/60 transition"
          />

          <div className="relative sm:min-w-[140px]">
            <button
              onClick={() => setChainOpen(!chainOpen)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] text-left flex items-center justify-between gap-2 hover:border-[#6366f1]/40 transition"
            >
              <span className="truncate">{chain}</span>
              <svg
                className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform shrink-0 ${chainOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {chainOpen && (
              <div className="absolute z-30 mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden">
                {CHAINS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setChain(c);
                      setChainOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#6366f1]/10 transition ${c === chain ? "text-[#818cf8]" : "text-[var(--text-primary)]"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={startScan}
            disabled={state === "scanning" || !address.trim()}
            className="btn-primary px-6 py-2 text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {state === "scanning" ? "Scanning…" : "Scan"}
          </button>
        </div>

        {/* example addresses */}
        <p className="text-[11px] text-[var(--text-muted)] mt-2.5 flex flex-wrap gap-x-2 gap-y-0.5">
          <span>Try:</span>
          {["vitalik.eth", "0x1234...abcd", "0xd8dA...6045"].map((ex) => (
            <button
              key={ex}
              onClick={() => setAddress(ex)}
              className="text-[#818cf8] hover:text-[#a5b4fc] transition"
            >
              {ex}
            </button>
          ))}
        </p>
      </div>

      {/* ── Scanning ─────────────────────────────── */}
      {state === "scanning" && (
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-6 flex flex-col items-center gap-4 animate-auditor-fade">
          {/* radar */}
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {[40, 70, 95].map((r) => (
                <circle
                  key={r}
                  cx={100}
                  cy={100}
                  r={r}
                  fill="none"
                  stroke="#6366f1"
                  strokeOpacity={0.12}
                  strokeWidth={1}
                />
              ))}
              <line x1={100} y1={5} x2={100} y2={195} stroke="#6366f1" strokeOpacity={0.1} strokeWidth={1} />
              <line x1={5} y1={100} x2={195} y2={100} stroke="#6366f1" strokeOpacity={0.1} strokeWidth={1} />
              <g style={{ transformOrigin: "100px 100px" }} className="animate-[spin_2s_linear_infinite]">
                <defs>
                  <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.55" />
                  </linearGradient>
                </defs>
                <path d="M100,100 L100,5 A95,95 0 0,1 180,52 Z" fill="url(#sweep)" />
                <line x1={100} y1={100} x2={100} y2={5} stroke="#6366f1" strokeWidth={2} strokeOpacity={0.9} />
              </g>
              <circle cx={100} cy={100} r={3} fill="#818cf8" className="animate-pulse" />
              {scanStep > 1 && <circle cx={130} cy={65} r={2.5} fill="#818cf8" opacity={0.8} className="animate-ping" />}
              {scanStep > 2 && <circle cx={70} cy={120} r={2.5} fill="#f87171" opacity={0.8} className="animate-ping" />}
              {scanStep > 3 && <circle cx={140} cy={140} r={2.5} fill="#fbbf24" opacity={0.8} className="animate-ping" />}
            </svg>
          </div>

          <div className="text-center space-y-2 w-full max-w-[320px]">
            <p className="text-[13px] text-[var(--text-primary)] tabular-nums font-medium">
              Analyzing {scanCount.toLocaleString()} transactions…
            </p>
            <div className="space-y-0.5 text-left">
              {scanSteps.map((label, i) => (
                <p
                  key={label}
                  className={`text-[11px] font-mono tabular-nums transition-opacity ${
                    i <= scanStep
                      ? "text-[var(--text-secondary)] opacity-100"
                      : "text-[var(--text-muted)] opacity-40"
                  }`}
                >
                  {i < scanStep ? "✓" : i === scanStep ? "▶" : "○"}  {label}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────── */}
      {state === "results" && (
        <div className="space-y-5 animate-auditor-fade">
          {/* exposure score */}
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-5">
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-4">
              Exposure score
            </p>
            <div className="flex items-center gap-5">
              <div className="relative w-[168px] h-[168px] shrink-0">
                <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                  <circle cx={100} cy={100} r={RADIUS} fill="none" stroke="var(--border)" strokeWidth={10} />
                  <circle
                    cx={100}
                    cy={100}
                    r={RADIUS}
                    fill="none"
                    stroke={sc.ring}
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={offset}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-[40px] font-semibold tabular-nums leading-none ${sc.text}`}>
                    {animatedScore}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] mt-1">/ 100</span>
                </div>
              </div>
              <div>
                <p className={`text-[22px] font-semibold ${sc.text}`}>Grade {MOCK_GRADE}</p>
                <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">{MOCK_GRADE_LABEL}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-2 leading-relaxed max-w-[320px]">
                  Higher scores mean more on-chain information leakage. Anything above 60
                  should be addressed.
                </p>
              </div>
            </div>
          </div>

          {/* risk breakdown */}
          <div>
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
              Risk breakdown
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MOCK_RISKS.map((r) => (
                <div
                  key={r.title}
                  className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[13px] text-[var(--text-primary)] font-medium">{r.title}</p>
                    <span
                      className={`text-[9px] uppercase tracking-[0.08em] font-semibold px-1.5 py-0.5 rounded-full border ${sevClasses(r.severity)}`}
                    >
                      {r.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    {r.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* flow map */}
          <div>
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
              Transaction flow map
            </p>
            <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3 overflow-x-auto">
              <svg viewBox="0 0 600 420" className="w-full min-w-[480px] h-auto">
                <defs>
                  <marker id="auditor-arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto">
                    <path d="M0,0 L10,5 L0,10 Z" fill="#6b7280" />
                  </marker>
                  <style>{`
                    @keyframes auditorFlow { to { stroke-dashoffset: -20; } }
                    .auditor-line { animation: auditorFlow 1s linear infinite; }
                  `}</style>
                </defs>

                {MOCK_FLOW_NODES.filter((n) => n.id !== "center").map((n) => {
                  const cx = 300;
                  const cy = 200;
                  return (
                    <g key={`line-${n.id}`}>
                      <line
                        x1={cx}
                        y1={cy}
                        x2={n.x}
                        y2={n.y}
                        stroke={nodeColor(n.type)}
                        strokeWidth={1.5}
                        strokeOpacity={0.25}
                        markerEnd="url(#auditor-arrow)"
                      />
                      <line
                        x1={cx}
                        y1={cy}
                        x2={n.x}
                        y2={n.y}
                        stroke={nodeColor(n.type)}
                        strokeWidth={1.5}
                        strokeOpacity={0.65}
                        strokeDasharray="4 16"
                        className="auditor-line"
                      />
                      <text
                        x={(cx + n.x) / 2}
                        y={(cy + n.y) / 2 - 6}
                        fill="#9ca3af"
                        fontSize={10}
                        textAnchor="middle"
                      >
                        {n.amount}
                      </text>
                    </g>
                  );
                })}

                {MOCK_FLOW_NODES.map((n) => (
                  <g key={n.id}>
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={n.type === "center" ? 28 : 20}
                      fill={nodeColor(n.type)}
                      fillOpacity={n.type === "center" ? 0.25 : 0.15}
                      stroke={nodeColor(n.type)}
                      strokeWidth={n.type === "center" ? 2 : 1.5}
                    />
                    {n.type === "center" && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={34}
                        fill="none"
                        stroke="#818cf8"
                        strokeWidth={1}
                        strokeOpacity={0.25}
                        className="animate-pulse"
                      />
                    )}
                    <text
                      x={n.x}
                      y={n.y + 4}
                      fill="#e5e7eb"
                      fontSize={n.type === "center" ? 11 : 9}
                      fontWeight={n.type === "center" ? 600 : 500}
                      textAnchor="middle"
                    >
                      {n.label}
                    </text>
                  </g>
                ))}
              </svg>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-1 text-[10px] text-[var(--text-muted)]">
                {(["exchange", "defi", "wallet", "unknown"] as const).map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: nodeColor(t) }} />
                    {t === "exchange"
                      ? "Exchanges"
                      : t === "defi"
                        ? "DeFi protocols"
                        : t === "wallet"
                          ? "Wallets"
                          : "Unknown"}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* linked wallets */}
          <div>
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
              Linked wallets
            </p>
            <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                      <th className="px-3 py-2 font-medium">Address</th>
                      <th className="px-3 py-2 font-medium">Confidence</th>
                      <th className="px-3 py-2 font-medium">Link type</th>
                      <th className="px-3 py-2 font-medium text-right">First seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_LINKED.map((w) => (
                      <tr
                        key={w.address}
                        className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[#6366f1]/5 transition"
                      >
                        <td className="px-3 py-2 font-mono text-[var(--text-primary)] tabular-nums">
                          {w.address}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`font-semibold tabular-nums ${
                              w.confidence >= 80
                                ? "text-mixer-red"
                                : w.confidence >= 60
                                  ? "text-amber-400"
                                  : "text-[var(--text-secondary)]"
                            }`}
                          >
                            {w.confidence}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{w.linkType}</td>
                        <td className="px-3 py-2 text-[var(--text-muted)] tabular-nums text-right">
                          {w.firstSeen}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* recommendations */}
          <div>
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
              Recommendations
            </p>
            <div className="space-y-1.5">
              {MOCK_RECS.map((r) => (
                <div
                  key={r.text}
                  className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[var(--text-primary)] font-medium">{r.text}</p>
                    <p className="text-[10px] text-[#818cf8] mt-0.5 tabular-nums">
                      +{r.impact} points
                    </p>
                  </div>
                  <button
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                      r.action === "fix"
                        ? "bg-[#6366f1] text-white hover:bg-[#5558e3]"
                        : r.action === "enable"
                          ? "bg-[#6366f1]/15 text-[#818cf8] hover:bg-[#6366f1]/25 border border-[#6366f1]/30"
                          : "bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                    }`}
                  >
                    {r.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* go-private CTA */}
          <div className="bg-[#6366f1]/5 border border-[#6366f1]/20 rounded-xl p-4 text-center">
            <p className="text-[14px] text-[var(--text-primary)] font-medium">
              Your wallet is <span className="text-mixer-red">{MOCK_SCORE}% exposed</span>.
            </p>
            <p className="text-[12px] text-[var(--text-secondary)] mt-1 mb-3">
              Mix assets, break on-chain links, and reclaim your privacy.
            </p>
            <button className="btn-primary px-6 py-2 text-[13px] font-semibold">
              Start mixing — fix your score
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={reset}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-2 transition"
            >
              Scan another wallet
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes auditorFade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-auditor-fade { animation: auditorFade 0.35s ease-out both; }
      `}</style>
    </div>
  );
}
