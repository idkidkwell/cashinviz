"use client";

import { useState } from "react";

interface RelayerInfo {
  address: string;
  url: string;
  fee: string;
  stake: string;
  reputation: number;
  totalRelayed: number;
  uptime: string;
}

/**
 * Relayer Picker — Browse and select from decentralized relayers.
 * Compare fees, reputation, stake, and uptime.
 */
export function RelayerPicker({
  onSelect,
}: {
  onSelect?: (relayer: RelayerInfo) => void;
}) {
  const [sortBy, setSortBy] = useState<"fee" | "reputation" | "stake">("reputation");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Mock relayer data — in production, read from RelayerRegistry.getActiveRelayers()
  const relayers: RelayerInfo[] = [
    {
      address: "0x1234...abcd",
      url: "https://relay1.privacymixer.io",
      fee: "0.001 ETH",
      stake: "10 ETH",
      reputation: 9850,
      totalRelayed: 985,
      uptime: "99.9%",
    },
    {
      address: "0x5678...efgh",
      url: "https://relay2.privacymixer.io",
      fee: "0.0008 ETH",
      stake: "5 ETH",
      reputation: 7200,
      totalRelayed: 720,
      uptime: "99.5%",
    },
    {
      address: "0x9abc...ijkl",
      url: "https://relay-cheap.example.com",
      fee: "0.0005 ETH",
      stake: "1 ETH",
      reputation: 3400,
      totalRelayed: 340,
      uptime: "97.2%",
    },
    {
      address: "0xdef0...mnop",
      url: "https://fastrelayer.xyz",
      fee: "0.0012 ETH",
      stake: "25 ETH",
      reputation: 12500,
      totalRelayed: 1250,
      uptime: "99.99%",
    },
    {
      address: "0x4567...qrst",
      url: "https://community-relay.eth.limo",
      fee: "0.0006 ETH",
      stake: "3 ETH",
      reputation: 5600,
      totalRelayed: 560,
      uptime: "98.8%",
    },
  ];

  const sorted = [...relayers].sort((a, b) => {
    if (sortBy === "fee") return parseFloat(a.fee) - parseFloat(b.fee);
    if (sortBy === "reputation") return b.reputation - a.reputation;
    return parseFloat(b.stake) - parseFloat(a.stake);
  });

  function handleSelect(idx: number) {
    setSelectedIdx(idx);
    onSelect?.(sorted[idx]);
  }

  function getReputationColor(rep: number) {
    if (rep >= 10000) return "text-emerald-400";
    if (rep >= 5000) return "text-[#6366f1]";
    if (rep >= 2000) return "text-yellow-500";
    return "text-[var(--text-secondary)]";
  }

  function getReputationLabel(rep: number) {
    if (rep >= 10000) return "Excellent";
    if (rep >= 5000) return "Good";
    if (rep >= 2000) return "Fair";
    return "New";
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#6366f1]/5 border border-[#6366f1]/20 rounded-lg p-3">
        <p className="text-xs text-[#6366f1]">
          Choose a decentralized relayer to submit your withdrawal. Relayers compete
          on fees and reputation. Higher stake = more skin in the game.
        </p>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[var(--text-secondary)]">Sort by:</span>
        {(["reputation", "fee", "stake"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-2.5 py-1 rounded transition-all ${
              sortBy === s
                ? "bg-[#6366f1] text-white"
                : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)]"
            }`}
          >
            {s === "fee" ? "Lowest Fee" : s === "reputation" ? "Reputation" : "Highest Stake"}
          </button>
        ))}
      </div>

      {/* Relayer list */}
      <div className="space-y-2">
        {sorted.map((r, i) => (
          <button
            key={r.address}
            onClick={() => handleSelect(i)}
            className={`w-full text-left bg-[var(--bg)] border rounded-lg p-3 transition-all ${
              selectedIdx === i
                ? "border-[#6366f1] bg-[#6366f1]/5"
                : "border-[var(--border)] hover:border-[#6366f1]/30"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-mono text-white">{r.address}</p>
                <p className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">{r.url}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{r.fee}</p>
                <p className="text-xs text-[var(--text-secondary)]">per relay</p>
              </div>
            </div>

            <div className="flex gap-4 text-xs">
              <div>
                <span className="text-[var(--text-secondary)]">Rep: </span>
                <span className={getReputationColor(r.reputation)}>
                  {r.reputation.toLocaleString()} ({getReputationLabel(r.reputation)})
                </span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Stake: </span>
                <span className="text-white">{r.stake}</span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Relayed: </span>
                <span className="text-white">{r.totalRelayed}</span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Uptime: </span>
                <span className="text-emerald-400">{r.uptime}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedIdx !== null && (
        <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-lg p-3">
          <p className="text-xs text-emerald-400">
            Selected: {sorted[selectedIdx].address} — Fee: {sorted[selectedIdx].fee}
          </p>
        </div>
      )}
    </div>
  );
}
