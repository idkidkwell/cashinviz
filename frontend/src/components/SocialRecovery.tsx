"use client";

import { useMemo, useState } from "react";
import { splitNote, reconstructNote } from "@/lib/shamir";

/**
 * Social Recovery Panel — Shamir's Secret Sharing for deposit notes.
 * Split your note into shares. Give to trusted contacts.
 * Any K of N shares can recover your funds.
 */
export function SocialRecovery() {
  const [mode, setMode] = useState<"split" | "recover">("split");

  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-4 max-w-[560px]">
        Split your note into shares for trusted contacts. Any K of N shares can recover
        it; fewer than K reveals nothing.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-5 max-w-[300px]">
        {(["split", "recover"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
              mode === m
                ? "bg-[#6366f1] text-white"
                : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[#6366f1]/50"
            }`}
          >
            {m === "split" ? "Split note" : "Recover note"}
          </button>
        ))}
      </div>

      {mode === "split" ? <SplitPanel /> : <RecoverPanel />}
    </div>
  );
}

/* ───────────────── SPLIT ───────────────── */

function SplitPanel() {
  const [noteInput, setNoteInput] = useState("");
  const [totalShares, setTotalShares] = useState(5);
  const [threshold, setThreshold] = useState(3);
  const [shares, setShares] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const effThreshold = Math.min(Math.max(threshold, 2), totalShares);

  function handleSplit() {
    if (!noteInput.trim()) return;
    const result = splitNote(noteInput.trim(), totalShares, effThreshold);
    setShares(result);
  }

  function copyShare(idx: number) {
    navigator.clipboard.writeText(shares[idx]);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  function handleReset() {
    setShares([]);
    setCopiedIdx(null);
  }

  return (
    <div className="grid md:grid-cols-[1fr_280px] gap-5">
      {/* LEFT */}
      <div className="space-y-4 min-w-0">
        {shares.length === 0 ? (
          <>
            <Field label="Your deposit note">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="mixer-1-..."
                className="w-full h-20 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors resize-none"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Total shares (N)">
                <select
                  value={totalShares}
                  onChange={(e) => setTotalShares(parseInt(e.target.value))}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] focus:border-[#6366f1] focus:outline-none transition-colors"
                >
                  {[3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      {n} shares
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Threshold (K)">
                <select
                  value={effThreshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value))}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] focus:border-[#6366f1] focus:outline-none transition-colors"
                >
                  {Array.from({ length: totalShares - 1 }, (_, i) => i + 2).map((k) => (
                    <option key={k} value={k}>
                      {k} of {totalShares}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <button
              onClick={handleSplit}
              disabled={!noteInput.trim()}
              className="btn-primary w-full py-3 text-[13px] font-semibold"
            >
              Split into {totalShares} shares
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <p className="text-[13px] font-medium text-emerald-400">Shares generated</p>
              </div>
              <button
                onClick={handleReset}
                className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Start over
              </button>
            </div>

            <div className="space-y-2">
              {shares.map((share, i) => (
                <div
                  key={i}
                  className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-3 flex items-start gap-3"
                >
                  <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mt-0.5 w-8 shrink-0">
                    #{i + 1}
                  </span>
                  <p className="font-mono text-[11px] text-[var(--text-primary)] break-all flex-1 leading-relaxed">
                    {share.length > 60 ? `${share.substring(0, 60)}…` : share}
                  </p>
                  <button
                    onClick={() => copyShare(i)}
                    className="text-[12px] text-[#818cf8] hover:underline shrink-0"
                  >
                    {copiedIdx === i ? "Copied" : "Copy"}
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-mixer-red/10 border border-mixer-red/30 rounded-lg px-3 py-2">
              <p className="text-[11px] text-mixer-red leading-relaxed">
                Each trusted contact gets <strong>one</strong> share — never duplicate.
              </p>
            </div>
          </>
        )}
      </div>

      {/* RIGHT: Scheme summary */}
      <aside className="md:sticky md:top-4 self-start">
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
            Your scheme
          </p>

          <div>
            <p className="text-[11px] text-[var(--text-muted)] mb-1.5">Recovery threshold</p>
            <p className="text-[22px] font-semibold text-[var(--text-primary)] tabular-nums leading-none mb-2.5">
              {effThreshold}
              <span className="text-[15px] font-normal text-[var(--text-muted)]"> of </span>
              {totalShares}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: totalShares }, (_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    i < effThreshold ? "bg-[#6366f1]" : "bg-[var(--border)]"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-[var(--text-muted)] mb-1">Total shares</p>
              <p className="text-[13px] font-medium text-[var(--text-primary)] tabular-nums">
                {totalShares}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-muted)] mb-1">Loss tolerance</p>
              <p className="text-[13px] font-medium text-[var(--text-primary)] tabular-nums">
                {totalShares - effThreshold} lost
              </p>
            </div>
          </div>

          <div className="h-px bg-[var(--border-subtle)]" />

          <div className="space-y-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
            <p>
              <span className="text-[var(--text-secondary)]">Fewer than {effThreshold}</span>{" "}
              shares reveal nothing — information-theoretic security.
            </p>
            <p>
              <span className="text-[var(--text-secondary)]">Higher K</span> is stricter;
              higher <span className="text-[var(--text-secondary)]">N−K</span> is more
              resilient to lost shares.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ───────────────── RECOVER ───────────────── */

function RecoverPanel() {
  const [shareInputs, setShareInputs] = useState<string[]>(["", "", ""]);
  const [recovered, setRecovered] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const filledCount = useMemo(
    () => shareInputs.filter((s) => s.trim().length > 0).length,
    [shareInputs],
  );

  function addShareInput() {
    setShareInputs([...shareInputs, ""]);
  }

  function updateShare(idx: number, value: string) {
    const updated = [...shareInputs];
    updated[idx] = value;
    setShareInputs(updated);
  }

  function removeShare(idx: number) {
    setShareInputs(shareInputs.filter((_, i) => i !== idx));
  }

  function handleRecover() {
    setError(null);
    setRecovered(null);
    const validShares = shareInputs.filter((s) => s.trim().length > 0);
    if (validShares.length < 2) {
      setError("Need at least 2 shares to recover");
      return;
    }
    try {
      const note = reconstructNote(validShares);
      setRecovered(note);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Failed to reconstruct — wrong shares or not enough";
      setError(msg);
    }
  }

  function handleReset() {
    setRecovered(null);
    setShareInputs(["", "", ""]);
    setError(null);
    setCopied(false);
  }

  /* ── Recovered: compact success card ──────────────── */
  if (recovered) {
    return (
      <div className="max-w-[640px] mx-auto">
        <div className="bg-[var(--card)] border border-emerald-400/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <p className="text-[13px] font-medium text-emerald-400">Note recovered</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 font-mono text-[11px] break-all text-[var(--text-primary)] leading-relaxed">
            {recovered}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(recovered);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex-1 py-2.5 rounded-lg text-[13px] border border-[var(--border)] hover:border-[#6366f1]/50 transition-colors text-[var(--text-secondary)]"
            >
              {copied ? "Copied!" : "Copy note"}
            </button>
            <button
              onClick={handleReset}
              className="flex-1 py-2.5 rounded-lg text-[13px] border border-[var(--border)] hover:border-[#6366f1]/50 transition-colors text-[var(--text-secondary)]"
            >
              Recover another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[1fr_280px] gap-5">
      {/* LEFT: share inputs */}
      <div className="space-y-3 min-w-0">
        {shareInputs.map((share, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={share}
              onChange={(e) => updateShare(i, e.target.value)}
              placeholder={`Share #${i + 1}`}
              className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors"
            />
            {shareInputs.length > 2 && (
              <button
                onClick={() => removeShare(i)}
                className="px-3 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:border-mixer-red hover:text-mixer-red transition-colors text-[13px]"
                aria-label={`Remove share ${i + 1}`}
              >
                ×
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addShareInput}
          className="w-full py-2 rounded-lg text-[12px] border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:border-[#6366f1]/50 hover:text-[var(--text-secondary)] transition-colors"
        >
          + Add another share
        </button>

        {error && (
          <div className="bg-mixer-red/10 border border-mixer-red/30 rounded-lg px-3 py-2.5">
            <p className="text-[12px] text-mixer-red">{error}</p>
          </div>
        )}

        <button
          onClick={handleRecover}
          disabled={filledCount < 2}
          className="btn-primary w-full py-3 text-[13px] font-semibold"
        >
          Recover note
        </button>
      </div>

      {/* RIGHT: Recovery status */}
      <aside className="md:sticky md:top-4 self-start">
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
            Recovery status
          </p>

          <div>
            <p className="text-[11px] text-[var(--text-muted)] mb-1">Shares provided</p>
            <p className="text-[22px] font-semibold text-[var(--text-primary)] tabular-nums leading-none">
              {filledCount}
              <span className="text-[13px] font-normal text-[var(--text-muted)] ml-1.5">
                of {shareInputs.length}
              </span>
            </p>
          </div>

          <div className="flex gap-1">
            {shareInputs.map((s, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  s.trim().length > 0 ? "bg-[#6366f1]" : "bg-[var(--border)]"
                }`}
              />
            ))}
          </div>

          <div className="h-px bg-[var(--border-subtle)]" />

          <div className="space-y-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
            <p>
              <span className="text-[var(--text-secondary)]">You need</span> at least the
              threshold number of original shares — paste each into a row.
            </p>
            <p>
              <span className="text-[var(--text-secondary)]">Wrong shares</span> or fewer
              than the threshold will fail. No partial recovery is possible.
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
