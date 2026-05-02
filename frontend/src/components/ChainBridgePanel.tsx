"use client";

import { useState, useEffect } from "react";
import { ChainIcon } from "@/components/ChainIcons";

interface ChainInfo {
  id: string;
  name: string;
  type: "evm" | "non-evm";
  tokens: string[];
  bridgeMethod: string;
}

const ALL_CHAINS: ChainInfo[] = [
  { id: "ethereum", name: "Ethereum", type: "evm", tokens: ["ETH", "USDC", "USDT", "DAI", "WBTC"], bridgeMethod: "Native" },
  { id: "arbitrum", name: "Arbitrum", type: "evm", tokens: ["ETH", "USDC", "ARB"], bridgeMethod: "Native" },
  { id: "optimism", name: "Optimism", type: "evm", tokens: ["ETH", "USDC", "OP"], bridgeMethod: "Native" },
  { id: "base", name: "Base", type: "evm", tokens: ["ETH", "USDC"], bridgeMethod: "Native" },
  { id: "polygon", name: "Polygon", type: "evm", tokens: ["MATIC", "USDC", "USDT"], bridgeMethod: "Native" },
  { id: "bsc", name: "BNB Chain", type: "evm", tokens: ["BNB", "USDT", "BUSD"], bridgeMethod: "Native" },
  { id: "avalanche", name: "Avalanche", type: "evm", tokens: ["AVAX", "USDC", "USDT"], bridgeMethod: "Native" },
  { id: "gnosis", name: "Gnosis", type: "evm", tokens: ["xDAI", "USDC"], bridgeMethod: "Native" },
  { id: "linea", name: "Linea", type: "evm", tokens: ["ETH", "USDC"], bridgeMethod: "Native" },
  { id: "bitcoin", name: "Bitcoin", type: "non-evm", tokens: ["BTC"], bridgeMethod: "HTLC Atomic Swap" },
  { id: "solana", name: "Solana", type: "non-evm", tokens: ["SOL", "USDC"], bridgeMethod: "Wormhole" },
  { id: "monero", name: "Monero", type: "non-evm", tokens: ["XMR"], bridgeMethod: "Atomic Swap" },
  { id: "cosmos", name: "Cosmos", type: "non-evm", tokens: ["ATOM", "OSMO"], bridgeMethod: "IBC + Axelar" },
  { id: "tron", name: "Tron", type: "non-evm", tokens: ["TRX", "USDT"], bridgeMethod: "Wormhole" },
  { id: "ton", name: "TON", type: "non-evm", tokens: ["TON"], bridgeMethod: "Wormhole" },
];

type MixingMode = "standard" | "coinjoin" | "monero" | "complete";

const MIXING_MODES: { id: MixingMode; label: string; desc: string; time: string; strength: string }[] = [
  { id: "standard", label: "Standard", desc: "Zero-knowledge proof mixing with fixed denominations.", time: "Instant", strength: "Good" },
  { id: "coinjoin", label: "CoinJoin", desc: "Collaborative transaction — multiple users sign together.", time: "5–30 min", strength: "High" },
  { id: "monero", label: "Monero Route", desc: "Atomic swap to XMR, ring-signature mix, bridge back.", time: "30–60 min", strength: "Very High" },
  { id: "complete", label: "Complete Anonymity", desc: "CoinJoin + Monero + delays + multi-path + decoys + Tor.", time: "1–10 hrs", strength: "Maximum" },
];

interface Props {
  selectedNetwork?: string;
  /** When the parent tab already renders a MixingModeSelector, hide the internal one. */
  showMixingMode?: boolean;
}

