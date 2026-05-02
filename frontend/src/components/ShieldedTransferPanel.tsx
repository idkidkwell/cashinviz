"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

/**
 * Shielded Transfer Panel
 *
 * Users can transfer funds to another user INSIDE the shielded pool
 * without any on-chain amount or address being visible.
 *
 * 1. User A has a note (e.g. 10 ETH inside the pool)
 * 2. User A enters: recipient amount (e.g. 3 ETH) + User B's public key
 * 3. ZK proof proves: 10 ETH input = 3 ETH (recipient) + 7 ETH (change)
 * 4. On-chain: the old note is nullified, two new commitments appear
 * 5. User A gives User B their new note string (via any channel)
 * 6. User B can now withdraw 3 ETH to any wallet
 */
export function ShieldedTransferPanel() {
  const { isConnected } = useAccount();
  const [noteInput, setNoteInput] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [status, setStatus] = useState<
    "idle" | "generating" | "submitting" | "done" | "error"
  >("idle");
  const [outputNotes, setOutputNotes] = useState<{
    recipientNote: string;
    changeNote: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedRecipient, setCopiedRecipient] = useState(false);
  const [copiedChange, setCopiedChange] = useState(false);

  const amountNum = useMemo(() => {
    const n = parseFloat(transferAmount);
    return isNaN(n) || n <= 0 ? 0 : n;
  }, [transferAmount]);

  const busy = status === "generating";
  const canSubmit =
    !!noteInput.trim() && amountNum > 0 && isConnected && !busy;

  async function handleTransfer() {
    setError(null);
    if (!noteInput.trim()) {
      setError("Paste your deposit note");
      return;
    }
    if (amountNum <= 0) {
      setError("Enter a valid transfer amount");
      return;
    }
    try {
      setStatus("generating");
      // TODO: parse the note, generate ZK proof for shielded transfer.
      await new Promise((r) => setTimeout(r, 2000));
      setOutputNotes({
        recipientNote: `mixer-transfer-recipient-${Date.now()}-placeholder`,
        changeNote: `mixer-transfer-change-${Date.now()}-placeholder`,
      });
      setStatus("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transfer failed";
      setError(msg);
      setStatus("error");
    }
  }

  function copyText(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  }

  function handleReset() {
    setOutputNotes(null);
    setNoteInput("");
    setTransferAmount("");
    setError(null);
    setStatus("idle");
  }

  /* ── DONE: output notes ────────────────────────────── */
  if (outputNotes) {
    return (
      <div className="max-w-[640px] mx-auto">
        <div className="bg-[var(--card)] border border-emerald-400/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <p className="text-[13px] font-medium text-emerald-400">Transfer complete</p>
          </div>
          <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
            Your old note is nullified. Two new commitments exist in the pool — no
            on-chain link between them.
          </p>

          <NoteCard
            label="Recipient's note — send this to them"
            value={outputNotes.recipientNote}
            tone="emerald"
            copied={copiedRecipient}
            onCopy={() => copyText(outputNotes.recipientNote, setCopiedRecipient)}
          />

          <NoteCard
            label="Your change note — save this (replaces your old note)"
            value={outputNotes.changeNote}
            tone="indigo"
            copied={copiedChange}
            onCopy={() => copyText(outputNotes.changeNote, setCopiedChange)}
          />

          <button
            onClick={handleReset}
            className="w-full py-2.5 rounded-lg text-[13px] border border-[var(--border)] hover:border-[#6366f1]/50 transition-colors text-[var(--text-secondary)]"
          >
            Send another
          </button>
        </div>
      </div>
    );
  }

  /* ── IDLE: form ────────────────────────────────────── */
  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Send a private transfer inside the pool. The recipient gets a new note; you keep
        the change. No amounts or addresses appear on-chain.
      </p>

      <div className="grid md:grid-cols-[1fr_280px] gap-5">
        {/* ── LEFT: Form ───────────────────────────────── */}
        <div className="space-y-4 min-w-0">
          <Field label="Your note">
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="mixer-1-..."
              className="w-full h-20 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors resize-none"
            />
          </Field>

          <Field label="Amount to send">
            <div className="flex gap-2">
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.0"
                step="0.01"
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors"
              />
              <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 flex items-center text-[13px] text-[var(--text-secondary)]">
                ETH
              </div>
            </div>
          </Field>

          {status === "generating" && (
            <div className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 flex items-center gap-3">
              <div className="w-3.5 h-3.5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin shrink-0" />
              <div>
                <p className="text-[13px] text-[var(--text-primary)]">Generating proof…</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Proving value conservation in ZK
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-mixer-red/10 border border-mixer-red/30 rounded-lg px-3 py-2.5">
              <p className="text-[12px] text-mixer-red">{error}</p>
            </div>
          )}

          <button
            onClick={handleTransfer}
            disabled={!canSubmit}
            className="btn-primary w-full py-3 text-[13px] font-semibold"
          >
            {!isConnected
              ? "Connect wallet to continue"
              : status === "generating"
              ? "Generating proof…"
              : "Send privately"}
          </button>
        </div>

        {/* ── RIGHT: Preview ───────────────────────────── */}
        <aside className="md:sticky md:top-4 self-start">
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
              Transfer preview
            </p>

            {/* Flow */}
            <div className="space-y-0">
              <FlowRow
                label="Input note"
                detail={noteInput.trim() ? "nullified on-chain" : "paste to continue"}
                active={!!noteInput.trim()}
                tone="muted"
              />
              <Connector active={!!noteInput.trim() && amountNum > 0} />
              <FlowRow
                label="To recipient"
                detail={
                  amountNum > 0 ? `${transferAmount} ETH` : "amount unset"
                }
                active={amountNum > 0}
                tone="emerald"
              />
              <FlowRow
                label="Change (you)"
                detail="remainder of your note"
                active={amountNum > 0}
                tone="indigo"
              />
            </div>

            <div className="h-px bg-[var(--border-subtle)]" />

            <div className="space-y-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
              <p>
                <span className="text-[var(--text-secondary)]">No amounts</span> or{" "}
                <span className="text-[var(--text-secondary)]">addresses</span> appear
                on-chain — only two new commitments.
              </p>
              <p>
                <span className="text-[var(--text-secondary)]">Share</span> the recipient
                note over any channel. They withdraw it to any wallet, any time.
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

function FlowRow({
  label,
  detail,
  active,
  tone,
}: {
  label: string;
  detail: string;
  active: boolean;
  tone: "emerald" | "indigo" | "muted";
}) {
  const color =
    tone === "emerald"
      ? "#34d399"
      : tone === "indigo"
      ? "#818cf8"
      : "#9ca3af";
  return (
    <div className="flex items-start gap-2.5 py-1">
      <span
        className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
        style={{ backgroundColor: active ? color : "var(--border)" }}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-[12px] leading-tight ${
            active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
          }`}
        >
          {label}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
          {detail}
        </p>
      </div>
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return (
    <div className="ml-[3px] my-0.5 h-2 border-l border-dashed"
      style={{ borderColor: active ? "#818cf8" : "var(--border)" }}
    />
  );
}

function NoteCard({
  label,
  value,
  tone,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  tone: "emerald" | "indigo";
  copied: boolean;
  onCopy: () => void;
}) {
  const border = tone === "emerald" ? "border-emerald-400/30" : "border-[#6366f1]/30";
  const labelColor = tone === "emerald" ? "text-emerald-400" : "text-[#818cf8]";
  return (
    <div className={`bg-[var(--bg)] border ${border} rounded-lg p-3 space-y-2`}>
      <p className={`text-[12px] font-medium ${labelColor}`}>{label}</p>
      <div className="bg-black/30 rounded p-2 font-mono text-[11px] break-all text-[var(--text-primary)]">
        {value}
      </div>
      <button
        onClick={onCopy}
        className="w-full py-1.5 rounded text-[12px] border border-[var(--border)] hover:border-[#6366f1]/50 transition-colors text-[var(--text-secondary)]"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
