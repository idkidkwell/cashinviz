"use client";

import { useState } from "react";

const TIERS = [
  { name: "Bronze",   fee: "2.0%", minUses: 0,  discount: "0%",  color: "#b45309" },
  { name: "Silver",   fee: "1.5%", minUses: 5,  discount: "25%", color: "#9ca3af" },
  { name: "Gold",     fee: "1.0%", minUses: 20, discount: "50%", color: "#eab308" },
  { name: "Platinum", fee: "0.5%", minUses: 50, discount: "75%", color: "#c4b5fd" },
];

/**
 * Loyalty Panel — Tier-based fee discounts for repeat privacy users.
 * Earn a lower fee and a bigger discount by using the mixer more.
 */
export function LoyaltyPanel() {
  // Mock data — in production, read from LoyaltyDiscount contract
  const [currentTier] = useState(0); // Bronze
  const [points] = useState(2);
  const [referralCode] = useState("pm-ref-a7b3c9");
  const [copied, setCopied] = useState(false);

  const tier = TIERS[currentTier];
  const nextTier = TIERS[currentTier + 1];
  const progress = nextTier ? (points / nextTier.minUses) * 100 : 100;

  function handleCopy() {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Use the mixer more to unlock lower fees. Tier discounts apply automatically and
        also benefit anyone you refer.
      </p>

      <div className="grid md:grid-cols-[1fr_280px] gap-5">
        {/* ── LEFT: Tier overview + progression ─────────── */}
        <div className="space-y-4 min-w-0">
          {/* Current tier card */}
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: tier.color }}
                />
                <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
                  Current tier
                </p>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                {points} {points === 1 ? "use" : "uses"}
              </p>
            </div>

            <p
              className="text-[22px] font-semibold leading-none"
              style={{ color: tier.color }}
            >
              {tier.name}
            </p>

            <div className="grid grid-cols-3 gap-3 mt-5">
              <TierStat label="Fee rate"  value={tier.fee} />
              <TierStat label="Discount"  value={tier.discount} />
              <TierStat label="Uses"      value={String(points)} />
            </div>

            {/* Progress to next tier */}
            {nextTier && (
              <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
                <div className="flex justify-between items-baseline text-[11px] mb-2">
                  <span className="text-[var(--text-muted)]">
                    Progress to{" "}
                    <span style={{ color: nextTier.color }}>{nextTier.name}</span>
                  </span>
                  <span className="text-[var(--text-secondary)] tabular-nums">
                    {points} / {nextTier.minUses}
                  </span>
                </div>
                <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: nextTier.color,
                    }}
                  />
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-2">
                  {nextTier.minUses - points} more uses to unlock the {nextTier.discount}{" "}
                  discount.
                </p>
              </div>
            )}
          </div>

          {/* All tiers */}
          <div>
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
              All tiers
            </p>
            <div className="grid grid-cols-4 gap-2">
              {TIERS.map((t, i) => {
                const isCurrent = i === currentTier;
                return (
                  <div
                    key={t.name}
                    className={`rounded-lg p-3 border transition-all ${
                      isCurrent
                        ? "border-[#6366f1] bg-[#6366f1]/[0.06]"
                        : "border-[var(--border-subtle)] bg-[var(--card)]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      <p
                        className="text-[11px] font-medium leading-none"
                        style={{ color: t.color }}
                      >
                        {t.name}
                      </p>
                    </div>
                    <p className="text-[15px] font-semibold text-[var(--text-primary)] tabular-nums leading-none">
                      {t.fee}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
                      {t.minUses}+ uses
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Referral + explainer ───────────────── */}
        <aside className="md:sticky md:top-4 self-start">
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
              Referral program
            </p>

            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              Share your code. You and your referral both earn bonus points plus an
              extra 0.25% fee discount.
            </p>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1.5">
                Your code
              </label>
              <div className="flex gap-2">
                <input
                  value={referralCode}
                  readOnly
                  className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] font-mono text-[#818cf8] focus:outline-none min-w-0"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 rounded-lg border border-[var(--border)] hover:border-[#6366f1]/50 text-[12px] text-[var(--text-secondary)] transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="h-px bg-[var(--border-subtle)]" />

            <div className="space-y-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
              <p>
                <span className="text-[var(--text-secondary)]">Discounts</span> apply
                automatically at withdrawal — no claim step.
              </p>
              <p>
                <span className="text-[var(--text-secondary)]">Points</span> never expire
                and follow your wallet across sessions.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─── Tiny helpers ─────────────────────────────────── */

function TierStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-[var(--text-muted)] mb-1">{label}</p>
      <p className="text-[15px] font-semibold text-[var(--text-primary)] tabular-nums leading-none">
        {value}
      </p>
    </div>
  );
}
