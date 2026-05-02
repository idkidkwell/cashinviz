"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Types ─── */
interface Wallet {
  id: string;
  name: string;
  address: string;
  chains: string[];
  balance: string;
  exposureScore: number;
  status: "protected" | "action-needed";
}

interface LogEntry {
  time: string;
  message: string;
}

interface Recommendation {
  id: number;
  tone: "warn" | "ok" | "info";
  text: string;
  actionLabel: string;
  dismissed: boolean;
}

/* ─── Mock Data ─── */
const WALLETS: Wallet[] = [
  { id: "w1", name: "Main",    address: "0x7f3a...8e2d", chains: ["ETH", "ARB", "OP"],   balance: "4.28 ETH",  exposureScore: 18, status: "protected" },
  { id: "w2", name: "DeFi",    address: "0x4b1c...3f7a", chains: ["ETH", "POLY", "BSC"], balance: "12.05 ETH", exposureScore: 62, status: "action-needed" },
  { id: "w3", name: "Trading", address: "0x9d2e...1b4c", chains: ["ETH"],                balance: "1.73 ETH",  exposureScore: 34, status: "protected" },
];

const LOG_MESSAGES = [
  "Scanning wallet 0x7f3a… for exposure",
  "Generated 3 decoy transactions on Arbitrum",
  "Anonymity set healthy (2,847 deposits)",
  "No suspicious analysis detected",
  "Cross-chain route optimized via Polygon bridge",
  "Timing analysis countermeasures active",
  "Rotating relay node selection",
  "Verified zero-knowledge proof integrity",
  "Decoy batch #847 confirmed on Optimism",
  "Wallet 0x4b1c… exposure score recalculated",
  "Auto-mix threshold check: within limits",
  "MEV shield active for pending transactions",
];

const INITIAL_RECOMMENDATIONS: Recommendation[] = [
  { id: 1, tone: "warn", text: "DeFi wallet received funds from a tagged exchange — mix within 2h", actionLabel: "Fix now", dismissed: false },
  { id: 2, tone: "ok",   text: "Main wallet anonymity set is strong (2,847)",                         actionLabel: "Dismiss", dismissed: false },
  { id: 3, tone: "warn", text: "Trading wallet pattern: regular 0.1 ETH transfers every Monday",      actionLabel: "Fix now", dismissed: false },
  { id: 4, tone: "info", text: "Enable cross-chain decoys to break timing analysis",                  actionLabel: "Enable",  dismissed: false },
];

