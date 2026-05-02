"use client";

import { useState } from "react";

interface MixingMode {
  id: string;
  name: string;
  privacy: string;
  privacyLevel: number; // 1-4
  time: string;
  fee: string;
  description: string;
  features: string[];
}

const MIXING_MODES: MixingMode[] = [
  {
    id: "standard",
    name: "Standard",
    privacy: "Good",
    privacyLevel: 1,
    time: "Instant – 1 hour",
    fee: "1%",
    description: "Fixed denomination pools with strong anonymity sets. Best for most users.",
    features: ["Fixed denominations", "Instant withdrawal available", "Large anonymity set"],
  },
  {
    id: "coinjoin",
    name: "CoinJoin",
    privacy: "High",
    privacyLevel: 2,
    time: "5 – 30 minutes",
    fee: "1.5%",
    description: "Collaborative mixing — your transaction is combined with other users into a single on-chain tx. Like Wasabi Wallet but for EVM.",
    features: ["Multiple users per tx", "No single coordinator", "Breaks tx graph linkage"],
  },
  {
    id: "monero",
    name: "Monero Route",
    privacy: "Very High",
    privacyLevel: 3,
    time: "30 – 60 minutes",
    fee: "2.5%",
    description: "Funds are converted to XMR via atomic swap, mixed through Monero's native ring signatures, then converted back. Double privacy layer.",
    features: ["Ring signatures + ZK proofs", "Unlinkable transactions", "Cross-chain obfuscation"],
  },
  {
    id: "complete",
    name: "Complete Anonymity",
    privacy: "Maximum",
    privacyLevel: 4,
    time: "1 – 10 hours",
    fee: "3–5%",
    description: "Everything at once: Monero route + CoinJoin + time delay + multi-path + decoy transactions + Tor routing. Like Mixer.money's complete mode but 10x stronger.",
    features: [
      "Monero privacy route",
      "Multi-path split (2-10 addresses)",
      "Random time delays",
      "AI decoy transactions",
      "Tor-routed submission",
      "Exchange liquidity sourcing",
    ],
  },
];

interface Props {
  /** When provided, the component is fully controlled. `null` means no selection. */
  selected?: string | null;
  /** Initial selection for uncontrolled mode. Defaults to "standard". */
  defaultSelected?: string | null;
  onSelect?: (mode: MixingMode) => void;
  /** Fired when the user clicks "Change" to clear the selection. */
  onClear?: () => void;
  /** When true, after a mode is picked the card collapses into a compact pill with a "Change" link. */
  collapseOnSelect?: boolean;
  /** Label shown above the mode grid when nothing is selected. */
  title?: string;
  /** Step number badge (for multi-step flows). */
  step?: number;
}

export function MixingModeSelector({
  selected: controlledSelected,
  defaultSelected = "standard",
  onSelect,
  onClear,
  collapseOnSelect = false,
  title,
  step,
}: Props) {
  const isControlled = controlledSelected !== undefined;
  const [internalSelected, setInternalSelected] = useState<string | null>(defaultSelected);
  const selected = isControlled ? controlledSelected : internalSelected;

  function handleSelect(mode: MixingMode) {
    if (!isControlled) setInternalSelected(mode.id);
    onSelect?.(mode);
  }

  function handleClear() {
    if (!isControlled) setInternalSelected(null);
    onClear?.();
  }

  const current = selected ? MIXING_MODES.find((m) => m.id === selected) : null;

  // ─── Collapsed view ───────────────────────────────────────────────
  if (collapseOnSelect && current) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {step !== undefined && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#6366f1] text-white text-[10px] font-semibold">
                &#10003;
              </span>
            )}
            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
              {title ?? "Mixing mode"}
            </p>
          </div>
          <button
            onClick={handleClear}
            className="text-[11px] text-[#6366f1] hover:underline"
          >
            Change
          </button>
        </div>
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/30">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[13px] font-semibold text-[#6366f1] shrink-0">{current.name}</span>
            <span className="text-[11px] text-[var(--text-secondary)] truncate">{current.description}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{current.time}</span>
            <span className="w-px h-3 bg-[var(--border)]" />
            <span className={`text-[10px] font-medium ${
              current.privacyLevel >= 4 ? "text-emerald-400" :
              current.privacyLevel >= 3 ? "text-purple-400" :
              current.privacyLevel >= 2 ? "text-[#6366f1]" :
              "text-[var(--text-secondary)]"
            }`}>{current.privacy}</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Expanded picker view ─────────────────────────────────────────
  return (
    <div className="space-y-4">
      {(title || step !== undefined) && (
        <div className="flex items-center gap-2">
          {step !== undefined && (
            <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold ${
              current ? "bg-[#6366f1] text-white" : "bg-[#6366f1]/10 text-[#6366f1]"
            }`}>
              {current ? "\u2713" : step}
            </span>
          )}
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
            {title ?? (current ? "Mixing mode" : "Choose mixing mode")}
          </p>
        </div>
      )}

      {/* Mode cards */}
      <div className="grid grid-cols-2 gap-2">
        {MIXING_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleSelect(mode)}
            className={`text-left p-3 rounded-lg transition-all ${
              selected === mode.id
                ? "bg-[#6366f1]/10 border border-[#6366f1]/40"
                : "bg-[var(--bg)] border border-[var(--border)] hover:border-[#6366f1]/20"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-semibold ${
                selected === mode.id ? "text-[#6366f1]" : "text-white"
              }`}>
                {mode.name}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                mode.privacyLevel >= 4 ? "bg-emerald-400/10 text-emerald-400" :
                mode.privacyLevel >= 3 ? "bg-purple-500/10 text-purple-400" :
                mode.privacyLevel >= 2 ? "bg-[#6366f1]/10 text-[#6366f1]" :
                "bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]"
              }`}>
                {mode.privacy}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">{mode.time}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Fee: {mode.fee}</p>
          </button>
        ))}
      </div>

      {/* Selected mode details — only in non-collapsing mode */}
      {current && !collapseOnSelect && (
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-4 animate-fade-in" key={selected}>
          <p className="text-sm text-white font-medium mb-1">{current.name} Mode</p>
          <p className="text-xs text-[var(--text-secondary)] mb-3">{current.description}</p>

          {/* Privacy meter */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[var(--text-secondary)]">Privacy Level</span>
              <span className={
                current.privacyLevel >= 4 ? "text-emerald-400" :
                current.privacyLevel >= 3 ? "text-purple-400" :
                current.privacyLevel >= 2 ? "text-[#6366f1]" :
                "text-[var(--text-secondary)]"
              }>{current.privacy}</span>
            </div>
            <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  current.privacyLevel >= 4 ? "bg-emerald-400" :
                  current.privacyLevel >= 3 ? "bg-purple-500" :
                  current.privacyLevel >= 2 ? "bg-[#6366f1]" :
                  "bg-[var(--text-secondary)]"
                }`}
                style={{ width: `${(current.privacyLevel / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* Features list */}
          <div className="space-y-1">
            {current.features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="text-emerald-400">&#10003;</span>
                {f}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
