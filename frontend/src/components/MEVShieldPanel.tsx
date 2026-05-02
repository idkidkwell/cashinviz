"use client";

import { useEffect, useRef, useState } from "react";

export function MEVShieldPanel() {
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitId, setCommitId] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  async function handleCommit() {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    setIsCommitting(true);
    commitTimerRef.current = setTimeout(() => {
      setCommitId("0xc0mm1t..." + Math.random().toString(36).slice(2, 8));
      setIsCommitting(false);
      commitTimerRef.current = null;
    }, 2000);
  }

  async function handleReveal() {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    setIsRevealing(true);
    revealTimerRef.current = setTimeout(() => {
      setRevealed(true);
      setIsRevealing(false);
      revealTimerRef.current = null;
    }, 2000);
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#6366f1]/5 border border-[#6366f1]/20 rounded-lg p-3">
        <p className="text-xs text-[#6366f1]">
          MEV Shield protects your withdrawals from front-running, sandwich attacks,
          and transaction ordering exploits. Two-phase commit-reveal ensures bots
          can&apos;t see your withdrawal until it&apos;s too late.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("auto")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "auto"
              ? "bg-[#6366f1] text-white"
              : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)]"
          }`}
        >
          Auto (Recommended)
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "manual"
              ? "bg-[#6366f1] text-white"
              : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)]"
          }`}
        >
          Manual Commit-Reveal
        </button>
      </div>

      {mode === "auto" ? (
        <div className="space-y-3">
          <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <p className="text-sm font-medium text-emerald-400">MEV Shield Active</p>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              All withdrawals are automatically routed through the commit-reveal scheme
              and submitted via Flashbots Protect private mempool.
            </p>
          </div>

          <div className="bg-[var(--bg)] rounded-lg p-3 space-y-2 text-xs">
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Submission method</span>
              <span className="text-white">Flashbots Protect</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Commit-reveal delay</span>
              <span className="text-white">2 blocks (~24s)</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>MEV attacks blocked</span>
              <span className="text-emerald-400">147 today</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Private mempool</span>
              <span className="text-emerald-400">Enabled</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Step 1: Commit */}
          <div className={`bg-[var(--bg)] border rounded-lg p-4 ${
            !commitId ? "border-[#6366f1]/30" : "border-[var(--border)]"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                !commitId ? "bg-[#6366f1] text-white" : "bg-emerald-400/20 text-emerald-400"
              }`}>
                {commitId ? "\u2713" : "1"}
              </div>
              <p className="text-sm font-medium text-white">Commit (Encrypted Intent)</p>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-3 pl-8">
              Submit an encrypted hash of your withdrawal. MEV bots see nothing.
            </p>
            {commitId ? (
              <p className="text-xs font-mono text-emerald-400 pl-8">{commitId}</p>
            ) : (
              <button
                onClick={handleCommit}
                disabled={isCommitting}
                className="ml-8 px-4 py-2 rounded-lg text-xs font-medium text-white bg-[#6366f1] hover:bg-[#6366f1]/80 disabled:opacity-50 transition-all"
              >
                {isCommitting ? "Committing..." : "Submit Commit"}
              </button>
            )}
          </div>

          {/* Step 2: Wait */}
          <div className={`bg-[var(--bg)] border rounded-lg p-4 ${
            commitId && !revealed ? "border-[#6366f1]/30" : "border-[var(--border)]"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                commitId && !revealed ? "bg-[#6366f1] text-white" :
                revealed ? "bg-emerald-400/20 text-emerald-400" : "bg-[var(--border)] text-[var(--text-secondary)]"
              }`}>
                {revealed ? "\u2713" : "2"}
              </div>
              <p className="text-sm font-medium text-white">Reveal (After 2+ blocks)</p>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-3 pl-8">
              Reveal the actual withdrawal data. By now it&apos;s too late for MEV bots.
            </p>
            {commitId && !revealed && (
              <button
                onClick={handleReveal}
                disabled={isRevealing}
                className="ml-8 px-4 py-2 rounded-lg text-xs font-medium text-white bg-[#6366f1] hover:bg-[#6366f1]/80 disabled:opacity-50 transition-all"
              >
                {isRevealing ? "Revealing..." : "Reveal & Withdraw"}
              </button>
            )}
            {revealed && (
              <p className="text-xs font-mono text-emerald-400 pl-8">Withdrawal executed!</p>
            )}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-[var(--bg)] rounded-lg p-3 space-y-2">
        <p className="text-xs font-medium text-[var(--text-primary)]">Protection against</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="text-emerald-400">&#10003;</span> Front-running
          </div>
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="text-emerald-400">&#10003;</span> Sandwich attacks
          </div>
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="text-emerald-400">&#10003;</span> Transaction ordering
          </div>
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="text-emerald-400">&#10003;</span> Mempool sniping
          </div>
        </div>
      </div>
    </div>
  );
}