/* ─── Ghost icon ─── */
function GhostSVG({ active, size = 64 }: { active: boolean; size?: number }) {
  const body = active ? "#818cf8" : "#6b7280";
  const eye = active ? "#0a0f0a" : "#374151";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      fill="none"
      className="transition-all duration-500"
    >
      <defs>
        {active && (
          <radialGradient id="ghostGlow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35">
              <animate attributeName="stopOpacity" values="0.2;0.5;0.2" dur="2.5s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
      {active && (
        <circle cx="50" cy="50" r="55" fill="url(#ghostGlow)">
          <animate attributeName="r" values="50;60;50" dur="2.5s" repeatCount="indefinite" />
        </circle>
      )}
      <path
        d="M50 10 C25 10 10 30 10 55 L10 95 L20 85 L30 95 L40 85 L50 95 L60 85 L70 95 L80 85 L90 95 L90 55 C90 30 75 10 50 10Z"
        fill={body}
        opacity={active ? 1 : 0.55}
      />
      <ellipse cx="36" cy="48" rx="6" ry="8" fill={eye} />
      <ellipse cx="64" cy="48" rx="6" ry="8" fill={eye} />
      <ellipse cx="50" cy="65" rx="4" ry="3" fill={eye} />
    </svg>
  );
}

/* ─── Exposure gauge ─── */
function ExposureGauge({ score, label }: { score: number; label: string }) {
  const [displayed, setDisplayed] = useState(0);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (displayed / 100) * circumference;
  const color = displayed <= 30 ? "#34d399" : displayed <= 60 ? "#f59e0b" : "#ef4444";
  const textClass = displayed <= 30 ? "text-emerald-400" : displayed <= 60 ? "text-amber-400" : "text-mixer-red";

  useEffect(() => {
    let frame = 0;
    const step = () => {
      setDisplayed((prev) => {
        const diff = score - prev;
        if (Math.abs(diff) < 0.5) return score;
        const next = prev + diff * 0.06;
        frame = requestAnimationFrame(step);
        return next;
      });
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg width="96" height="96" viewBox="0 0 120 120" className="transform -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-100"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-[22px] font-semibold tabular-nums leading-none ${textClass}`}>
            {Math.round(displayed)}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] mt-0.5">/100</span>
        </div>
      </div>
      <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.06em]">{label}</span>
    </div>
  );
}

/* ─── Mini gauge for wallet cards ─── */
function MiniGauge({ score }: { score: number }) {
  const color = score <= 30 ? "#34d399" : score <= 60 ? "#f59e0b" : "#ef4444";
  const textColor = score <= 30 ? "text-emerald-400" : score <= 60 ? "text-amber-400" : "text-mixer-red";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className={`text-[11px] font-mono tabular-nums ${textColor}`}>{score}</span>
    </div>
  );
}

/* ─── Go Dark overlay ─── */
function GoDarkOverlay({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    "Mixing Main wallet",
    "Mixing DeFi wallet",
    "Mixing Trading wallet",
    "Generating decoys",
    "Rotating addresses",
    "Breaking links",
  ];

  useEffect(() => {
    if (step < steps.length) {
      const t = setTimeout(() => setStep((s) => s + 1), 750);
      return () => clearTimeout(t);
    }
    const t = setTimeout(onComplete, 1200);
    return () => clearTimeout(t);
  }, [step, steps.length, onComplete]);

  const done = step >= steps.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5 p-8 max-w-md">
        <GhostSVG active size={72} />
        <div className="w-72 flex flex-col gap-1">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 text-[12px] font-mono">
              {i < step ? (
                <span className="text-emerald-400">[OK]</span>
              ) : i === step ? (
                <span className="text-[#818cf8] animate-pulse">[..]</span>
              ) : (
                <span className="text-[var(--text-muted)]">[--]</span>
              )}
              <span className={i <= step ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>{s}</span>
            </div>
          ))}
        </div>
        <div className="w-72 h-1 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#6366f1] rounded-full transition-all duration-500"
            style={{ width: `${(step / steps.length) * 100}%` }}
          />
        </div>
        {done && (
          <div
            className="flex flex-col items-center gap-2"
            style={{ animation: "fadeScaleIn 0.4s ease-out" }}
          >
            <span className="text-[14px] font-semibold text-emerald-400 tracking-wide uppercase">
              All wallets shielded
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   GHOST MODE
   ═══════════════════════════════════════════ */
export function GhostMode() {
  const [ghostActive, setGhostActive] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [recommendations, setRecommendations] = useState(INITIAL_RECOMMENDATIONS);
  const [goDarkActive, setGoDarkActive] = useState(false);
  const [goDarkComplete, setGoDarkComplete] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const logIndex = useRef(0);

  /* Auto-actions config */
  const [autoMixThreshold, setAutoMixThreshold] = useState(1000);
  const [autoDecoys, setAutoDecoys] = useState(true);
  const [decoyFrequency, setDecoyFrequency] = useState("6h");
  const [autoRotate, setAutoRotate] = useState(false);
  const [warnRisky, setWarnRisky] = useState(true);
  const [maxGasBudget, setMaxGasBudget] = useState(15);

  const exposureBefore = 73;
  const exposureAfter = 12;

  /* Terminal log */
  useEffect(() => {
    if (!ghostActive) {
      setLogs([]);
      return;
    }
    const fmt = (d: Date) =>
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;

    const now = new Date();
    const initial: LogEntry[] = Array.from({ length: 5 }, (_, i) => {
      const t = new Date(now.getTime() - (5 - i) * 3000);
      return { time: fmt(t), message: LOG_MESSAGES[(logIndex.current + i) % LOG_MESSAGES.length] };
    });
    logIndex.current += 5;
    setLogs(initial);

    const interval = setInterval(() => {
      const entry: LogEntry = {
        time: fmt(new Date()),
        message: LOG_MESSAGES[logIndex.current % LOG_MESSAGES.length],
      };
      logIndex.current++;
      setLogs((prev) => [...prev.slice(-30), entry]);
    }, 3500);
    return () => clearInterval(interval);
  }, [ghostActive]);

  /* Auto-scroll log */
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const dismissRec = (id: number) =>
    setRecommendations((prev) => prev.map((r) => (r.id === id ? { ...r, dismissed: true } : r)));

  const handleGoDarkComplete = useCallback(() => {
    setGoDarkActive(false);
    setGoDarkComplete(true);
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeScaleIn {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInUp {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ghostCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      {goDarkActive && <GoDarkOverlay onComplete={handleGoDarkComplete} />}

      <div className="max-w-[820px] mx-auto">
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
          AI-driven privacy autopilot. Monitors connected wallets across chains, generates decoys,
          and triggers auto-mixes when your anonymity set drops. All actions logged locally.
        </p>

        {/* Master toggle card */}
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-5 mb-4">
          <div className="flex items-center gap-4">
            <GhostSVG active={ghostActive} size={56} />
            <div className="flex-1">
              <p className="text-[13px] text-[var(--text-primary)] font-medium">
                {ghostActive ? "Ghost mode active" : "Ghost mode inactive"}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {ghostActive
                  ? "AI agent is monitoring and protecting your wallets"
                  : "Enable to start autonomous privacy management"}
              </p>
            </div>
            <button
              onClick={() => {
                setGhostActive(!ghostActive);
                setGoDarkComplete(false);
              }}
              className={`shrink-0 w-10 rounded-full transition-colors ${
                ghostActive ? "bg-[#6366f1]" : "bg-[var(--border)]"
              }`}
              style={{ height: "22px" }}
            >
              <div
                className={`w-[18px] h-[18px] bg-white rounded-full transition-transform mx-0.5 ${
                  ghostActive ? "translate-x-[18px]" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {ghostActive && (
          <div className="space-y-5" style={{ animation: "slideInUp 0.35s ease-out" }}>
            {/* ── AI status ─────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
                  AI agent status
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-[0.08em]">
                    Online
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <StatCard label="Monitoring" primary="3" secondary="wallets" />
                <StatCard label="Last action" primary="0.5 ETH" secondary="mixed · 2m" />
                <StatCard
                  label="Threat level"
                  primary="LOW"
                  secondary="all clear"
                  tone="emerald"
                />
              </div>

              {/* Terminal log */}
              <div className="bg-[var(--bg)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border-subtle)]">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-mixer-red/60" />
                    <span className="w-2 h-2 rounded-full bg-amber-400/60" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono ml-1">
                    ghost-agent.log
                  </span>
                </div>
                <div
                  ref={logRef}
                  className="h-36 overflow-y-auto p-3 font-mono text-[11px] space-y-0.5"
                >
                  {logs.map((entry, i) => (
                    <div
                      key={i}
                      className="flex gap-2 text-[var(--text-secondary)]"
                      style={{ animation: "slideInUp 0.25s ease-out" }}
                    >
                      <span className="text-[var(--text-muted)] shrink-0 tabular-nums">
                        [{entry.time}]
                      </span>
                      <span className="text-[#a5b4fc]">{entry.message}</span>
                    </div>
                  ))}
                  <span
                    className="inline-block w-1.5 h-3 bg-[#818cf8] ml-1 align-middle"
                    style={{ animation: "ghostCursor 1s step-end infinite" }}
                  />
                </div>
              </div>
            </div>

            {/* ── Wallet monitor ────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
                  Wallet monitor
                </p>
                <button className="text-[11px] text-[#818cf8] hover:text-[#a5b4fc] transition">
                  + Add wallet
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {WALLETS.map((w) => (
                  <div
                    key={w.id}
                    className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[var(--text-primary)] font-medium">
                        {w.name}
                      </span>
                      <span
                        className={`text-[9px] uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full ${
                          w.status === "protected"
                            ? "bg-emerald-400/10 text-emerald-400"
                            : "bg-amber-400/10 text-amber-400"
                        }`}
                      >
                        {w.status === "protected" ? "protected" : "action"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
                      {w.address}
                    </p>
                    <div className="flex gap-1">
                      {w.chains.map((c) => (
                        <span
                          key={c}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                    <p className="text-[13px] text-[var(--text-primary)] font-semibold tabular-nums">
                      {w.balance}
                    </p>
                    <div>
                      <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">
                        Exposure
                      </p>
                      <MiniGauge
                        score={
                          goDarkComplete ? Math.max(5, w.exposureScore - 50) : w.exposureScore
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Exposure analysis ─────────────── */}
            <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4">
              <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">
                Exposure analysis
              </p>
              <div className="flex items-center justify-center gap-6">
                <ExposureGauge score={exposureBefore} label="Before" />
                <div className="flex flex-col items-center gap-1 pt-4">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-[#818cf8]"
                  >
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {goDarkComplete && (
                    <span className="text-[11px] text-emerald-400 font-semibold tabular-nums">
                      -84%
                    </span>
                  )}
                </div>
                <ExposureGauge score={exposureAfter} label="With ghost" />
              </div>
              {goDarkComplete && (
                <p
                  className="text-center text-[11px] text-emerald-400 mt-3 font-medium"
                  style={{ animation: "fadeScaleIn 0.4s ease-out" }}
                >
                  Ghost mode reduced your exposure by 84%
                </p>
              )}
            </div>

            {/* ── Auto-actions ──────────────────── */}
            <div>
              <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
                Auto-actions
              </p>
              <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
                {/* auto-mix threshold */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] text-[var(--text-primary)] font-medium">
                        Auto-mix when anonymity set &lt;{" "}
                        <span className="text-[#818cf8] tabular-nums">
                          {autoMixThreshold.toLocaleString()}
                        </span>
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Mix funds when your anonymity set drops below this threshold
                      </p>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={10000}
                    step={100}
                    value={autoMixThreshold}
                    onChange={(e) => setAutoMixThreshold(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-[var(--border)] cursor-pointer accent-[#6366f1]"
                  />
                </div>

                {/* auto-decoys */}
                <Row
                  title="Auto-generate decoys"
                  desc="Create fake transactions to confuse on-chain analysis"
                >
                  <div className="flex items-center gap-2">
                    {autoDecoys && (
                      <select
                        value={decoyFrequency}
                        onChange={(e) => setDecoyFrequency(e.target.value)}
                        className="bg-[var(--bg)] text-[11px] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-2 py-1 outline-none focus:border-[#6366f1]/60"
                      >
                        <option value="1h">Every 1h</option>
                        <option value="6h">Every 6h</option>
                        <option value="12h">Every 12h</option>
                        <option value="24h">Every 24h</option>
                      </select>
                    )}
                    <Toggle checked={autoDecoys} onChange={setAutoDecoys} />
                  </div>
                </Row>

                <Row
                  title="Auto-rotate addresses"
                  desc="Periodically generate new receiving addresses to prevent linking"
                >
                  <Toggle checked={autoRotate} onChange={setAutoRotate} />
                </Row>

                <Row
                  title="Warn before risky transactions"
                  desc="Alert you when a transaction could compromise your privacy"
                >
                  <Toggle checked={warnRisky} onChange={setWarnRisky} />
                </Row>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] text-[var(--text-primary)] font-medium">
                        Max gas budget{" "}
                        <span className="text-[#818cf8] tabular-nums">${maxGasBudget}/day</span>
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Daily spending cap for automated privacy operations
                      </p>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={1}
                    value={maxGasBudget}
                    onChange={(e) => setMaxGasBudget(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-[var(--border)] cursor-pointer accent-[#6366f1]"
                  />
                </div>
              </div>
            </div>

            {/* ── Go Dark button ────────────────── */}
            <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4">
              <button
                onClick={() => {
                  setGoDarkActive(true);
                  setGoDarkComplete(false);
                }}
                disabled={goDarkComplete}
                className={`btn-primary w-full py-3 text-[13px] font-semibold tracking-wide ${
                  goDarkComplete ? "opacity-60 cursor-default" : ""
                }`}
              >
                {goDarkComplete
                  ? "All wallets shielded"
                  : "Go dark — shield everything now"}
              </button>
              {goDarkComplete && (
                <p className="text-[11px] text-[var(--text-muted)] mt-2 text-center">
                  Ghost mode is actively maintaining your privacy.
                </p>
              )}
            </div>

            {/* ── AI Recommendations ────────────── */}
            <div>
              <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
                Recommendations
              </p>
              <div className="space-y-1.5">
                {recommendations
                  .filter((r) => !r.dismissed)
                  .map((rec, i) => (
                    <div
                      key={rec.id}
                      className="flex items-start gap-3 bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5"
                      style={{ animation: `slideInUp 0.3s ${i * 0.08}s ease-out both` }}
                    >
                      <RecDot tone={rec.tone} />
                      <p className="flex-1 text-[12px] text-[var(--text-primary)] leading-relaxed">
                        {rec.text}
                      </p>
                      <button
                        onClick={() => dismissRec(rec.id)}
                        className={`shrink-0 px-3 py-1 text-[11px] font-semibold rounded-md transition ${
                          rec.actionLabel === "Dismiss"
                            ? "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            : rec.actionLabel === "Enable"
                              ? "bg-[#6366f1]/15 text-[#818cf8] hover:bg-[#6366f1]/25 border border-[#6366f1]/30"
                              : "bg-[#6366f1] text-white hover:bg-[#5558e3]"
                        }`}
                      >
                        {rec.actionLabel}
                      </button>
                    </div>
                  ))}
                {recommendations.every((r) => r.dismissed) && (
                  <p className="text-center text-[12px] text-[var(--text-muted)] py-4">
                    All recommendations addressed
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── subcomponents ─── */
function StatCard({
  label,
  primary,
  secondary,
  tone = "neutral",
}: {
  label: string;
  primary: string;
  secondary: string;
  tone?: "neutral" | "emerald";
}) {
  const pClass =
    tone === "emerald" ? "text-emerald-400" : "text-[var(--text-primary)]";
  return (
    <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3">
      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">
        {label}
      </p>
      <p className={`text-[14px] font-semibold tabular-nums ${pClass}`}>{primary}</p>
      <p className="text-[10px] text-[var(--text-muted)] mt-0.5 tabular-nums">{secondary}</p>
    </div>
  );
}

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[var(--text-primary)] font-medium">{title}</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`shrink-0 w-10 rounded-full transition-colors ${
        checked ? "bg-[#6366f1]" : "bg-[var(--border)]"
      }`}
      style={{ height: "22px" }}
    >
      <div
        className={`w-[18px] h-[18px] bg-white rounded-full transition-transform mx-0.5 ${
          checked ? "translate-x-[18px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function RecDot({ tone }: { tone: Recommendation["tone"] }) {
  const cls =
    tone === "warn"
      ? "bg-amber-400"
      : tone === "ok"
        ? "bg-emerald-400"
        : "bg-[#818cf8]";
  return (
    <span
      className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${cls}`}
      aria-hidden
    />
  );
}
