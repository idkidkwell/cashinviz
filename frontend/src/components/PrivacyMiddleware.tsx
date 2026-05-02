"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface DAppProtocol {
  name: string;
  letter: string;
  color: string;
  category: "DEX" | "Lending" | "NFT" | "Derivatives";
  status: "Active" | "Beta" | "Coming Soon";
  enabled: boolean;
}

interface FeedEntry {
  id: number;
  type: "privatized" | "blocked" | "warning";
  message: string;
  timestamp: string;
}

type PipelineStepKind = "Mix" | "Swap" | "Lend" | "Bridge" | "Send" | "NFT Buy";

interface PipelineStep {
  id: number;
  kind: PipelineStepKind;
  label: string;
}

const INITIAL_DAPPS: DAppProtocol[] = [
  { name: "Uniswap", letter: "U", color: "#FF007A", category: "DEX", status: "Active", enabled: true },
  { name: "Aave", letter: "A", color: "#B6509E", category: "Lending", status: "Active", enabled: true },
  { name: "Compound", letter: "C", color: "#00D395", category: "Lending", status: "Active", enabled: true },
  { name: "MakerDAO", letter: "M", color: "#1AAB9B", category: "Lending", status: "Active", enabled: true },
  { name: "Lido", letter: "L", color: "#00A3FF", category: "Lending", status: "Beta", enabled: true },
  { name: "Curve", letter: "C", color: "#FF0000", category: "DEX", status: "Active", enabled: true },
  { name: "OpenSea", letter: "O", color: "#2081E2", category: "NFT", status: "Active", enabled: true },
  { name: "Blur", letter: "B", color: "#FF6B00", category: "NFT", status: "Beta", enabled: true },
  { name: "1inch", letter: "1", color: "#94A6C3", category: "DEX", status: "Active", enabled: true },
  { name: "GMX", letter: "G", color: "#2D42FC", category: "Derivatives", status: "Beta", enabled: false },
  { name: "dYdX", letter: "d", color: "#6966FF", category: "Derivatives", status: "Coming Soon", enabled: false },
  { name: "Balancer", letter: "B", color: "#1E1E1E", category: "DEX", status: "Coming Soon", enabled: false },
];

const FEED_TEMPLATES: Omit<FeedEntry, "id" | "timestamp">[] = [
  { type: "privatized", message: "[Privatized] Uniswap V3: Swap 2.4 ETH → 4,200 USDC — routed through mixer" },
  { type: "privatized", message: "[Privatized] Aave V3: Deposit 1,000 USDC — shielded via stealth address" },
  { type: "privatized", message: "[Privatized] OpenSea: Purchase Pudgy Penguin #4821 — anonymous buyer" },
  { type: "blocked", message: "[Blocked] Suspicious approval request from 0x8f2a… — potential phishing" },
  { type: "privatized", message: "[Privatized] Curve: Add liquidity 5,000 USDT/USDC — stealth deposit" },
  { type: "warning", message: "[Warning] 1inch: Route contains non-private hop via 0xdead… — re-routing" },
  { type: "privatized", message: "[Privatized] Compound: Borrow 2,500 DAI — shielded collateral" },
  { type: "privatized", message: "[Privatized] Lido: Stake 10 ETH — anonymous staker address" },
  { type: "blocked", message: "[Blocked] Unlimited token approval to unverified contract 0x3bc1…" },
  { type: "privatized", message: "[Privatized] MakerDAO: Open vault #18472 — shielded via relay" },
  { type: "warning", message: "[Warning] Blur: Bid metadata may leak wallet identity — masking applied" },
  { type: "privatized", message: "[Privatized] Uniswap V3: Swap 0.5 WBTC → 8.1 ETH — routed through mixer" },
];

const STEP_DEFAULTS: Record<PipelineStepKind, string> = {
  Mix: "Mix ETH",
  Swap: "Swap on Uniswap",
  Lend: "Deposit on Aave",
  Bridge: "Bridge to Arbitrum",
  Send: "Send to Wallet B",
  "NFT Buy": "Buy NFT on OpenSea",
};

