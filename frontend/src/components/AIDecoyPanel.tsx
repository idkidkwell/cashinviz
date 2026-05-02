"use client";

import { useState, useEffect } from "react";

type DecoyStrategy = "light" | "medium" | "heavy";

interface DecoyTransaction {
  id: number;
  amount: string;
  action: string;
  chain: string;
  timeAgo: string;
}

const STRATEGIES = {
  light: {
    label: "Light",
    range: "2-3 decoys",
    gasCost: "~$0.30",
    description: "Defeats basic analysis",
  },
  medium: {
    label: "Medium",
    range: "5-8 decoys",
    gasCost: "~$1.20",
    description: "Defeats Chainalysis & Elliptic",
  },
  heavy: {
    label: "Heavy",
    range: "15-25 decoys",
    gasCost: "~$4.80",
    description: "Defeats ML/AI classifiers",
  },
} as const;

const INITIAL_DECOYS: DecoyTransaction[] = [
  { id: 847, amount: "0.42 ETH", action: "deposit", chain: "Arbitrum", timeAgo: "3m ago" },
  { id: 846, amount: "0.15 ETH", action: "withdraw", chain: "Optimism", timeAgo: "7m ago" },
  { id: 845, amount: "1.03 ETH", action: "deposit", chain: "Ethereum", timeAgo: "12m ago" },
  { id: 844, amount: "0.28 ETH", action: "withdraw", chain: "Arbitrum", timeAgo: "18m ago" },
  { id: 843, amount: "0.67 ETH", action: "deposit", chain: "Polygon", timeAgo: "24m ago" },
];

export function AIDecoyPanel() {
  const [enabled, setEnabled] = useState(false);
  const [strategy, setStrategy] = useState<DecoyStrategy>("medium");
  const [randomizeAmounts, setRandomizeAmounts] = useState(true);
  const [randomizeTiming, setRandomizeTiming] = useState(true);
  const [mirrorPatterns, setMirrorPatterns] = useState(false);
  const [crossChain, setCrossChain] = useState(false);
  const [timeWindow, setTimeWindow] = useState(6);
  const [decoys, setDecoys] = useState<DecoyTransaction[]>(INITIAL_DECOYS);
  const [livePulse, setLivePulse] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setLivePulse((p) => !p);
    }, 1000);
    return () => clearInterval(interval);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setDecoys((prev) => {
        const chains = ["Ethereum", "Arbitrum", "Optimism", "Polygon", "Base"];
        const actions = ["deposit", "withdraw"];
        const newDecoy: DecoyTransaction = {
          id: prev[0].id + 1,
          amount: (Math.random() * 2).toFixed(2) + " ETH",
          action: actions[Math.floor(Math.random() * actions.length)],
          chain: chains[Math.floor(Math.random() * chains.length)],
          timeAgo: "just now",
        };
        return [newDecoy, ...prev.slice(0, 4)];
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [enabled]);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-xl">&#x1f9e0;</span>
          AI Anti-Surveillance Engine
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Generate decoy transactions that confuse blockchain analysis tools and AI trackers
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-4 flex items-center justify-between">
        <div className="flex-1">
          {enabled ? (
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-emerald-400 font-medium">
                Decoy engine active &mdash; generating cover traffic
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm text-red-400 font-medium">
                Decoys disabled &mdash; your transactions may stand out
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
            enabled ? "bg-emerald-400" : "bg-[var(--text-muted)]"
          }`}
          aria-label="Toggle decoy engine"
        >
          <span
            className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${
              enabled ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Decoy Strategy Selector */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Decoy Strategy</h3>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(STRATEGIES) as [DecoyStrategy, (typeof STRATEGIES)[DecoyStrategy]][]).map(
            ([key, config]) => (
              <button
                key={key}
                onClick={() => setStrategy(key)}
                className={`rounded-lg border p-4 text-left transition-all ${
                  strategy === key
                    ? "border-emerald-400 bg-emerald-400/10"
                    : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border)]"
                }`}
              >
                <div className="text-sm font-bold text-white">{config.label}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">{config.range} per real tx</div>
                <div className="text-xs text-emerald-400 mt-2">{config.description}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">
                  Est. gas: <span className="text-[#6366f1]">{config.gasCost}</span>
                </div>
              </button>
            )
          )}
        </div>
      </div>

      {/* Decoy Pattern Config */}
      {enabled && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Decoy Pattern Configuration</h3>
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-4 space-y-4">
            <ToggleRow
              label="Randomize amounts"
              description="Decoys use varied amounts"
              checked={randomizeAmounts}
              onChange={setRandomizeAmounts}
            />
            <ToggleRow
              label="Randomize timing"
              description="Decoys sent at random intervals"
              checked={randomizeTiming}
              onChange={setRandomizeTiming}
            />
            <ToggleRow
              label="Mirror real tx patterns"
              description="Decoys mimic your actual transaction patterns"
              checked={mirrorPatterns}
              onChange={setMirrorPatterns}
            />
            <ToggleRow
              label="Cross-chain decoys"
              description="Generate decoys on multiple chains simultaneously"
              checked={crossChain}
              onChange={setCrossChain}
            />

            {/* Time Window Slider */}
            <div className="pt-2 border-t border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--text-primary)]">Generate decoys over</span>
                <span className="text-sm font-mono text-emerald-400">{timeWindow}h</span>
              </div>
              <input
                type="range"
                min={1}
                max={24}
                value={timeWindow}
                onChange={(e) => setTimeWindow(Number(e.target.value))}
                className="w-full accent-emerald-400 h-1 bg-[var(--bg-elevated)] rounded-full appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
                <span>1h</span>
                <span>24h</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Decoy Activity */}
      {enabled && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Live Decoy Activity</h3>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span
                className={`inline-block w-2 h-2 rounded-full bg-emerald-400 transition-opacity duration-500 ${
                  livePulse ? "opacity-100" : "opacity-30"
                }`}
              />
              LIVE
            </span>
          </div>
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
            {decoys.map((decoy) => (
              <div
                key={decoy.id}
                className="px-4 py-3 flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-secondary)] font-mono text-xs">
                    Decoy #{decoy.id}
                  </span>
                  <span className="text-[var(--text-secondary)]">&rarr;</span>
                  <span className="text-white">
                    {decoy.amount} {decoy.action}
                  </span>
                  <span className="text-xs text-[#6366f1] px-1.5 py-0.5 bg-[#6366f1]/10 rounded">
                    {decoy.chain}
                  </span>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">{decoy.timeAgo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-white">142</div>
          <div className="text-xs text-[var(--text-secondary)]">Decoys generated today</div>
        </div>
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-emerald-400">98.7%</div>
          <div className="text-xs text-[var(--text-secondary)]">Analysis tools confused</div>
        </div>
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-[#6366f1]">~$2.40</div>
          <div className="text-xs text-[var(--text-secondary)]">Extra cost</div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-white">{label}</div>
        <div className="text-xs text-[var(--text-secondary)]">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
          checked ? "bg-emerald-400" : "bg-[var(--text-muted)]"
        }`}
        aria-label={`Toggle ${label}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
