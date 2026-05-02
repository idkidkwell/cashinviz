"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ProofAttribute {
  id: string;
  title: string;
  description: string;
  proofType: string;
  hasInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

interface ActiveProof {
  id: string;
  type: string;
  generated: string;
  expires: string;
  status: "Active" | "Expired" | "Revoked";
}

interface SupportedDApp {
  name: string;
  category: string;
}

type ProofState = "idle" | "generating" | "ready";

const PROOF_ATTRIBUTES: ProofAttribute[] = [
  {
    id: "human",
    title: "I am human",
    description: "Prove you are not a bot",
    proofType: "Sybil resistance",
  },
  {
    id: "balance",
    title: "I own > X ETH",
    description: "Prove a balance threshold without exact amount",
    proofType: "Balance threshold",
    hasInput: true,
    inputLabel: "ETH",
    inputPlaceholder: "10",
  },
  {
    id: "age",
    title: "I am over 18",
    description: "Prove age without DOB",
    proofType: "Age verification",
  },
  {
    id: "clean",
    title: "My funds are clean",
    description: "Prove funds are not on any sanctions list",
    proofType: "OFAC compliance",
  },
  {
    id: "governance",
    title: "I hold governance tokens",
    description: "Prove token ownership without wallet address",
    proofType: "Token ownership",
  },
  {
    id: "voter",
    title: "Unique voter",
    description: "Prove you haven't already voted",
    proofType: "One-person-one-vote",
  },
  {
    id: "mixer",
    title: "Mixer history > X",
    description: "Prove privacy reputation via usage",
    proofType: "Privacy reputation",
    hasInput: true,
    inputLabel: "Tx count",
    inputPlaceholder: "50",
  },
  {
    id: "jurisdiction",
    title: "I reside in [country]",
    description: "Prove jurisdiction without exact location",
    proofType: "Jurisdiction",
    hasInput: true,
    inputLabel: "Country",
    inputPlaceholder: "Switzerland",
  },
];

const INITIAL_ACTIVE_PROOFS: ActiveProof[] = [
  { id: "ap1", type: "Sybil resistance", generated: "2h ago", expires: "29d", status: "Active" },
  { id: "ap2", type: "Age verification", generated: "5d ago", expires: "25d", status: "Active" },
  { id: "ap3", type: "OFAC compliance", generated: "12d ago", expires: "18d", status: "Active" },
];

const SUPPORTED_DAPPS: SupportedDApp[] = [
  { name: "Uniswap", category: "DEX" },
  { name: "Aave", category: "Lending" },
  { name: "OpenSea", category: "NFT" },
  { name: "Snapshot", category: "Governance" },
  { name: "ENS", category: "Identity" },
  { name: "Safe", category: "Multisig" },
];

function GeometricAvatar() {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" className="rounded-lg">
      <rect width="64" height="64" fill="#0a0a0f" />
      <polygon points="32,4 60,20 60,44 32,60 4,44 4,20" fill="none" stroke="#818cf8" strokeWidth="1.5" opacity="0.5" />
      <polygon points="32,12 52,24 52,40 32,52 12,40 12,24" fill="none" stroke="#818cf8" strokeWidth="1" opacity="0.35" />
      <polygon points="32,20 44,28 44,36 32,44 20,36 20,28" fill="#6366f1" fillOpacity="0.18" stroke="#818cf8" strokeWidth="1" opacity="0.8" />
      <circle cx="32" cy="32" r="3.5" fill="#818cf8" opacity="0.9" />
    </svg>
  );
}

