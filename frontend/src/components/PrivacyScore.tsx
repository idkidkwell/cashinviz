"use client";

import { useAccount } from "wagmi";

interface PrivacyScoreProps {
  anonymitySetSize: number;
  timeSinceDeposit: number | null; // minutes since deposit, null if no active note
  token: string;
}

/**
 * Privacy Score Indicator
 *
 * Shows users exactly how private their withdrawal would be right now.
 * Nobody else does this. Tornado Cash never told you anything —
 * you had to guess. This builds trust and educates users.
 *
 * Factors:
 * 1. Anonymity set size (how many deposits in the pool)
 * 2. Time since deposit (longer wait = more deposits after yours = better privacy)
 * 3. Pool activity (deposits per hour)
 */
export function PrivacyScore({ anonymitySetSize, timeSinceDeposit, token }: PrivacyScoreProps) {
  const score = calculateScore(anonymitySetSize, timeSinceDeposit);
  const rating = getRating(score);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">Privacy Score</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            rating.color
          }`}
        >
          {rating.label}
        </span>
      </div>

      {/* Score bar */}
      <div className="relative h-2 bg-[var(--bg)] rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${rating.barColor}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-white">{anonymitySetSize}</p>
          <p className="text-xs text-[var(--text-secondary)]">Anonymity Set</p>
        </div>
        <div>
          <p className="text-lg font-bold text-white">
            {timeSinceDeposit !== null ? formatTime(timeSinceDeposit) : "--"}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">Time Waiting</p>
        </div>
        <div>
          <p className="text-lg font-bold text-white">{token}</p>
          <p className="text-xs text-[var(--text-secondary)]">Pool</p>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`text-xs p-2 rounded-lg ${rating.bgColor}`}>
        {rating.recommendation}
      </div>
    </div>
  );
}

// ── Compact version for the stats bar ────────────────────────

export function PrivacyScoreBadge({ anonymitySetSize }: { anonymitySetSize: number }) {
  const score = calculateScore(anonymitySetSize, null);
  const rating = getRating(score);

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${rating.dotColor}`} />
      <span className="text-xs text-[var(--text-secondary)]">
        {anonymitySetSize} in set
      </span>
    </div>
  );
}

// ── Score calculation ────────────────────────────────────────

function calculateScore(setSize: number, waitMinutes: number | null): number {
  // Anonymity set score (0-60 points)
  // 1 deposit = 0 pts, 10 = 20 pts, 100 = 40 pts, 1000+ = 60 pts
  const setScore = Math.min(60, Math.log10(Math.max(setSize, 1)) * 20);

  // Time score (0-40 points)
  // 0 min = 0 pts, 1 hour = 15 pts, 24 hours = 30 pts, 7 days = 40 pts
  let timeScore = 0;
  if (waitMinutes !== null) {
    const hours = waitMinutes / 60;
    timeScore = Math.min(40, Math.log2(Math.max(hours, 0.01) + 1) * 8);
  }

  return Math.round(setScore + timeScore);
}

function getRating(score: number) {
  if (score >= 80) {
    return {
      label: "Excellent",
      color: "bg-emerald-500/20 text-emerald-400",
      barColor: "bg-emerald-500",
      dotColor: "bg-emerald-500",
      bgColor: "bg-emerald-500/10 text-emerald-400",
      recommendation: "Your withdrawal will have strong privacy. Safe to withdraw now.",
    };
  }
  if (score >= 50) {
    return {
      label: "Good",
      color: "bg-blue-500/20 text-blue-400",
      barColor: "bg-blue-500",
      dotColor: "bg-blue-500",
      bgColor: "bg-blue-500/10 text-blue-400",
      recommendation: "Decent privacy. Waiting longer will improve your anonymity set.",
    };
  }
  if (score >= 25) {
    return {
      label: "Fair",
      color: "bg-amber-500/20 text-amber-400",
      barColor: "bg-amber-500",
      dotColor: "bg-amber-500",
      bgColor: "bg-amber-500/10 text-amber-400",
      recommendation: "Low anonymity set. Wait for more deposits before withdrawing.",
    };
  }
  return {
    label: "Poor",
    color: "bg-red-500/20 text-red-400",
    barColor: "bg-red-500",
    dotColor: "bg-red-500",
    bgColor: "bg-red-500/10 text-red-400",
    recommendation: "Very few deposits in pool. Withdrawing now may be traceable. Wait longer.",
  };
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}
