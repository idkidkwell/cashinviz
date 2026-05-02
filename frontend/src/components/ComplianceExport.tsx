"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ExportType = "tax" | "source" | "audit";

interface DisclosureFlags {
  depositAmounts: boolean;
  depositTimestamps: boolean;
  depositAddresses: boolean;
  withdrawalAmounts: boolean;
  withdrawalTimestamps: boolean;
  withdrawalAddresses: boolean;
  transactionHashes: boolean;
  netGainLoss: boolean;
}

const MOCK_TRANSACTIONS = [
  { date: "2024-03-15", type: "Deposit", token: "ETH", amount: "2.5000", status: "Confirmed" },
  { date: "2024-03-22", type: "Withdrawal", token: "ETH", amount: "1.2000", status: "Confirmed" },
  { date: "2024-04-01", type: "Deposit", token: "USDC", amount: "5,000.00", status: "Confirmed" },
  { date: "2024-04-10", type: "Withdrawal", token: "USDC", amount: "4,800.00", status: "Confirmed" },
  { date: "2024-05-05", type: "Deposit", token: "DAI", amount: "10,000.00", status: "Pending" },
  { date: "2024-05-12", type: "Withdrawal", token: "ETH", amount: "1.3000", status: "Confirmed" },
];

const REDACTED = "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588";

const EXPORT_TYPES: { key: ExportType; title: string; description: string }[] = [
  {
    key: "tax",
    title: "Tax report",
    description: "IRS/HMRC-compatible CSV with cost basis",
  },
  {
    key: "source",
    title: "Proof of source",
    description: "ZK proof funds came from a clean address",
  },
  {
    key: "audit",
    title: "Audit package",
    description: "Full compliance bundle for institutions",
  },
];

const DATE_PRESETS = [
  { label: "30d", from: "2024-05-01", to: "2024-05-31" },
  { label: "Q1", from: "2024-01-01", to: "2024-03-31" },
  { label: "Q2", from: "2024-04-01", to: "2024-06-30" },
  { label: "YTD", from: "2024-01-01", to: "2024-12-31" },
  { label: "All", from: "2023-01-01", to: "2024-12-31" },
];

const DISCLOSURE_ITEMS: { key: keyof DisclosureFlags; label: string; warning?: string }[] = [
  { key: "depositAmounts", label: "Deposit amounts" },
  { key: "depositTimestamps", label: "Deposit timestamps" },
  { key: "depositAddresses", label: "Deposit addresses", warning: "reveals wallet" },
  { key: "withdrawalAmounts", label: "Withdrawal amounts" },
  { key: "withdrawalTimestamps", label: "Withdrawal timestamps" },
  { key: "withdrawalAddresses", label: "Withdrawal addresses" },
  { key: "transactionHashes", label: "Transaction hashes", warning: "linkable" },
  { key: "netGainLoss", label: "Net gain/loss summary" },
];

