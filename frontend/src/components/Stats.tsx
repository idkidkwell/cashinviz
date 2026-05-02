"use client";

import { useAccount } from "wagmi";
import { getNativeToken } from "@/lib/tokens";

export function Stats() {
  const { chain } = useAccount();
  const nativeToken = getNativeToken(chain?.id);

  // TODO: Read real stats from deployed ShieldedPool contract
  // - depositCount(token) for anonymity set
  // - contract.balance for TVL
  // - nextIndex for total notes

  return (
    <div className="w-full max-w-lg grid grid-cols-4 gap-2 mb-6">
      <StatCard label="Deposits" value="--" />
      <StatCard label="Anonymity Set" value="--" />
      <StatCard label="TVL" value={`-- ${nativeToken.symbol}`} />
      <StatCard label="Chains" value="15" />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glow-card bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
      <p className="text-base font-semibold text-white stat-value">{value}</p>
      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{label}</p>
    </div>
  );
}
