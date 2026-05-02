"use client";

import { useEffect, useRef, useState } from "react";

interface PathEntry {
  recipient: string;
  percentage: number;
  delay: string;
}

const DELAY_OPTIONS = [
  { value: "0", label: "Immediate" },
  { value: "1h", label: "1h" },
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" },
  { value: "3d", label: "3d" },
  { value: "7d", label: "7d" },
];

// Evenly-spaced path colors from the indigo → violet palette, with some greens mixed.
const PATH_COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
  "#34d399", "#10b981", "#fbbf24", "#f59e0b",
  "#f87171", "#fb7185",
];

export function MultiPathPanel() {
  const [note, setNote] = useState("");
  const [paths, setPaths] = useState<PathEntry[]>([
    { recipient: "", percentage: 50, delay: "0" },
    { recipient: "", percentage: 50, delay: "1h" },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const totalPercent = paths.reduce((sum, p) => sum + p.percentage, 0);
  const allocationValid = totalPercent === 100;
  const filledCount = paths.filter((p) => p.recipient.trim().length > 0).length;
  const canSubmit =
    !!note && allocationValid && filledCount === paths.length && !isProcessing;

  function addPath() {
    if (paths.length >= 10) return;
    setPaths([...paths, { recipient: "", percentage: 0, delay: "0" }]);
  }

  function removePath(idx: number) {
    if (paths.length <= 2) return;
    setPaths(paths.filter((_, i) => i !== idx));
  }

  function updatePath(idx: number, field: keyof PathEntry, value: string | number) {
    setPaths(paths.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  function distributeEvenly() {
    const each = Math.floor(100 / paths.length);
    const remainder = 100 - each * paths.length;
    setPaths(
      paths.map((p, i) => ({ ...p, percentage: i === 0 ? each + remainder : each })),
    );
  }

  async function handleCreate() {
    if (!canSubmit) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsProcessing(true);
    timerRef.current = setTimeout(() => {
      setIsProcessing(false);
      setSubmitted(true);
      timerRef.current = null;
    }, 1500);
  }

  function handleReset() {
    setSubmitted(false);
    setNote("");
    setPaths([
      { recipient: "", percentage: 50, delay: "0" },
      { recipient: "", percentage: 50, delay: "1h" },
    ]);
  }

  if (submitted) {
    return (
      <div className="max-w-[640px] mx-auto">
        <div className="bg-[var(--card)] border border-emerald-400/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <p className="text-[13px] font-medium text-emerald-400">
              {paths.length}-path withdrawal committed
            </p>
          </div>
          <div className="space-y-1.5 text-[13px]">
            {paths.map((p, i) => (
              <div key={i} className="flex justify-between text-[var(--text-secondary)]">
                <span className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-sm"
                    style={{ background: PATH_COLORS[i % PATH_COLORS.length] }}
                  />
                  <span className="font-mono text-xs">
                    {p.recipient.slice(0, 6)}…{p.recipient.slice(-4)}
                  </span>
                </span>
                <span className="text-[var(--text-primary)] font-medium tabular-nums">
                  {p.percentage}%
                  <span className="text-[var(--text-muted)] ml-1.5">
                    · {DELAY_OPTIONS.find((o) => o.value === p.delay)?.label}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed pt-1">
            Each path executes on its own schedule. Close this page — the plan is
            committed on-chain.
          </p>
          <button
            onClick={handleReset}
            className="w-full py-2.5 rounded-lg text-[13px] border border-[var(--border)] hover:border-[#6366f1]/50 transition-colors text-[var(--text-secondary)]"
          >
            Create another
          </button>
        </div>
      </div>
    );
  }

  // Delay spread for the summary
  const delayLabels = paths.map(
    (p) => DELAY_OPTIONS.find((o) => o.value === p.delay)?.label ?? p.delay,
  );
  const uniqueDelays = Array.from(new Set(delayLabels));
  const delayRange =
    uniqueDelays.length === 1
      ? uniqueDelays[0]
      : `${uniqueDelays[0]} → ${uniqueDelays[uniqueDelays.length - 1]}`;

  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Split a withdrawal across up to 10 addresses with individual delays. Many small
        withdrawals over time are substantially harder to correlate than a single one.
      </p>

      <div className="grid md:grid-cols-[1fr_280px] gap-5">
        {/* ── LEFT: Form ────────────────────────────────────── */}
        <div className="space-y-4 min-w-0">
          {/* Note */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1.5">
              Note
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="mixer-1-..."
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors"
            />
          </div>

          {/* Paths */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
                Paths
              </label>
              <button
                onClick={distributeEvenly}
                className="text-[11px] text-[var(--text-muted)] hover:text-[#6366f1] transition-colors"
              >
                Distribute evenly
              </button>
            </div>

            <div className="space-y-2">
              {paths.map((path, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2.5 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="shrink-0 w-2 h-2 rounded-sm"
                      style={{ background: PATH_COLORS[idx % PATH_COLORS.length] }}
                    />
                    <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
                      Path {idx + 1}
                    </span>
                    {paths.length > 2 && (
                      <button
                        onClick={() => removePath(idx)}
                        className="ml-auto text-[11px] text-[var(--text-muted)] hover:text-mixer-red transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    value={path.recipient}
                    onChange={(e) => updatePath(idx, "recipient", e.target.value)}
                    placeholder="Recipient 0x…"
                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-md px-2.5 py-2 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={path.percentage}
                        onChange={(e) =>
                          updatePath(
                            idx,
                            "percentage",
                            Math.max(0, Math.min(100, parseInt(e.target.value) || 0)),
                          )
                        }
                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-md px-2.5 py-2 pr-7 text-xs text-[var(--text-primary)] focus:border-[#6366f1] focus:outline-none tabular-nums"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                        %
                      </span>
                    </div>
                    <select
                      value={path.delay}
                      onChange={(e) => updatePath(idx, "delay", e.target.value)}
                      className="w-full bg-[var(--card)] border border-[var(--border)] rounded-md px-2.5 py-2 text-xs text-[var(--text-primary)] focus:border-[#6366f1] focus:outline-none"
                    >
                      {DELAY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {paths.length < 10 && (
              <button
                onClick={addPath}
                className="w-full mt-2 py-2 rounded-lg border border-dashed border-[var(--border)] text-[11px] text-[var(--text-muted)] hover:border-[#6366f1]/50 hover:text-[var(--text-secondary)] transition-colors"
              >
                + Add path ({paths.length}/10)
              </button>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleCreate}
            disabled={!canSubmit}
            className="btn-primary w-full py-3 text-[13px] font-semibold"
          >
            {isProcessing
              ? "Committing paths…"
              : !allocationValid
              ? `Allocate ${Math.abs(100 - totalPercent)}% ${totalPercent > 100 ? "less" : "more"}`
              : filledCount < paths.length
              ? `Fill ${paths.length - filledCount} recipient${paths.length - filledCount === 1 ? "" : "s"}`
              : `Split across ${paths.length} paths`}
          </button>
        </div>

        {/* ── RIGHT: Live allocation preview ──────────────── */}
        <aside className="md:sticky md:top-4 self-start">
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
                Allocation
              </p>
              <span
                className={`text-[11px] font-medium tabular-nums ${
                  allocationValid ? "text-emerald-400" : "text-mixer-red"
                }`}
              >
                {totalPercent}%
              </span>
            </div>

            {/* Stacked bar */}
            <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden flex">
              {paths.map((p, i) =>
                p.percentage > 0 ? (
                  <div
                    key={i}
                    style={{
                      width: `${Math.min(p.percentage, 100)}%`,
                      background: PATH_COLORS[i % PATH_COLORS.length],
                    }}
                    className="h-full transition-all duration-300"
                  />
                ) : null,
              )}
            </div>

            {/* Path breakdown */}
            <div className="space-y-1.5">
              {paths.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-[11px]"
                >
                  <span
                    className="shrink-0 w-2 h-2 rounded-sm"
                    style={{ background: PATH_COLORS[i % PATH_COLORS.length] }}
                  />
                  <span className="text-[var(--text-secondary)]">Path {i + 1}</span>
                  <span className="ml-auto text-[var(--text-primary)] font-medium tabular-nums">
                    {p.percentage}%
                  </span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-[var(--border-subtle)]" />

            {/* Stats */}
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Paths</span>
                <span className="text-[var(--text-primary)] font-medium tabular-nums">
                  {paths.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Delay range</span>
                <span className="text-[var(--text-primary)] font-medium">{delayRange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Recipients filled</span>
                <span
                  className={`font-medium tabular-nums ${
                    filledCount === paths.length
                      ? "text-emerald-400"
                      : "text-[var(--text-primary)]"
                  }`}
                >
                  {filledCount} / {paths.length}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
