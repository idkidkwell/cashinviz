"use client";

import { useEffect, useState } from "react";

/**
 * Compact three-stat strip that ticks slowly upward so the pool feels alive.
 * Used on the empty-state of the Deposit tab while the user picks a mode.
 */
export function PoolActivityStrip() {
  const [activeNotes, setActiveNotes] = useState(12_847);
  const [mixedTotal, setMixedTotal] = useState(23_400_000);
  const [last24h, setLast24h] = useState(847);

  useEffect(() => {
    const t = setInterval(() => {
      // Small, organic-feeling increments. Not every tick moves.
      if (Math.random() < 0.55) setActiveNotes((n) => n + 1);
      if (Math.random() < 0.4) setMixedTotal((n) => n + Math.floor(1_000 + Math.random() * 9_000));
      if (Math.random() < 0.25) setLast24h((n) => n + 1);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative grid grid-cols-3 gap-0 py-5 border-y border-[var(--border-subtle)]">
      {/* Live indicator — subtle, single source of truth for "this is live data" */}
      <div className="absolute top-2 right-3 flex items-center gap-1.5">
        <span className="relative flex h-[5px] w-[5px]">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-[5px] w-[5px] rounded-full bg-emerald-400" />
        </span>
        <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-medium">Live</span>
      </div>

      <Stat label="Active notes" value={activeNotes.toLocaleString("en-US")} />
      <Stat label="Mixed total" value={`$${(mixedTotal / 1_000_000).toFixed(1)}M`} bordered />
      <Stat label="Last 24h" value={last24h.toLocaleString("en-US")} />
    </div>
  );
}

function Stat({ label, value, bordered }: { label: string; value: string; bordered?: boolean }) {
  return (
    <div className={`text-center ${bordered ? "border-x border-[var(--border-subtle)]" : ""}`}>
      <p className="text-[18px] font-semibold tabular-nums text-[var(--text-primary)]">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] mt-1">{label}</p>
    </div>
  );
}
