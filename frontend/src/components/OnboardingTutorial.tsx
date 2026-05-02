"use client";

import { useState, useEffect, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Step data                                                          */
/* ------------------------------------------------------------------ */

interface Step {
  title: string;
  subtitle: string;
  body?: string;
}

const STEPS: Step[] = [
  {
    title: "Welcome to Cashinviz",
    subtitle:
      "A non-custodial mixer for ETH and ERC-20s, secured by zero-knowledge proofs. This walkthrough takes about a minute.",
  },
  {
    title: "First, connect your wallet",
    subtitle:
      "We support 50+ wallets across 15 blockchains. Your wallet address is only used to create deposits \u2014 it\u2019s never stored.",
  },
  {
    title: "Deposit into the shielded pool",
    subtitle:
      "Choose your token and amount. A cryptographic commitment is created \u2014 think of it as a secret receipt that only you have.",
  },
  {
    title: "\u26A0\uFE0F Save your deposit note!",
    subtitle:
      "This encrypted note is your ONLY way to withdraw. We never store it. Back it up safely \u2014 if you lose it, your funds are gone forever.",
  },
  {
    title: "Pick your mixing strategy",
    subtitle: "Choose how your funds are anonymised before withdrawal.",
  },
  {
    title: "Withdraw to any address",
    subtitle:
      "Paste your note, enter a fresh address, and the ZK proof breaks all links between your deposit and withdrawal. No one \u2014 not even us \u2014 can trace it.",
  },
  {
    title: "You\u2019re all set!",
    subtitle:
      "You now know everything you need. Start with a small deposit to try it out.",
  },
];

/* ------------------------------------------------------------------ */
/*  Illustrations (SVG / CSS)                                          */
/* ------------------------------------------------------------------ */

function ShieldIcon() {
  return (
    <div className="relative flex items-center justify-center w-40 h-40 mx-auto">
      {/* Pulsing glow */}
      <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
      <svg
        viewBox="0 0 64 64"
        className="relative w-28 h-28 drop-shadow-[0_0_24px_rgba(0,255,128,0.4)] animate-[float_3s_ease-in-out_infinite]"
      >
        <defs>
          <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00ff88" />
            <stop offset="100%" stopColor="#00aa55" />
          </linearGradient>
        </defs>
        <path
          d="M32 4 L56 16 V34 C56 48 44 58 32 62 C20 58 8 48 8 34 V16 Z"
          fill="url(#shieldGrad)"
          fillOpacity="0.15"
          stroke="url(#shieldGrad)"
          strokeWidth="2"
        />
        {/* Lock body */}
        <rect
          x="22"
          y="30"
          width="20"
          height="16"
          rx="3"
          fill="url(#shieldGrad)"
          fillOpacity="0.7"
        />
        {/* Lock shackle */}
        <path
          d="M26 30 V24 A6 6 0 0 1 38 24 V30"
          fill="none"
          stroke="#00ff88"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Keyhole */}
        <circle cx="32" cy="38" r="2.5" fill="#0a0f0a" />
        <rect x="31" y="39" width="2" height="4" rx="1" fill="#0a0f0a" />
      </svg>
    </div>
  );
}