function timeString(): string {
  const d = new Date();
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function statusBadgeClasses(status: DAppProtocol["status"]): string {
  switch (status) {
    case "Active":
      return "bg-emerald-400/10 text-emerald-400 border border-emerald-400/25";
    case "Beta":
      return "bg-amber-400/10 text-amber-400 border border-amber-400/25";
    case "Coming Soon":
      return "bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)]";
  }
}

function feedColor(type: FeedEntry["type"]): string {
  switch (type) {
    case "privatized":
      return "text-emerald-400";
    case "blocked":
      return "text-mixer-red";
    case "warning":
      return "text-amber-400";
  }
}

export function PrivacyMiddleware() {
  const [dapps, setDapps] = useState<DAppProtocol[]>(INITIAL_DAPPS);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStep[]>([
    { id: 1, kind: "Mix", label: "Mix ETH" },
    { id: 2, kind: "Swap", label: "Swap on Uniswap" },
    { id: 3, kind: "Lend", label: "Deposit on Aave" },
    { id: 4, kind: "Send", label: "Send to Wallet B" },
  ]);
  const [pipelineNextId, setPipelineNextId] = useState(5);
  const [activeStep, setActiveStep] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const feedIndexRef = useRef(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setActiveStep((s) => (s + 1) % 3);
    }, 2500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      const template = FEED_TEMPLATES[feedIndexRef.current % FEED_TEMPLATES.length];
      feedIndexRef.current++;
      const entry: FeedEntry = {
        id: Date.now(),
        type: template.type,
        message: template.message,
        timestamp: timeString(),
      };
      setFeed((prev) => [...prev.slice(-50), entry]);
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [feed]);

  const toggleDapp = useCallback((index: number) => {
    setDapps((prev) => prev.map((d, i) => (i === index ? { ...d, enabled: !d.enabled } : d)));
  }, []);

  const addPipelineStep = useCallback(
    (kind: PipelineStepKind) => {
      setPipeline((prev) => [...prev, { id: pipelineNextId, kind, label: STEP_DEFAULTS[kind] }]);
      setPipelineNextId((n) => n + 1);
    },
    [pipelineNextId]
  );

  const removePipelineStep = useCallback((id: number) => {
    setPipeline((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const steps = [
    { title: "Install extension", detail: "One-click browser add-on" },
    { title: "Visit any dApp", detail: "Uniswap, Aave, OpenSea…" },
    { title: "Every tx is private", detail: "Shielded + stealth routing" },
  ];

  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        An invisible layer that makes every transaction private. No dApp changes — install
        the extension and every interaction routes through the mixer.
      </p>

      {/* ── How it works ─────────────────────────────── */}
      <div className="mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">
          How it works
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className={`bg-[var(--card)] border rounded-xl p-3.5 transition-all duration-500 ${
                activeStep === i
                  ? "border-[#6366f1]/50 bg-[#6366f1]/5"
                  : "border-[var(--border-subtle)]"
              }`}
            >
              <p className="text-[10px] font-mono text-[var(--text-muted)] tabular-nums mb-1">
                0{i + 1}
              </p>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">{s.title}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Supported dApps ──────────────────────────── */}
      <div className="mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">
          Supported dApps
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {dapps.map((dapp, i) => (
            <div
              key={dapp.name}
              className={`bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3 flex flex-col gap-2 transition-opacity ${
                dapp.enabled ? "opacity-100" : "opacity-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-[12px] shrink-0"
                  style={{ backgroundColor: dapp.color }}
                >
                  {dapp.letter}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                    {dapp.name}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">{dapp.category}</p>
                </div>
                <span className={`text-[9px] uppercase tracking-[0.04em] px-1.5 py-0.5 rounded-full whitespace-nowrap ${statusBadgeClasses(dapp.status)}`}>
                  {dapp.status}
                </span>
              </div>
              <button
                onClick={() => toggleDapp(i)}
                disabled={dapp.status === "Coming Soon"}
                className={`w-full text-[11px] font-medium py-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  dapp.enabled
                    ? "bg-emerald-400/10 border-emerald-400/25 text-emerald-400 hover:bg-emerald-400/15"
                    : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-[#6366f1]/30"
                }`}
              >
                {dapp.enabled ? "Privacy on" : "Privacy off"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Live feed ────────────────────────────────── */}
      <div className="mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">
          Live feed
        </p>
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg)]">
            <span className="w-1.5 h-1.5 rounded-full bg-mixer-red" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-[var(--text-muted)] ml-1.5 font-mono">
              privacy-middleware · live
            </span>
          </div>
          <div
            ref={feedRef}
            className="h-56 overflow-y-auto p-3 font-mono text-[11px] space-y-1 scrollbar-thin scrollbar-thumb-[var(--border)]"
          >
            {feed.length === 0 && (
              <p className="text-[var(--text-muted)] animate-pulse">Waiting for transactions…</p>
            )}
            {feed.map((entry) => (
              <div key={entry.id} className={`${feedColor(entry.type)} animate-[fadeIn_0.4s_ease-out]`}>
                <span className="text-[var(--text-muted)] mr-2 tabular-nums">{entry.timestamp}</span>
                {entry.message}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Meta-tx builder ─────────────────────────── */}
      <div className="mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">
          Meta-transaction builder
        </p>
        <p className="text-[12px] text-[var(--text-muted)] mb-3 leading-relaxed">
          Chain multiple private operations into one atomic meta-transaction.
        </p>

        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3 mb-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {pipeline.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-1.5">
                {idx > 0 && (
                  <span className="text-[var(--text-muted)] text-[11px] select-none">→</span>
                )}
                <div className="bg-[#6366f1]/10 border border-[#6366f1]/30 rounded-lg px-3 py-2 relative group shrink-0">
                  <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.06em]">
                    {step.kind}
                  </p>
                  <p className="text-[12px] font-medium text-[var(--text-primary)] whitespace-nowrap">
                    {step.label}
                  </p>
                  <button
                    onClick={() => removePipelineStep(step.id)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-mixer-red/80 text-white text-[10px] items-center justify-center hidden group-hover:flex hover:bg-mixer-red"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className="text-[11px] text-[var(--text-muted)] mr-1">Add:</span>
          {(["Mix", "Swap", "Lend", "Bridge", "Send", "NFT Buy"] as PipelineStepKind[]).map((kind) => (
            <button
              key={kind}
              onClick={() => addPipelineStep(kind)}
              className="px-2.5 py-1 text-[11px] rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[#6366f1]/40 hover:text-[#6366f1] transition-colors"
            >
              + {kind}
            </button>
          ))}
        </div>

        <button className="btn-primary w-full py-2.5 text-[13px] font-semibold">
          Execute private pipeline
        </button>
        <p className="text-[11px] text-[var(--text-muted)] mt-2 text-center">
          All steps execute atomically in one private meta-transaction.
        </p>
      </div>

      {/* ── Developer SDK ────────────────────────────── */}
      <div className="mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">
          Developer SDK
        </p>
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3">
          <p className="text-[12px] text-[var(--text-secondary)]">
            Add &ldquo;Private Mode&rdquo; to your dApp in one line:
          </p>
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 font-mono text-[11px] overflow-x-auto">
            <p className="text-[#818cf8] whitespace-nowrap">
              &lt;script src=&quot;https://cashinviz.com/sdk.js&quot;&gt;&lt;/script&gt;
            </p>
          </div>
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 font-mono text-[11px] overflow-x-auto">
            <p className="text-[#818cf8] whitespace-nowrap">
              {"Cashinviz.enablePrivateMode({ appId: \"your-app-id\" })"}
            </p>
          </div>
          <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-lg p-3 flex items-start gap-2">
            <span className="text-emerald-400 text-[14px] leading-none mt-0.5">$</span>
            <div>
              <p className="text-[12px] text-[var(--text-primary)] font-medium">Revenue share</p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Earn 0.1% on every privatized transaction through your dApp.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        {[
          { label: "Privatized", value: "847,291" },
          { label: "dApps", value: "12" },
          { label: "Value shielded", value: "$142M" },
          { label: "Phishing blocked", value: "1,247" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3 text-center"
          >
            <p className="text-[18px] font-semibold text-[var(--text-primary)] tabular-nums">
              {stat.value}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 uppercase tracking-[0.06em]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── CTA ──────────────────────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 text-center">
        <button className="btn-primary px-6 py-2.5 text-[13px] font-semibold mb-3">
          Get Privacy Middleware
        </button>
        <div className="flex items-center justify-center gap-4 text-[11px] text-[var(--text-muted)]">
          <span>Chrome</span>
          <span className="text-[var(--border)]">·</span>
          <span>Firefox</span>
          <span className="text-[var(--border)]">·</span>
          <span>Brave</span>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-2">Free forever. Open source.</p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