export function ComplianceExport() {
  const [exportType, setExportType] = useState<ExportType>("tax");
  const [dateFrom, setDateFrom] = useState("2024-01-01");
  const [dateTo, setDateTo] = useState("2024-12-31");
  const [toast, setToast] = useState<string | null>(null);
  const [disclosure, setDisclosure] = useState<DisclosureFlags>({
    depositAmounts: true,
    depositTimestamps: true,
    depositAddresses: false,
    withdrawalAmounts: true,
    withdrawalTimestamps: true,
    withdrawalAddresses: false,
    transactionHashes: false,
    netGainLoss: true,
  });

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const checkedCount = useMemo(
    () => Object.values(disclosure).filter(Boolean).length,
    [disclosure]
  );
  const totalFields = Object.keys(disclosure).length;

  const privacyLevel = useMemo(() => {
    const ratio = checkedCount / totalFields;
    if (ratio <= 0.375) return { label: "Maximum privacy", color: "text-emerald-400", bg: "bg-emerald-400" };
    if (ratio <= 0.625) return { label: "Moderate disclosure", color: "text-amber-400", bg: "bg-amber-400" };
    if (ratio <= 0.875) return { label: "High disclosure", color: "text-orange-400", bg: "bg-orange-400" };
    return { label: "Full disclosure", color: "text-mixer-red", bg: "bg-mixer-red" };
  }, [checkedCount, totalFields]);

  function toggleDisclosure(key: keyof DisclosureFlags) {
    setDisclosure((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function applyPreset(from: string, to: string) {
    setDateFrom(from);
    setDateTo(to);
  }

  function showToast(message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3000);
  }

  function isFieldVisible(row: (typeof MOCK_TRANSACTIONS)[number], field: string): boolean {
    if (field === "amount") {
      return row.type === "Deposit" ? disclosure.depositAmounts : disclosure.withdrawalAmounts;
    }
    if (field === "date") {
      return row.type === "Deposit" ? disclosure.depositTimestamps : disclosure.withdrawalTimestamps;
    }
    return true;
  }

  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Prove legitimacy without sacrificing privacy. Selective disclosure + ZK proofs let you
        reveal only what a regulator, exchange, or accountant actually needs.
      </p>

      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-400/15 border border-emerald-400/30 text-emerald-400 text-[12px] px-3.5 py-2.5 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* ── Export type ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
        {EXPORT_TYPES.map((et) => {
          const selected = exportType === et.key;
          return (
            <button
              key={et.key}
              onClick={() => setExportType(et.key)}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                selected
                  ? "bg-[#6366f1]/10 border-[#6366f1]/50"
                  : "bg-[var(--card)] border-[var(--border-subtle)] hover:border-[#6366f1]/30"
              }`}
            >
              <p className={`text-[13px] font-medium mb-1 ${selected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                {et.title}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                {et.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Date range ──────────────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3 mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
          Date range
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[var(--text-muted)]">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1.5 text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[#6366f1]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[var(--text-muted)]">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1.5 text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[#6366f1]"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DATE_PRESETS.map((preset) => {
            const selected = dateFrom === preset.from && dateTo === preset.to;
            return (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset.from, preset.to)}
                className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors ${
                  selected
                    ? "bg-[#6366f1]/15 border-[#6366f1]/40 text-[#6366f1]"
                    : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-[#6366f1]/30"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Selective disclosure ────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4 mb-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
            Selective disclosure
          </p>
          <span className={`text-[11px] font-medium ${privacyLevel.color}`}>
            {privacyLevel.label}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
            <span>Maximum privacy</span>
            <span>Full disclosure</span>
          </div>
          <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${privacyLevel.bg}`}
              style={{ width: `${(checkedCount / totalFields) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {DISCLOSURE_ITEMS.map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-[var(--bg)] cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={disclosure[item.key]}
                onChange={() => toggleDisclosure(item.key)}
                className="h-3.5 w-3.5 accent-[#6366f1]"
              />
              <span className="text-[12px] text-[var(--text-primary)] flex-1">{item.label}</span>
              {item.warning && (
                <span className="text-[10px] text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded">
                  {item.warning}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* ── Preview ─────────────────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
            Preview
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] text-[11px]">
                <th className="text-left px-4 py-2 font-medium">Date</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Token</th>
                <th className="text-left px-4 py-2 font-medium">Amount</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TRANSACTIONS.map((tx, i) => (
                <tr
                  key={i}
                  className="border-b border-[var(--border-subtle)]/60 last:border-b-0"
                >
                  <td className="px-4 py-2.5 text-[var(--text-primary)] font-mono">
                    {isFieldVisible(tx, "date") ? tx.date : (
                      <span className="text-[var(--text-muted)]">{REDACTED}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        tx.type === "Deposit"
                          ? "bg-emerald-400/10 text-emerald-400"
                          : "bg-[#6366f1]/10 text-[#818cf8]"
                      }`}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-primary)]">{tx.token}</td>
                  <td className="px-4 py-2.5 text-[var(--text-primary)] font-mono tabular-nums">
                    {isFieldVisible(tx, "amount") ? tx.amount : (
                      <span className="text-[var(--text-muted)]">{REDACTED}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[11px] ${
                        tx.status === "Confirmed" ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Export buttons ──────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => showToast("CSV exported successfully")}
          className="flex items-center gap-2 px-3.5 py-2 bg-[var(--bg)] hover:border-[#6366f1]/40 border border-[var(--border)] text-[var(--text-primary)] text-[12px] font-medium rounded-lg transition-colors"
        >
          Download CSV
        </button>
        <button
          onClick={() => showToast("PDF exported successfully")}
          className="flex items-center gap-2 px-3.5 py-2 bg-[var(--bg)] hover:border-[#6366f1]/40 border border-[var(--border)] text-[var(--text-primary)] text-[12px] font-medium rounded-lg transition-colors"
        >
          Download PDF
        </button>
        <button
          onClick={() => showToast("ZK proof generated and verified")}
          className="flex items-center gap-2 px-3.5 py-2 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30 text-emerald-400 text-[12px] font-medium rounded-lg transition-colors"
        >
          Generate ZK proof
        </button>
      </div>

      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
        Generated client-side — no data leaves your browser. Consult a tax professional for
        compliance advice.
      </p>
    </div>
  );
}