export function ZKIdentity() {
  const [proofStates, setProofStates] = useState<Record<string, ProofState>>({});
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [activeProofs, setActiveProofs] = useState<ActiveProof[]>(INITIAL_ACTIVE_PROOFS);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const genTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      genTimersRef.current.forEach((t) => clearTimeout(t));
      genTimersRef.current.clear();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const generateProof = useCallback((id: string) => {
    const existing = genTimersRef.current.get(id);
    if (existing) clearTimeout(existing);
    setProofStates((prev) => ({ ...prev, [id]: "generating" }));
    const t = setTimeout(() => {
      setProofStates((prev) => ({ ...prev, [id]: "ready" }));
      const attr = PROOF_ATTRIBUTES.find((a) => a.id === id);
      if (attr) {
        setActiveProofs((prev) => [
          {
            id: `ap-${Date.now()}`,
            type: attr.proofType,
            generated: "Just now",
            expires: "30d",
            status: "Active",
          },
          ...prev,
        ]);
      }
      genTimersRef.current.delete(id);
    }, 2000);
    genTimersRef.current.set(id, t);
  }, []);

  const revokeProof = useCallback((proofId: string) => {
    setActiveProofs((prev) =>
      prev.map((p) => (p.id === proofId ? { ...p, status: "Revoked" as const } : p))
    );
  }, []);

  const handleCopySnippet = useCallback(() => {
    navigator.clipboard?.writeText('<button data-zkid="connect">Sign in Privately</button>');
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setCopiedSnippet(true);
    copyTimerRef.current = setTimeout(() => {
      setCopiedSnippet(false);
      copyTimerRef.current = null;
    }, 2000);
  }, []);

  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Prove attributes about yourself with zero-knowledge proofs. No KYC, no data
        exposure — portable across every dApp.
      </p>

      {/* ── Identity card ─────────────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">
          Your identity
        </p>
        <div className="flex items-start gap-4">
          <GeometricAvatar />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[13px] text-[var(--text-primary)]">
                zkid-7f3a2c…8b91
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 text-[10px] font-medium border border-emerald-400/25">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                Active
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] flex-wrap">
              <span>5 verified proofs</span>
              <span className="text-[var(--border)]">·</span>
              <span>
                Trust:{" "}
                <span className="text-emerald-400 font-medium">94/100</span>
              </span>
              <span className="text-[var(--border)]">·</span>
              <span>47 days old</span>
            </div>
            <div className="w-full bg-[var(--bg)] rounded-full h-1">
              <div
                className="bg-emerald-400 h-1 rounded-full transition-all"
                style={{ width: "94%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Create proof ──────────────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">
          Create proof
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PROOF_ATTRIBUTES.map((attr) => {
            const state = proofStates[attr.id] || "idle";
            return (
              <div
                key={attr.id}
                className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 flex flex-col gap-2 hover:border-[#6366f1]/30 transition-colors"
              >
                <div>
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">{attr.title}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                    {attr.description}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-[0.06em]">
                  {attr.proofType}
                </span>
                {attr.hasInput && state === "idle" && (
                  <input
                    type="text"
                    placeholder={attr.inputPlaceholder}
                    value={inputValues[attr.id] || ""}
                    onChange={(e) =>
                      setInputValues((prev) => ({ ...prev, [attr.id]: e.target.value }))
                    }
                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded px-2 py-1.5 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#6366f1]"
                  />
                )}
                <div className="mt-auto">
                  {state === "idle" && (
                    <button
                      onClick={() => generateProof(attr.id)}
                      className="w-full px-3 py-1.5 bg-[#6366f1] text-white text-[11px] font-medium rounded hover:bg-[#6366f1]/85 transition-colors"
                    >
                      Generate
                    </button>
                  )}
                  {state === "generating" && (
                    <div className="w-full text-center py-1.5">
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-[#818cf8]">
                        <div className="w-3 h-3 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
                        Generating…
                      </div>
                    </div>
                  )}
                  {state === "ready" && (
                    <div className="space-y-1.5">
                      <div className="text-center text-[11px] text-emerald-400 font-medium py-0.5">
                        Ready ✓
                      </div>
                      <div className="flex gap-1">
                        <button className="flex-1 px-2 py-1 bg-emerald-400/10 text-emerald-400 text-[10px] font-medium rounded border border-emerald-400/25 hover:bg-emerald-400/20 transition-colors">
                          Share
                        </button>
                        <button className="flex-1 px-2 py-1 bg-emerald-400/10 text-emerald-400 text-[10px] font-medium rounded border border-emerald-400/25 hover:bg-emerald-400/20 transition-colors">
                          Export
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Active proofs ─────────────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">
          Active proofs
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-[11px]">
                <th className="text-left py-2 pr-4 font-medium">Type</th>
                <th className="text-left py-2 pr-4 font-medium">Generated</th>
                <th className="text-left py-2 pr-4 font-medium">Expires</th>
                <th className="text-left py-2 pr-4 font-medium">Status</th>
                <th className="text-right py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeProofs.map((proof) => (
                <tr key={proof.id} className="border-b border-[var(--border-subtle)]/60 last:border-0">
                  <td className="py-2.5 pr-4 text-[var(--text-primary)] font-medium">{proof.type}</td>
                  <td className="py-2.5 pr-4 text-[var(--text-muted)]">{proof.generated}</td>
                  <td className="py-2.5 pr-4 text-[var(--text-muted)] tabular-nums">{proof.expires}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        proof.status === "Active"
                          ? "bg-emerald-400/10 text-emerald-400"
                          : proof.status === "Revoked"
                            ? "bg-mixer-red/10 text-mixer-red"
                            : "bg-[var(--bg)] text-[var(--text-muted)]"
                      }`}
                    >
                      <span
                        className={`w-1 h-1 rounded-full ${
                          proof.status === "Active"
                            ? "bg-emerald-400"
                            : proof.status === "Revoked"
                              ? "bg-mixer-red"
                              : "bg-[var(--text-muted)]"
                        }`}
                      />
                      {proof.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        disabled={proof.status !== "Active"}
                        className="px-2 py-0.5 text-[10px] text-[var(--text-secondary)] border border-[var(--border)] rounded hover:text-[#6366f1] hover:border-[#6366f1]/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Share
                      </button>
                      <button
                        onClick={() => revokeProof(proof.id)}
                        disabled={proof.status !== "Active"}
                        className="px-2 py-0.5 text-[10px] text-[var(--text-secondary)] border border-[var(--border)] rounded hover:text-mixer-red hover:border-mixer-red/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Integration ──────────────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">
          Use your ZK identity
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          {SUPPORTED_DAPPS.map((dapp) => (
            <div
              key={dapp.name}
              className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-center hover:border-[#6366f1]/30 transition-colors"
            >
              <p className="text-[12px] text-[var(--text-primary)] font-medium">{dapp.name}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{dapp.category}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <button className="btn-primary px-4 py-2 text-[13px] font-semibold">
            Sign in with ZK-ID
          </button>
          <span className="text-[11px] text-[var(--text-muted)]">
            One click. Zero data shared. Full verification.
          </span>
        </div>
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-[0.06em]">
              Integration snippet
            </span>
            <button
              onClick={handleCopySnippet}
              className="text-[10px] text-[var(--text-secondary)] hover:text-[#6366f1] transition-colors"
            >
              {copiedSnippet ? "Copied!" : "Copy"}
            </button>
          </div>
          <code className="text-[12px] text-[#818cf8] font-mono break-all">
            {'<button data-zkid="connect">Sign in Privately</button>'}
          </code>
        </div>
      </div>

      <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-xl p-4 flex items-start gap-3">
        <svg
          className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <div>
          <p className="text-[12px] font-medium text-emerald-400 mb-0.5">Privacy guarantee</p>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Zero data stored. Proofs are generated client-side — only the mathematical proof
            is shared, never the underlying data.
          </p>
        </div>
      </div>
    </div>
  );
}
