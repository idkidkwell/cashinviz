"use client";

import { useEffect, useState } from "react";

interface Activity {
  id: string;
  type: "deposit" | "withdraw" | "transfer" | "swap" | "stealth";
  chain: string;
  amount: string;
  token: string;
  timestamp: number;
}

const CHAINS = ["Ethereum", "Arbitrum", "Optimism", "Base", "Polygon", "BSC", "Avalanche", "Gnosis"];
const TOKENS = ["ETH", "USDC", "USDT", "DAI", "WBTC", "BNB", "MATIC", "AVAX"];
const TYPES: Activity["type"][] = ["deposit", "withdraw", "transfer", "swap", "stealth"];

const TYPE_CONFIG = {
  deposit: { label: "Deposit", color: "text-emerald-400", icon: "+" },
  withdraw: { label: "Withdraw", color: "text-[#6366f1]", icon: "-" },
  transfer: { label: "Shielded Transfer", color: "text-purple-400", icon: "~" },
  swap: { label: "Private Swap", color: "text-blue-400", icon: "S" },
  stealth: { label: "Stealth Payment", color: "text-pink-400", icon: "*" },
};

function randomActivity(): Activity {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  const chain = CHAINS[Math.floor(Math.random() * CHAINS.length)];
  const token = TOKENS[Math.floor(Math.random() * TOKENS.length)];
  const amounts = ["0.1", "0.5", "1", "2", "5", "10", "50", "100", "500", "1000"];
  const amount = amounts[Math.floor(Math.random() * amounts.length)];

  return {
    id: Math.random().toString(36).slice(2, 10),
    type,
    chain,
    amount,
    token,
    timestamp: Date.now(),
  };
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 1000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  return `${Math.floor(diff / 60_000)}m ago`;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const initial: Activity[] = [];
    for (let i = 0; i < 5; i++) {
      const a = randomActivity();
      a.timestamp = Date.now() - (i + 1) * 15_000;
      initial.push(a);
    }
    setActivities(initial);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivities((prev) => {
        const newActivity = randomActivity();
        return [newActivity, ...prev.slice(0, 7)];
      });
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">Live Network Activity</h3>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border-subtle)]">
        {activities.map((activity) => {
          const config = TYPE_CONFIG[activity.type];
          return (
            <div
              key={activity.id}
              className="activity-entry flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--card-hover)] transition-colors"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  activity.type === "deposit"
                    ? "bg-emerald-400/10 text-emerald-400"
                    : activity.type === "withdraw"
                    ? "bg-[#6366f1]/10 text-[#6366f1]"
                    : activity.type === "transfer"
                    ? "bg-purple-500/10 text-purple-400"
                    : activity.type === "swap"
                    ? "bg-blue-500/10 text-blue-400"
                    : "bg-pink-500/10 text-pink-400"
                }`}
              >
                {config.icon}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] truncate">
                  <span className={config.color}>{config.label}</span>
                  <span className="text-[var(--text-muted)]"> on </span>
                  <span className="text-[var(--text-secondary)]">{activity.chain}</span>
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {activity.amount} {activity.token}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{timeAgo(activity.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