export function ChainBridgePanel({ selectedNetwork = "bitcoin", showMixingMode = true }: Props) {
  const selectedChain = ALL_CHAINS.find((c) => c.id === selectedNetwork) ?? ALL_CHAINS[0];
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState<string>(selectedChain.tokens[0]);
  // When parent handles mode selection (Deposit tab), skip step 1 and default to standard
  const [mixingMode, setMixingMode] = useState<MixingMode | null>(showMixingMode ? null : "standard");
  const [isDepositing, setIsDepositing] = useState(false);

  useEffect(() => {
    setSelectedToken(selectedChain.tokens[0]);
  }, [selectedChain.id]);

  async function handleDeposit() {
    if (!amount) return;
    setIsDepositing(true);
    setTimeout(() => setIsDepositing(false), 3000);
  }

  const activeMode = mixingMode ? MIXING_MODES.find((m) => m.id === mixingMode)! : null;
  const depositUnlocked = !!mixingMode;

  return (
    <div className="max-w-[560px] mx-auto">
      {/* Chain context — compact inline */}
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <ChainIcon chainId={selectedChain.id} size={20} />
          <span className="text-[14px] font-medium text-[var(--text-primary)]">{selectedChain.name}</span>
          <span className="text-[11px] text-[var(--text-muted)]">
            {selectedChain.type === "evm" ? "Native" : selectedChain.bridgeMethod}
          </span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
          selectedChain.type === "evm"
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-purple-500/10 text-purple-400"
        }`}>
          {selectedChain.type === "evm" ? "EVM" : "Bridged"}
        </span>
      </div>

      {/* ─── STEP 1: Mixing mode ─── */}
      {showMixingMode && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold transition-colors ${
                mixingMode ? "bg-[var(--accent)] text-white" : "bg-[var(--accent-surface)] text-[var(--accent)]"
              }`}>
                {mixingMode ? "✓" : "1"}
              </span>
              <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
                {mixingMode ? "Mixing mode" : "Choose mixing mode"}
              </p>
            </div>
            {mixingMode && (
              <button
                onClick={() => setMixingMode(null)}
                className="text-[11px] text-[var(--accent)] hover:underline"
              >
                Change
              </button>
            )}
          </div>

          {/* Collapsed — show only selected mode */}
          {mixingMode && activeMode ? (
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--accent-surface)] border border-[var(--accent)]/30">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-semibold text-[var(--accent)]">{activeMode.label}</span>
                <span className="text-[11px] text-[var(--text-secondary)]">{activeMode.desc}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{activeMode.time}</span>
                <span className="w-px h-3 bg-[var(--border)]" />
                <span className="text-[10px] font-medium text-emerald-400">{activeMode.strength}</span>
              </div>
            </div>
          ) : (
            /* Expanded — show all mode choices */
            <div className="grid grid-cols-2 gap-2">
              {MIXING_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setMixingMode(mode.id)}
                  className="text-left p-3.5 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-surface)] transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">{mode.label}</span>
                    <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{mode.time}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-2">{mode.desc}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Privacy</span>
                    <span className="text-[10px] font-medium text-emerald-400">{mode.strength}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── STEP 2: Deposit details (revealed once mode is picked) ─── */}
      {depositUnlocked && (
        <div className="animate-in">
          {showMixingMode && (
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-surface)] text-[var(--accent)] text-[10px] font-semibold">2</span>
              <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">Deposit details</p>
            </div>
          )}

          {/* Asset */}
          <div className="mb-5">
            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-2">Asset</p>
            <div className="flex gap-1.5">
              {selectedChain.tokens.map((token) => (
                <button
                  key={token}
                  onClick={() => setSelectedToken(token)}
                  className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                    selectedToken === token
                      ? "bg-[var(--accent-surface)] border border-[var(--accent)]/30 text-[var(--text-primary)]"
                      : "bg-[var(--card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/20"
                  }`}
                >
                  {token}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="mb-6">
            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-2">Amount</p>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3.5 text-[18px] font-semibold tabular-nums text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:font-normal focus:border-[var(--accent)] focus:outline-none transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[var(--text-muted)]">{selectedToken}</span>
            </div>
          </div>

          {/* Deposit */}
          <button
            onClick={handleDeposit}
            disabled={!amount || parseFloat(amount) <= 0 || isDepositing}
            className="btn-primary w-full py-3.5 text-[14px] font-semibold"
          >
            {isDepositing
              ? `Bridging from ${selectedChain.name}…`
              : amount
                ? `Deposit ${amount} ${selectedToken} from ${selectedChain.name}`
                : `Enter an amount to deposit`}
          </button>
        </div>
      )}
    </div>
  );
}
