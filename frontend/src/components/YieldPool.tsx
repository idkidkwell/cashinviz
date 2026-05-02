"use client";

import { useMemo, useState } from "react";

/**
 * Yield Pool Panel — Earn yield on shielded deposits via Aave V3.
 * Deposits stay private while generating returns.
 */
export function YieldPool() {
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock data — in production these come from contract reads
  const poolStats = {
    tvl: "1,247.3 ETH",
    apy: "3.2%",
    totalYieldGenerated: "18.7 ETH",
    yourDeposit: "0 ETH",
    yourYield: "0 ETH",
  };

  const amountNum = useMemo(() => {
    const n = parseFloat(amount);
    return isNaN(n) || n <= 0 ? 0 : n;
  }, [amount]);

  const protocolFee = amountNum * 0.01;
  const netAmount = mode === "deposit" ? amountNum : amountNum * 0.99;

  async function handleAction() {
    if (amountNum <= 0) return;
    setIsProcessing(true);
    // TODO: Call YieldPool.depositWithYield() / withdrawWithYield() with ZK proof
    setTimeout(() => setIsProcessing(false), 2000);
  }

  return (
    <div className="max-w-[760px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Your shielded deposit earns Aave V3 yield while staying completely private.
        Balances and earnings are never exposed on-chain.
      </p>

      <div className="grid md:grid-cols-[1fr_260px] gap-5">
        {/* ── LEFT: Form ───────────────────────────────── */}
        <div className="space-y-4 min-w-0">
          {/* Mode toggle — lives inside the form column so it aligns */}
          <div className="flex gap-2">
            {(["deposit", "withdraw"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  mode === m
                    ? "bg-[#6366f1] text-white"
                    : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[#6366f1]/50"
                }`}
              >
                {m === "deposit" ? "Deposit + yield" : "Withdraw + yield"}
              </button>
            ))}
          </div>

          <Field label={mode === "deposit" ? "Amount to deposit" : "Amount to withdraw"}>
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors"
              />
              <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 flex items-center text-[13px] text-[var(--text-secondary)]">
                ETH
              </div>
            </div>
          </Field>

          {/* Fee breakdown */}
          {amountNum > 0 && (
            <div className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-3 space-y-1.5 text-[12px]">
              <Row
                label="Protocol fee (1%)"
                value={`${protocolFee.toFixed(4)} ETH`}
              />
              {mode === "withdraw" && (
                <Row
                  label="Performance fee on yield (10%)"
                  value="at withdrawal"
                  muted
                />
              )}
              <div className="pt-1.5 mt-1.5 border-t border-[var(--border)]">
                <Row
                  label={mode === "deposit" ? "You deposit" : "You receive"}
                  value={`${netAmount.toFixed(4)} ETH`}
                  strong
                />
              </div>
            </div>
          )}

          <button
            onClick={handleAction}
            disabled={amountNum <= 0 || isProcessing}
            className="btn-primary w-full py-3 text-[13px] font-semibold"
          >
            {isProcessing
              ? "Generating proof…"
              : mode === "deposit"
              ? "Deposit with yield"
              : "Withdraw with yield"}
          </button>
        </div>

        {/* ── RIGHT: Position + pool ───────────────────── */}
        <aside className="md:sticky md:top-4 self-start">
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
              Your position
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-[var(--text-muted)] mb-1">Principal</p>
                <p className="text-[15px] font-semibold text-[var(--text-primary)] tabular-nums leading-none">
                  {poolStats.yourDeposit}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-muted)] mb-1">Yield earned</p>
                <p className="text-[15px] font-semibold text-emerald-400 tabular-nums leading-none">
                  +{poolStats.yourYield}
                </p>
              </div>
            </div>

            <div className="h-px bg-[var(--border-subtle)]" />

            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
              Pool
            </p>

            <div className="space-y-2.5">
              <Stat label="Current APY" value={poolStats.apy} tone="emerald" />
              <Stat label="Pool TVL" value={poolStats.tvl} />
              <Stat label="Yield generated" value={poolStats.totalYieldGenerated} />
            </div>

            <div className="h-px bg-[var(--border-subtle)]" />

            <div className="space-y-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
              <p>
                <span className="text-[var(--text-secondary)]">Shielded principal</span>{" "}
                earns Aave V3 supply yield; nobody can see your balance or position size.
              </p>
              <p>
                <span className="text-[var(--text-secondary)]">Yield</span> accrues
                proportionally to your share of the pool.
              </p>
            </div>
          </div>
        </aside>
      </div>
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

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        strong ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)]"
      }`}
    >
      <span>{label}</span>
      <span className={muted ? "text-[var(--text-muted)]" : ""}>{value}</span>
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
