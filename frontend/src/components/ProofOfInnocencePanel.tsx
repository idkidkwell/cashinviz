"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";

/**
 * Proof of Innocence Panel — Prove your funds are clean without revealing identity.
 * ZK proof that deposit source is NOT in sanctioned addresses set.
 */
export function ProofOfInnocencePanel() {
  const { address } = useAccount();
  const [isGenerating, setIsGenerating] = useState(false);
  const [proofStatus, setProofStatus] = useState<"none" | "valid" | "expired">("none");
  const [expiryDays, setExpiryDays] = useState(0);

  // Mock compliance status — in production, read from ProofOfInnocence.isInnocent()
  const complianceStats = {
    totalProofsGenerated: "2,847",
    sanctionedSetLastUpdated: "3 hours ago",
    sanctionedAddressCount: "1,247",
  };

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleGenerateProof() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsGenerating(true);
    // TODO: Generate ZK proof of innocence via Noir circuit
    // Proves: user's deposit address NOT in sanctioned Merkle tree
    timerRef.current = setTimeout(() => {
      setProofStatus("valid");
      setExpiryDays(30);
      setIsGenerating(false);
      timerRef.current = null;
    }, 4000);
  }

  return (
    <div className="space-y-5">
      {/* Status banner */}
      {proofStatus === "valid" && (
        <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-lg p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-emerald-400 text-sm">&#10003;</span>
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-400">Compliance Verified</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Your proof of innocence is valid for {expiryDays} more days.
              DeFi protocols can verify your compliance without knowing your identity.
            </p>
          </div>
        </div>
      )}

      {proofStatus === "expired" && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-yellow-500 text-sm">!</span>
          </div>
          <div>
            <p className="text-sm font-medium text-yellow-500">Proof Expired</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Your proof of innocence has expired. Generate a new one to maintain compliance status.
            </p>
          </div>
        </div>
      )}

      {/* Explainer */}
      <div className="bg-[#6366f1]/5 border border-[#6366f1]/20 rounded-lg p-3">
        <p className="text-xs text-[#6366f1]">
          Prove your funds are NOT from sanctioned sources — without revealing your identity
          or transaction history. Uses zero-knowledge proofs to verify your deposit
          address is not in the OFAC/Chainalysis sanctioned set.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 text-center">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Proofs Generated</p>
          <p className="text-sm font-semibold text-white">{complianceStats.totalProofsGenerated}</p>
        </div>
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 text-center">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Sanctions Updated</p>
          <p className="text-sm font-semibold text-white">{complianceStats.sanctionedSetLastUpdated}</p>
        </div>
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 text-center">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Addresses Blocked</p>
          <p className="text-sm font-semibold text-white">{complianceStats.sanctionedAddressCount}</p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-[var(--bg)] rounded-lg p-3 space-y-2">
        <p className="text-xs font-medium text-[var(--text-primary)]">What the ZK proof verifies</p>
        <ol className="text-xs text-[var(--text-secondary)] space-y-1.5 list-decimal list-inside">
          <li>You have a valid deposit in the mixer (commitment exists in Merkle tree)</li>
          <li>Your depositing address is NOT in the sanctioned set (Merkle exclusion proof)</li>
          <li>The proof is bound to your address (prevents proof sharing)</li>
        </ol>
        <p className="text-xs text-[var(--text-muted)] mt-2 italic">
          Zero information about your identity or deposit is revealed. Only the binary
          result: innocent or not.
        </p>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerateProof}
        disabled={isGenerating || proofStatus === "valid"}
        className="w-full py-3 rounded-xl font-semibold text-white bg-[#6366f1] hover:bg-[#6366f1]/80 disabled:opacity-50 transition-all"
      >
        {isGenerating
          ? "Generating ZK proof... (this may take a moment)"
          : proofStatus === "valid"
          ? "Proof Active — Valid for " + expiryDays + " days"
          : "Generate Proof of Innocence"}
      </button>

      {/* Benefits */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3">
          <p className="text-xs font-medium text-emerald-400 mb-1">For Users</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Access DeFi protocols that require compliance, without sacrificing privacy.
          </p>
        </div>
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3">
          <p className="text-xs font-medium text-[#6366f1] mb-1">For Protocols</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Call isInnocent(address) to verify compliance. No KYC needed.
          </p>
        </div>
      </div>
    </div>
  );
}
