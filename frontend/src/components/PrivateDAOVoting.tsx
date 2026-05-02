"use client";

import { useState } from "react";

const DAOS = [
  "Uniswap",
  "Aave",
  "Compound",
  "ENS",
  "Arbitrum DAO",
  "Lido",
] as const;
type DAO = (typeof DAOS)[number];

interface Proposal {
  id: string;
  tag: string;
  title: string;
  endsIn: string;
  forPct: number;
  againstPct: number;
  status: "Active" | "Closed";
}

const PROPOSALS: Proposal[] = [
  {
    id: "1",
    tag: "UNI-42",
    title: "Increase Treasury Diversification",
    endsIn: "2d 14h",
    forPct: 62,
    againstPct: 38,
    status: "Active",
  },
  {
    id: "2",
    tag: "AAVE-18",
    title: "Deploy on zkSync Era",
    endsIn: "5d 3h",
    forPct: 81,
    againstPct: 19,
    status: "Active",
  },
  {
    id: "3",
    tag: "ENS-7",
    title: "Reduce Registration Fees",
    endsIn: "Ended",
    forPct: 55,
    againstPct: 45,
    status: "Closed",
  },
];

/**
 * Private DAO Voting Panel — cast governance votes anonymously.
 * A ZK proof shows you hold the required tokens without revealing your address.
 */
export function PrivateDAOVoting() {
  const [selectedDAO, setSelectedDAO] = useState<DAO>("Uniswap");
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [vote, setVote] = useState<"for" | "against" | "abstain" | null>(null);
  const [generatingProof, setGeneratingProof] = useState(false);
  const [proofGenerated, setProofGenerated] = useState(false);

  function resetFlow() {
    setVote(null);
    setProofGenerated(false);
  }

  function handleGenerateBallot() {
    setGeneratingProof(true);
    setTimeout(() => {
      setGeneratingProof(false);
      setProofGenerated(true);
    }, 2000);
  }

  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Vote on governance proposals without revealing your wallet. A ZK proof verifies
        you hold the required tokens — nothing else is disclosed.
      </p>

      <div className="grid md:grid-cols-[1fr_280px] gap-5">
        {/* ── LEFT: Proposal picker + voting ────────────── */}
        <div className="space-y-4 min-w-0">
          {/* DAO selector */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1.5">
              DAO
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DAOS.map((dao) => (
                <button
                  key={dao}
                  onClick={() => {
                    setSelectedDAO(dao);
                    setSelectedProposal(null);
                    resetFlow();
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                    selectedDAO === dao
                      ? "bg-[#6366f1] text-white"
                      : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[#6366f1]/50"
                  }`}
                >
                  {dao}
                </button>
              ))}
            </div>
          </div>

          {/* Proposals */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1.5">
              Active proposals
            </label>
            <div className="space-y-2">
              {PROPOSALS.map((proposal) => {
                const isSelected = selectedProposal?.id === proposal.id;
                const isClosed = proposal.status === "Closed";
                return (
                  <button
                    key={proposal.id}
                    onClick={() => {
                      if (!isClosed) {
                        setSelectedProposal(proposal);
                        resetFlow();
                      }
                    }}
                    disabled={isClosed}
                    className={`w-full text-left bg-[var(--card)] border rounded-xl p-3.5 space-y-2.5 transition-all ${
                      isSelected
                        ? "border-[#6366f1]"
                        : "border-[var(--border-subtle)] hover:border-[var(--border)]"
                    } ${isClosed ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-mono text-[#818cf8] leading-none mb-1">
                          {proposal.tag}
                        </p>
                        <p className="text-[13px] text-[var(--text-primary)] font-medium leading-snug">
                          {proposal.title}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${
                          isClosed
                            ? "bg-[var(--bg)] text-[var(--text-muted)]"
                            : "bg-emerald-400/10 text-emerald-400"
                        }`}
                      >
                        {proposal.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--text-muted)]">
                      {isClosed ? "Ended" : `Ends in ${proposal.endsIn}`}
                    </p>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-[var(--bg)] rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-400"
                          style={{ width: `${proposal.forPct}%` }}
                        />
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${proposal.againstPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] tabular-nums">
                        <span className="text-emerald-400">For {proposal.forPct}%</span>
                        <span className="text-red-400">
                          Against {proposal.againstPct}%
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voting card */}
          {selectedProposal && (
            <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
                  Cast your vote
                </p>
                <p className="text-[11px] font-mono text-[#818cf8]">
                  {selectedProposal.tag}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <VoteButton
                  label="For"
                  active={vote === "for"}
                  activeBg="bg-emerald-500 text-white border-emerald-500"
                  idleColor="text-emerald-400 hover:border-emerald-400/50"
                  onClick={() => setVote("for")}
                />
                <VoteButton
                  label="Against"
                  active={vote === "against"}
                  activeBg="bg-red-500 text-white border-red-500"
                  idleColor="text-red-400 hover:border-red-400/50"
                  onClick={() => setVote("against")}
                />
                <VoteButton
                  label="Abstain"
                  active={vote === "abstain"}
                  activeBg="bg-[var(--text-secondary)] text-white border-[var(--text-secondary)]"
                  idleColor="text-[var(--text-secondary)] hover:border-[var(--border)]"
                  onClick={() => setVote("abstain")}
                />
              </div>

              <button
                onClick={handleGenerateBallot}
                disabled={!vote || generatingProof || proofGenerated}
                className="btn-primary w-full py-3 text-[13px] font-semibold"
              >
                {generatingProof
                  ? "Generating ZK ballot…"
                  : proofGenerated
                  ? "Ballot submitted"
                  : "Generate ZK ballot"}
              </button>

              {proofGenerated && (
                <div className="bg-emerald-400/5 border border-emerald-400/30 rounded-lg px-3 py-2.5 flex items-start gap-2.5">
                  <span className="relative flex h-2 w-2 mt-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  <p className="text-[12px] text-emerald-400 leading-relaxed">
                    ZK proof verified. Your vote is anonymous and on-chain.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Voting power + privacy ─────────────── */}
        <aside className="md:sticky md:top-4 self-start">
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
              Your voting power
            </p>

            <div>
              <p className="text-[22px] font-semibold text-emerald-400 tabular-nums leading-none">
                42,500
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                {selectedDAO} governance tokens (verified via ZK)
              </p>
            </div>

            <div className="h-px bg-[var(--border-subtle)]" />

            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
              How it works
            </p>
            <div className="space-y-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
              <p>
                <span className="text-[var(--text-secondary)]">1.</span> A ZK proof
                attests you hold the required tokens — not which address holds them.
              </p>
              <p>
                <span className="text-[var(--text-secondary)]">2.</span> The DAO
                contract counts your weight without ever learning your identity.
              </p>
              <p>
                <span className="text-[var(--text-secondary)]">3.</span> Nullifiers
                prevent double voting while keeping ballots unlinkable.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─── Tiny helpers ─────────────────────────────────── */

function VoteButton({
  label,
  active,
  activeBg,
  idleColor,
  onClick,
}: {
  label: string;
  active: boolean;
  activeBg: string;
  idleColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-2.5 rounded-lg text-[13px] font-medium border transition-colors ${
        active
          ? activeBg
          : `bg-[var(--bg)] border-[var(--border)] ${idleColor}`
      }`}
    >
      {label}
    </button>
  );
}
