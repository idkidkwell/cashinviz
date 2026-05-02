"use client";

import { useMemo, useState } from "react";

/**
 * Private DeFi Panel — Interact with DeFi protocols using shielded funds.
 * Swap, lend, borrow — all without revealing your address.
 */
export function PrivateDeFiPanel() {
  const [action, setAction] = useState<"swap" | "lend">("swap");

  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Swap, lend, or borrow using your shielded balance. Each action nullifies your
        old note and creates new shielded output notes — no address ever exposed.
      </p>

      {/* Action toggle */}
      <div className="flex gap-2 mb-5 max-w-[300px]">
        {(["swap", "lend"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAction(a)}
            className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
              action === a
                ? "bg-[#6366f1] text-white"
                : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[#6366f1]/50"
            }`}
          >
            {a === "swap" ? "Private swap" : "Private lend"}
          </button>
        ))}
      </div>

      {action === "swap" ? <SwapPanel /> : <LendPanel />}
    </div>
  );
}

/* ───────────────── SWAP ───────────────── */

function SwapPanel() {
  const [tokenIn, setTokenIn] = useState("ETH");
  const [tokenOut, setTokenOut] = useState("USDC");
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [isSwapping, setIsSwapping] = useState(false);

  // Mock quote
  const mockRate = tokenIn === "ETH" && tokenOut === "USDC" ? 3200 : 1;
  const amountNum = parseFloat(amountIn) || 0;
  const estimatedOut = amountNum * mockRate;
  const minReceived = estimatedOut * (1 - parseFloat(slippage) / 100);

  async function handleSwap() {
    if (amountNum <= 0) return;
    setIsSwapping(true);
    // TODO: Generate ZK proof + call PrivateDeFiRouter.executePrivateAction()
    setTimeout(() => setIsSwapping(false), 3000);
  }

  function flipTokens() {
    const t = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(t);
  }

  return (
    <div className="grid md:grid-cols-[1fr_280px] gap-5">
      {/* LEFT: swap form */}
      <div className="space-y-3 min-w-0">
        {/* From */}
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.06em]">
              From (shielded)
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">Balance hidden</span>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-transparent text-[20px] font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none tabular-nums"
            />
            <select
              value={tokenIn}
              onChange={(e) => setTokenIn(e.target.value)}
              className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] focus:border-[#6366f1] focus:outline-none transition-colors"
            >
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
              <option value="DAI">DAI</option>
              <option value="WBTC">WBTC</option>
            </select>
          </div>
        </div>

        {/* Flip */}
        <div className="flex justify-center -my-1.5 relative z-10">
          <button
            onClick={flipTokens}
            className="w-8 h-8 rounded-full bg-[var(--card)] border border-[var(--border)] hover:border-[#6366f1]/50 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Flip tokens"
          >
            ↓
          </button>
        </div>

        {/* To */}
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 space-y-2">
          <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.06em]">
            To (new shielded note)
          </span>
          <div className="flex gap-2 items-center">
            <p className="flex-1 text-[20px] font-medium tabular-nums">
              {estimatedOut > 0 ? (
                <span className="text-[var(--text-primary)]">
                  {estimatedOut.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">0.0</span>
              )}
            </p>
            <select
              value={tokenOut}
              onChange={(e) => setTokenOut(e.target.value)}
              className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] focus:border-[#6366f1] focus:outline-none transition-colors"
            >
              <option value="USDC">USDC</option>
              <option value="ETH">ETH</option>
              <option value="DAI">DAI</option>
              <option value="WBTC">WBTC</option>
            </select>
          </div>
        </div>

        {/* Slippage */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.06em]">
            Slippage
          </span>
          <div className="flex gap-1">
            {["0.1", "0.5", "1.0"].map((s) => (
              <button
                key={s}
                onClick={() => setSlippage(s)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  slippage === s
                    ? "bg-[#6366f1] text-white"
                    : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[#6366f1]/50"
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSwap}
          disabled={amountNum <= 0 || isSwapping}
          className="btn-primary w-full py-3 text-[13px] font-semibold mt-2"
        >
          {isSwapping ? "Generating ZK proof…" : "Private swap"}
        </button>
      </div>

      {/* RIGHT: route details */}
      <aside className="md:sticky md:top-4 self-start">
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
            Route
          </p>

          <div>
            <p className="text-[11px] text-[var(--text-muted)] mb-1">Rate</p>
            <p className="text-[13px] font-medium text-[var(--text-primary)] tabular-nums">
              1 {tokenIn} ={" "}
              {mockRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
              {tokenOut}
            </p>
          </div>

          <div className="space-y-2.5">
            <Stat label="Venue" value="Uniswap V3" />
            <Stat label="Fee tier" value="0.3%" />
            <Stat label="Price impact" value="< 0.01%" tone="emerald" />
            <Stat
              label="Min received"
              value={
                amountNum > 0
                  ? `${minReceived.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${tokenOut}`
                  : "—"
              }
            />
          </div>

          <div className="h-px bg-[var(--border-subtle)]" />

          <div className="space-y-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
            <p>
              <span className="text-[var(--text-secondary)]">Atomic swap</span> — your old
              note is nullified and a new shielded note for {tokenOut} is minted in the
              same transaction.
            </p>
            <p>
              <span className="text-[var(--text-secondary)]">No address</span> appears
              on-chain, only commitments.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ───────────────── LEND ───────────────── */

function LendPanel() {
  const [lendMode, setLendMode] = useState<"supply" | "withdraw">("supply");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("ETH");
  const [isProcessing, setIsProcessing] = useState(false);

  const amountNum = useMemo(() => parseFloat(amount) || 0, [amount]);

  // Mock lending stats
  const lendingStats: Record<string, { apy: string; supplied: string }> = {
    ETH: { apy: "2.8%", supplied: "0 ETH" },
    USDC: { apy: "4.1%", supplied: "0 USDC" },
    DAI: { apy: "3.9%", supplied: "0 DAI" },
  };
  const currentStats = lendingStats[token] ?? lendingStats.ETH;

  async function handleAction() {
    if (amountNum <= 0) return;
    setIsProcessing(true);
    // TODO: Generate ZK proof + call PrivateDeFiRouter for AAVE_SUPPLY/AAVE_WITHDRAW
    setTimeout(() => setIsProcessing(false), 3000);
  }

  return (
    <div className="grid md:grid-cols-[1fr_280px] gap-5">
      {/* LEFT: lend form */}
      <div className="space-y-4 min-w-0">
        {/* Supply/Withdraw mini-toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setLendMode("supply")}
            className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              lendMode === "supply"
                ? "bg-emerald-400/15 border border-emerald-400/40 text-emerald-400"
                : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-emerald-400/40"
            }`}
          >
            Supply
          </button>
          <button
            onClick={() => setLendMode("withdraw")}
            className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              lendMode === "withdraw"
                ? "bg-mixer-red/15 border border-mixer-red/40 text-mixer-red"
                : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-mixer-red/40"
            }`}
          >
            Withdraw
          </button>
        </div>

        <Field label={lendMode === "supply" ? "Supply amount" : "Withdraw amount"}>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors"
            />
            <select
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 text-[13px] text-[var(--text-primary)] focus:border-[#6366f1] focus:outline-none transition-colors"
            >
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
              <option value="DAI">DAI</option>
            </select>
          </div>
        </Field>

        <button
          onClick={handleAction}
          disabled={amountNum <= 0 || isProcessing}
          className="btn-primary w-full py-3 text-[13px] font-semibold"
        >
          {isProcessing
            ? "Generating ZK proof…"
            : lendMode === "supply"
            ? "Private supply to Aave"
            : "Private withdraw from Aave"}
        </button>
      </div>

      {/* RIGHT: APY + position */}
      <aside className="md:sticky md:top-4 self-start">
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
            Position
          </p>

          <div>
            <p className="text-[11px] text-[var(--text-muted)] mb-1">
              Aave V3 supply APY · {token}
            </p>
            <p className="text-[22px] font-semibold text-emerald-400 tabular-nums leading-none">
              {currentStats.apy}
            </p>
          </div>

          <div className="space-y-2.5">
            <Stat label="Your shielded supply" value={currentStats.supplied} />
            <Stat label="Protocol" value="Aave V3" />
            <Stat label="aTokens" value="held in new note" />
          </div>

          <div className="h-px bg-[var(--border-subtle)]" />

          <div className="space-y-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
            <p>
              <span className="text-[var(--text-secondary)]">aTokens</span> are wrapped in
              a fresh shielded note — your position stays private.
            </p>
            <p>
              <span className="text-[var(--text-secondary)]">Yield</span> compounds
              automatically inside the shielded note.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ─── Tiny helpers ─────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald";
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
      <span
        className={`text-[13px] font-medium tabular-nums ${
          tone === "emerald" ? "text-emerald-400" : "text-[var(--text-primary)]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
