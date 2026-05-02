"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const DELAY_PRESETS = [
  { label: "1h", privacy: "low" as const, value: 3600 },
  { label: "6h", privacy: "medium" as const, value: 21600 },
  { label: "24h", privacy: "good" as const, value: 86400 },
  { label: "3d", privacy: "high" as const, value: 259200 },
  { label: "7d", privacy: "max" as const, value: 604800 },
];

const PRIVACY_META: Record<
  "low" | "medium" | "good" | "high" | "max",
  { label: string; tone: string; percent: number }
> = {
  low:    { label: "Low",      tone: "text-mixer-red",   percent: 20 },
  medium: { label: "Medium",   tone: "text-amber-400",   percent: 40 },
  good:   { label: "Good",     tone: "text-[#6366f1]",   percent: 60 },
  high:   { label: "High",     tone: "text-emerald-400", percent: 80 },
  max:    { label: "Maximum",  tone: "text-emerald-400", percent: 100 },
};

function formatExecutionTime(seconds: number, jitter: boolean): string {
  const target = new Date(Date.now() + seconds * 1000);
  const base = target.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return jitter ? `~${base}` : base;
}

export function TimeLockPanel() {
  const [note, setNote] = useState("");
  const [recipient, setRecipient] = useState("");
  const [selectedDelay, setSelectedDelay] = useState(86400);
  const [jitter, setJitter] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  const selectedPreset = DELAY_PRESETS.find((p) => p.value === selectedDelay)!;
  const privacy = PRIVACY_META[selectedPreset.privacy];
  const executionTime = useMemo(
    () => formatExecutionTime(selectedDelay, jitter),
    [selectedDelay, jitter],
  );

  const canSubmit = !!note && !!recipient && !isScheduling;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleSchedule() {
    if (!canSubmit) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsScheduling(true);
    timerRef.current = setTimeout(() => {
      setScheduled(true);
      setIsScheduling(false);
      timerRef.current = null;
    }, 1500);
  }

  function handleReset() {
    setScheduled(false);
    setNote("");
    setRecipient("");
  }

  if (scheduled) {
    return (
      <div className="max-w-[640px] mx-auto">
        <div className="bg-[var(--card)] border border-emerald-400/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <p className="text-[13px] font-medium text-emerald-400">Withdrawal scheduled</p>
          </div>
          <div className="space-y-2 text-[13px]">
            <Row label="Delay" value={`${selectedPreset.label}${jitter ? " + jitter" : ""}`} />
            <Row label="Estimated execution" value={executionTime} />
            <Row
              label="Recipient"
              value={
                <span className="font-mono text-xs">
                  {recipient.slice(0, 6)}…{recipient.slice(-4)}
                </span>
              }
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed pt-1">
            Anyone can trigger the withdrawal once the timelock expires. Close this page —
            the schedule is committed on-chain.
          </p>
          <button
            onClick={handleReset}
            className="w-full py-2.5 rounded-lg text-[13px] border border-[var(--border)] hover:border-[#6366f1]/50 transition-colors text-[var(--text-secondary)]"
          >
            Schedule another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[820px] mx-auto">
      {/* Intro — small, breadcrumb already labels the page */}
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Schedule a withdrawal with a configurable delay. Longer delays expand your
        anonymity set — optional jitter randomizes the execution time.
      </p>

      {/* Two-column layout */}
      <div className="grid md:grid-cols-[1fr_280px] gap-5">
        {/* ── LEFT: Form ────────────────────────────────────── */}
        <div className="space-y-4 min-w-0">
          {/* Note */}
          <Field label="Note">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="mixer-1-..."
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors"
            />
          </Field>

          {/* Recipient */}
          <Field label="Recipient">
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x…"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors"
            />
          </Field>

          {/* Delay */}
          <Field label="Delay">
            <div className="grid grid-cols-5 gap-1.5">
              {DELAY_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setSelectedDelay(preset.value)}
                  className={`py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                    selectedDelay === preset.value
                      ? "bg-[#6366f1] text-white"
                      : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[#6366f1]/50"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Jitter */}
          <div className="flex items-center justify-between bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3.5 py-2.5">
            <div>
              <p className="text-[13px] text-[var(--text-primary)]">Random jitter</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Adds +0–2h to break timing correlation
              </p>
            </div>
            <button
              onClick={() => setJitter(!jitter)}
              className={`shrink-0 w-10 h-5.5 rounded-full transition-colors ${
                jitter ? "bg-[#6366f1]" : "bg-[var(--border)]"
              }`}
              style={{ height: "22px" }}
            >
              <div
                className={`w-[18px] h-[18px] bg-white rounded-full transition-transform mx-0.5 ${
                  jitter ? "translate-x-[18px]" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* CTA */}
          <button
            onClick={handleSchedule}
            disabled={!canSubmit}
            className="btn-primary w-full py-3 text-[13px] font-semibold"
          >
            {isScheduling ? "Scheduling…" : `Schedule withdrawal · ${selectedPreset.label}`}
          </button>
        </div>

        {/* ── RIGHT: Live summary ──────────────────────────── */}
        <aside className="md:sticky md:top-4 self-start">
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
              Your schedule
            </p>

            {/* Delay */}
            <div>
              <p className="text-[11px] text-[var(--text-muted)] mb-1">Delay</p>
              <p className="text-[15px] font-semibold text-[var(--text-primary)] tabular-nums">
                {selectedPreset.label}
                {jitter && (
                  <span className="text-[12px] font-normal text-[var(--text-muted)] ml-1">
                    + jitter
                  </span>
                )}
              </p>
            </div>

            {/* Estimated execution */}
            <div>
              <p className="text-[11px] text-[var(--text-muted)] mb-1">Estimated execution</p>
              <p className="text-[13px] font-medium text-[var(--text-primary)] tabular-nums">
                {executionTime}
              </p>
            </div>

            {/* Privacy level */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-[11px] text-[var(--text-muted)]">Privacy level</p>
                <p className={`text-[11px] font-medium ${privacy.tone}`}>{privacy.label}</p>
              </div>
              <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-amber-400 via-[#6366f1] to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${privacy.percent}%` }}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[var(--border-subtle)]" />

            {/* Info */}
            <div className="space-y-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
              <p>
                <span className="text-[var(--text-secondary)]">Anyone</span> can trigger the
                withdrawal once the lock expires — you don't need to stay online.
              </p>
              <p>
                <span className="text-[var(--text-secondary)]">Longer delays</span> mix your
                withdrawal with more peers in the anonymity set.
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-[var(--text-secondary)]">
      <span>{label}</span>
      <span className="text-[var(--text-primary)] font-medium">{value}</span>
    </div>
  );
}
