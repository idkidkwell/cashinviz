"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MixerABI } from "@/abi/Mixer";
import { deserializeNote, generateWithdrawProof, type DepositNote } from "@/lib/proof";

type ProofStatus = "idle" | "generating" | "ready" | "submitting" | "done" | "error";

// Display-only — map chainId to a human name for the detected-note pill
const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  42161: "Arbitrum",
  10: "Optimism",
  8453: "Base",
  137: "Polygon",
  56: "BNB Chain",
  43114: "Avalanche",
  100: "Gnosis",
  59144: "Linea",
};

function formatDenomination(denomWei: string): string {
  try {
    const ether = Number(BigInt(denomWei)) / 1e18;
    // Drop trailing zeros like 1.000 → 1
    return `${parseFloat(ether.toFixed(6))} ETH`;
  } catch {
    return `${denomWei} wei`;
  }
}

function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function WithdrawPanel() {
  const { isConnected } = useAccount();
  const [noteInput, setNoteInput] = useState("");
  const [recipient, setRecipient] = useState("");
  const [useRelayer, setUseRelayer] = useState(false);
  const [status, setStatus] = useState<ProofStatus>("idle");
  const [proofTime, setProofTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Derive parsed note — enables step 2 when valid
  const parsedNote = useMemo<DepositNote | null>(() => {
    if (!noteInput.trim()) return null;
    try {
      return deserializeNote(noteInput.trim());
    } catch {
      return null;
    }
  }, [noteInput]);

  const noteHasParseError = !!noteInput.trim() && !parsedNote;
  const recipientIsValid = /^0x[a-fA-F0-9]{40}$/.test(recipient);
  const isBusy = status === "generating" || isPending || isConfirming;

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim().startsWith("mixer-")) setNoteInput(text.trim());
    } catch {
      // clipboard permission denied — silently no-op, user can paste manually
    }
  }

  function clearNote() {
    setNoteInput("");
    setError(null);
    setStatus("idle");
  }

  async function handleWithdraw() {
    setError(null);
    if (!parsedNote) return setError("Paste a valid deposit note");
    if (!recipientIsValid) return setError("Enter a valid Ethereum address");

    try {
      setStatus("generating");
      const start = performance.now();

      // TODO: Fetch real Merkle root and path from contract
      const merkleRoot = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const merklePath = Array(20).fill(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );

      const proof = await generateWithdrawProof(
        parsedNote,
        merkleRoot,
        merklePath,
        recipient,
        "0x0000000000000000000000000000000000000000", // TODO: relayer address
        useRelayer ? BigInt("1000000000000000") : BigInt(0)
      );

      setProofTime(Math.round(performance.now() - start));
      setStatus("submitting");

      writeContract({
        // TODO: Replace with actual mixer address for this note's denomination
        address: "0x0000000000000000000000000000000000000000",
        abi: MixerABI,
        functionName: "withdraw",
        args: [
          `0x${Buffer.from(proof.proof).toString("hex")}` as `0x${string}`,
          proof.root as `0x${string}`,
          proof.nullifierHash as `0x${string}`,
          recipient as `0x${string}`,
          proof.relayer as `0x${string}`,
          proof.fee,
        ],
      });
    } catch (e: any) {
      setError(e.message || "Failed to generate proof");
      setStatus("error");
    }
  }

  const chainName = parsedNote ? (CHAIN_NAMES[parsedNote.chainId] ?? `Chain #${parsedNote.chainId}`) : null;

  return (
    <div className="max-w-[560px] mx-auto space-y-6">
      {/* ─── STEP 1 — Paste your note ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold transition-colors ${
              parsedNote ? "bg-[#6366f1] text-white" : "bg-[#6366f1]/10 text-[#6366f1]"
            }`}>
              {parsedNote ? "\u2713" : "1"}
            </span>
            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
              {parsedNote ? "Note" : "Paste your deposit note"}
            </p>
          </div>
          {parsedNote && (
            <button onClick={clearNote} className="text-[11px] text-[#6366f1] hover:underline">
              Change
            </button>
          )}
        </div>

        {parsedNote && chainName ? (
          /* Collapsed summary pill */
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/30">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[13px] font-semibold text-[#6366f1] shrink-0 tabular-nums">
                {formatDenomination(parsedNote.denomination)}
              </span>
              <span className="w-px h-3 bg-[var(--border)]" />
              <span className="text-[12px] text-[var(--text-secondary)] truncate">on {chainName}</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-3 tabular-nums">
              {formatRelativeTime(parsedNote.timestamp)}
            </span>
          </div>
        ) : (
          /* Empty / invalid — show input */
          <div>
            <div className="relative">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="mixer-1-1000000000000000000-a1b2c3…"
                autoFocus
                className={`w-full h-24 bg-[var(--card)] border rounded-xl p-3 pr-20 text-[12px] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none resize-none transition-colors ${
                  noteHasParseError
                    ? "border-mixer-red/50 focus:border-mixer-red"
                    : "border-[var(--border)] focus:border-[#6366f1]"
                }`}
              />
              <button
                onClick={handlePaste}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-[var(--bg)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)] hover:border-[#6366f1]/40 hover:text-[var(--text-primary)] transition-all"
              >
                Paste
              </button>
            </div>
            {noteHasParseError && (
              <p className="mt-1.5 text-[11px] text-mixer-red">Not a valid note format</p>
            )}
          </div>
        )}
      </div>

      {/* ─── STEP 2 — Destination, revealed when note is valid ─── */}
      {parsedNote && (
        <div className="animate-in space-y-5 pt-5 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#6366f1]/10 text-[#6366f1] text-[10px] font-semibold">2</span>
            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">Withdrawal</p>
          </div>

          {/* Recipient */}
          <div>
            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-2">Recipient address</p>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x…"
              spellCheck={false}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-[13px] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors"
            />
            <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
              Use a fresh address with no prior transactions for maximum privacy.
            </p>
          </div>

          {/* Relayer toggle — elevated as a toggle card */}
          <button
            onClick={() => setUseRelayer(!useRelayer)}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all ${
              useRelayer
                ? "bg-[#6366f1]/10 border-[#6366f1]/30"
                : "bg-[var(--card)] border-[var(--border)] hover:border-[#6366f1]/20"
            }`}
          >
            <div className="min-w-0 pr-3">
              <p className="text-[13px] font-medium text-[var(--text-primary)]">Use relayer</p>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mt-0.5">
                Hides your IP and pays the gas for you. Fee: 0.001 ETH.
              </p>
            </div>
            <span className={`relative shrink-0 w-10 h-5 rounded-full transition-colors ${
              useRelayer ? "bg-[#6366f1]" : "bg-[var(--border)]"
            }`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                useRelayer ? "translate-x-5" : "translate-x-0"
              }`} />
            </span>
          </button>

          {/* Proof progress / success / error */}
          {status === "generating" && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
              <div className="w-4 h-4 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] text-[var(--text-primary)]">Generating zero-knowledge proof…</p>
                <p className="text-[11px] text-[var(--text-muted)]">Runs entirely in your browser (WASM).</p>
              </div>
            </div>
          )}
          {status === "ready" && proofTime > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400/5 border border-emerald-400/20">
              <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
              <p className="text-[12px] text-emerald-400">Proof generated in {(proofTime / 1000).toFixed(1)}s</p>
            </div>
          )}
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-mixer-red/10 border border-mixer-red/30">
              <p className="text-[12px] text-mixer-red">{error}</p>
            </div>
          )}

          {/* Action */}
          {!isConnected && !useRelayer ? (
            <div className="space-y-2">
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={openConnectModal}
                    className="btn-primary w-full py-3.5 text-[14px] font-semibold"
                  >
                    Connect wallet to withdraw
                  </button>
                )}
              </ConnectButton.Custom>
              <button
                onClick={() => setUseRelayer(true)}
                className="w-full py-2.5 rounded-xl text-[12px] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[#6366f1]/30 transition-colors"
              >
                Or use a relayer to withdraw gas-free &rarr;
              </button>
            </div>
          ) : (
            <button
              onClick={handleWithdraw}
              disabled={!recipientIsValid || isBusy}
              className="btn-primary w-full py-3.5 text-[14px] font-semibold"
            >
              {status === "generating"
                ? "Generating proof…"
                : isPending
                ? "Confirm in wallet…"
                : isConfirming
                ? "Confirming on-chain…"
                : isSuccess
                ? "Withdrawn"
                : !recipientIsValid
                ? "Enter a recipient address"
                : `Withdraw ${formatDenomination(parsedNote.denomination)}`}
            </button>
          )}

          {/* Success state */}
          {isSuccess && txHash && (
            <div className="px-4 py-3 rounded-xl bg-emerald-400/5 border border-emerald-400/30 text-center">
              <p className="text-[13px] text-emerald-400 font-medium">Withdrawal successful</p>
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#6366f1] hover:underline mt-1 inline-block"
              >
                View on Etherscan &rarr;
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