function WalletVisual() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Wallet icon */}
        <div className="w-48 h-28 rounded-xl bg-gradient-to-br from-emerald-400/20 to-[#6366f1]/30 border border-emerald-400/40 flex items-center justify-center gap-3 animate-[float_3s_ease-in-out_infinite]">
          <svg viewBox="0 0 40 40" className="w-10 h-10">
            <rect
              x="4"
              y="10"
              width="32"
              height="22"
              rx="4"
              fill="none"
              stroke="#00ff88"
              strokeWidth="2"
            />
            <rect
              x="24"
              y="17"
              width="12"
              height="8"
              rx="2"
              fill="#00ff88"
              fillOpacity="0.3"
              stroke="#00ff88"
              strokeWidth="1.5"
            />
            <circle cx="30" cy="21" r="1.5" fill="#00ff88" />
          </svg>
          <span className="text-emerald-400 font-semibold text-sm tracking-wide">
            Connect Wallet
          </span>
        </div>
        {/* Animated dots */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              style={{
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
      {/* Mock supported chains */}
      <div className="flex gap-2 mt-2">
        {["ETH", "SOL", "BTC", "MATIC", "AVAX"].map((c) => (
          <span
            key={c}
            className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-emerald-400/60"
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function DepositFlowVisual() {
  return (
    <div className="flex items-center justify-center gap-3">
      {[
        { label: "Token", icon: "ETH" },
        { label: "Amount", icon: "1.0" },
        { label: "Note", icon: "#" },
      ].map((item, i) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-16 h-16 rounded-xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold text-lg animate-[float_3s_ease-in-out_infinite]"
              style={{ animationDelay: `${i * 0.3}s` }}
            >
              {item.icon}
            </div>
            <span className="text-xs text-emerald-400/60">{item.label}</span>
          </div>
          {i < 2 && (
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-400/40">
              <path
                d="M5 12h14m-6-6 6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

function NoteWarningVisual() {
  const mockNote =
    "0x7f3a...c9d2-mixer-note-4b8e1...a03f-secret-withdrawal-key";
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-xs">
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/50 animate-[pulse_2s_ease-in-out_infinite]">
          <p className="text-yellow-400/90 font-mono text-[11px] break-all leading-relaxed text-center select-none">
            {mockNote}
          </p>
        </div>
        {/* Warning badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
          SAVE THIS
        </div>
      </div>
      <div className="flex gap-2">
        {["Copy", "Download", "Print"].map((a) => (
          <span
            key={a}
            className="text-[10px] px-3 py-1 rounded border border-[var(--border)] text-emerald-400/60 bg-[var(--card)]/50"
          >
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}

const MODES = [
  { name: "Standard", desc: "Fast, fixed pools", color: "#00ff88" },
  { name: "CoinJoin", desc: "Collaborative mixing", color: "#00ccff" },
  { name: "Monero Route", desc: "Double-layer privacy", color: "#ff8800" },
  { name: "Complete", desc: "Maximum anonymity", color: "#cc44ff" },
] as const;

function MixingModesVisual() {
  return (
    <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs mx-auto">
      {MODES.map((m, i) => (
        <div
          key={m.name}
          className="p-3 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-opacity-80 transition-all animate-[float_3s_ease-in-out_infinite]"
          style={{
            animationDelay: `${i * 0.15}s`,
            borderColor: `${m.color}33`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full mb-1.5"
            style={{ background: m.color }}
          />
          <p className="text-xs font-semibold text-white">{m.name}</p>
          <p className="text-[10px] text-white/50 mt-0.5">{m.desc}</p>
        </div>
      ))}
    </div>
  );
}

function LinkBreakVisual() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        {/* Deposit address */}
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[11px]">
          0xA3f...
        </div>
        {/* Breaking link animation */}
        <div className="relative w-16 flex items-center justify-center">
          <svg viewBox="0 0 64 24" className="w-full h-6">
            {/* Left chain half */}
            <g className="animate-[slideLeft_2s_ease-in-out_infinite]">
              <path
                d="M4 12 H22"
                stroke="#ff4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="4 3"
              />
              <circle cx="22" cy="12" r="3" fill="#ff4444" fillOpacity="0.4" stroke="#ff4444" strokeWidth="1" />
            </g>
            {/* Break flash */}
            <circle cx="32" cy="12" r="2" fill="#00ff88" className="animate-ping" />
            {/* Right chain half */}
            <g className="animate-[slideRight_2s_ease-in-out_infinite]">
              <path
                d="M42 12 H60"
                stroke="#00ff88"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="4 3"
              />
              <circle cx="42" cy="12" r="3" fill="#00ff88" fillOpacity="0.4" stroke="#00ff88" strokeWidth="1" />
            </g>
          </svg>
        </div>
        {/* Withdraw address */}
        <div className="px-3 py-2 rounded-lg bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 font-mono text-[11px]">
          0xNew...
        </div>
      </div>
      <p className="text-emerald-400/50 text-[10px] tracking-widest uppercase">
        Zero-knowledge proof verified
      </p>
    </div>
  );
}

function ReadyVisual({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5">
      {/* Checkmark */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
        <div className="relative w-full h-full rounded-full bg-emerald-400/10 border-2 border-emerald-400 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-emerald-400">
            <path
              d="M5 13l4 4L19 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      {/* Stats */}
      <div className="flex gap-4 text-center">
        {[
          { val: "15", label: "chains" },
          { val: "4", label: "mixing modes" },
          { val: "$47M", label: "TVL" },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-emerald-400 font-bold text-lg">{s.val}</p>
            <p className="text-white/40 text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>
      {/* Launch button */}
      <button
        onClick={onLaunch}
        className="mt-1 px-8 py-2.5 rounded-lg bg-emerald-400 text-black font-bold text-sm tracking-wide hover:brightness-110 transition-all active:scale-95"
      >
        Launch App
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Keyframe injection (runs once)                                     */
/* ------------------------------------------------------------------ */

const KEYFRAMES = `
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes slideLeft {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-6px); }
}
@keyframes slideRight {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(6px); }
}
`;

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingTutorial({ isOpen, onClose }: OnboardingTutorialProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);

  // Inject keyframes once
  useEffect(() => {
    const id = "onboarding-keyframes";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = KEYFRAMES;
    document.head.appendChild(style);
  }, []);

  // Reset step when reopened
  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const go = useCallback(
    (dir: "next" | "prev") => {
      if (animating) return;
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setStep((s) => s + (dir === "next" ? 1 : -1));
        setAnimating(false);
      }, 250);
    },
    [animating],
  );

  if (!isOpen) return null;

  const progress = ((step + 1) / STEPS.length) * 100;
  const current = STEPS[step];

  /* ---------- illustration per step ---------- */
  const illustrations: Record<number, React.ReactNode> = {
    0: <ShieldIcon />,
    1: <WalletVisual />,
    2: <DepositFlowVisual />,
    3: <NoteWarningVisual />,
    4: <MixingModesVisual />,
    5: <LinkBreakVisual />,
    6: <ReadyVisual onLaunch={onClose} />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[var(--border)]/30">
        <div
          className="h-full bg-emerald-400 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Skip */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/40 hover:text-[var(--text-primary)]/70 text-xs tracking-wide transition-colors"
      >
        Skip Tutorial
      </button>

      {/* Card */}
      <div className="relative w-full max-w-md mx-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl overflow-hidden">
        {/* Step content — animated */}
        <div
          className="transition-all duration-300 ease-out"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateX(${direction === "next" ? "-24px" : "24px"})`
              : "translateX(0)",
          }}
        >
          {/* Step label */}
          <p className="text-emerald-400/50 text-[11px] font-medium tracking-widest uppercase mb-4 text-center">
            Step {step + 1} of {STEPS.length}
          </p>

          {/* Illustration */}
          <div className="mb-6 flex justify-center min-h-[120px] items-center">
            {illustrations[step]}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white text-center mb-2 leading-tight">
            {current.title}
          </h2>

          {/* Subtitle */}
          <p className="text-sm text-white/60 text-center leading-relaxed max-w-sm mx-auto">
            {current.subtitle}
          </p>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => go("prev")}
            disabled={step === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-[var(--text-primary)]/80 disabled:opacity-0 disabled:pointer-events-none transition-all"
          >
            Back
          </button>

          {/* Dots */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? "bg-emerald-400 scale-110"
                    : "bg-[var(--border)] hover:bg-[var(--border)]/80"
                }`}
              />
            ))}
          </div>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => go("next")}
              className="px-5 py-2 rounded-lg bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-400/20 transition-all active:scale-95"
            >
              Next
            </button>
          ) : (
            <div className="w-[72px]" /> /* spacer to keep dots centered */
          )}
        </div>
      </div>
    </div>
  );
}
