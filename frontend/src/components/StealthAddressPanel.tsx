"use client";

import { useState } from "react";

/**
 * Stealth Address Panel — Send and receive private payments.
 * Register your stealth meta-address, send to others, scan for incoming.
 */
export function StealthAddressPanel() {
  const [mode, setMode] = useState<"send" | "receive" | "register">("send");

  return (
    <div className="max-w-[820px] mx-auto">
      {/* Mode toggle */}
      <div className="flex gap-2 mb-5 max-w-[400px]">
        {(["send", "receive", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
              mode === m
                ? "bg-[#6366f1] text-white"
                : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[#6366f1]/50"
            }`}
          >
            {m === "send" ? "Send" : m === "receive" ? "Scan" : "Register"}
          </button>
        ))}
      </div>

      {mode === "send" && <SendPanel />}
      {mode === "receive" && <ScanPanel />}
      {mode === "register" && <RegisterPanel />}
    </div>
  );
}

/* ───────────────── REGISTER ───────────────── */

function RegisterPanel() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function handleRegister() {
    setIsRegistering(true);
    // TODO: Generate spending + viewing keypair, call StealthAddress.registerMetaAddress()
    setTimeout(() => {
      setRegistered(true);
      setIsRegistering(false);
    }, 2000);
  }

  return (
    <div className="grid md:grid-cols-[1fr_280px] gap-5">
      {/* LEFT */}
      <div className="space-y-4 min-w-0">
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
          Register your stealth meta-address to receive private payments. This generates a
          spending key and a viewing key. Anyone can send you ETH or tokens without
          revealing the link between sender and recipient.
        </p>

        {registered ? (
          <div className="bg-[var(--card)] border border-emerald-400/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <p className="text-[13px] font-medium text-emerald-400">
                Meta-address registered
              </p>
            </div>
            <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
              Share your meta-address with anyone who wants to send you private payments.
              They can look it up on-chain by your ENS or address.
            </p>
          </div>
        ) : (
          <button
            onClick={handleRegister}
            disabled={isRegistering}
            className="btn-primary w-full py-3 text-[13px] font-semibold"
          >
            {isRegistering ? "Generating keys…" : "Register stealth meta-address"}
          </button>
        )}
      </div>

      {/* RIGHT: how it works */}
      <aside className="md:sticky md:top-4 self-start">
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
            How it works
          </p>
          <ol className="space-y-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
            <Step n={1}>You register a public stealth meta-address.</Step>
            <Step n={2}>Sender generates a one-time stealth address from it.</Step>
            <Step n={3}>Sender sends funds + publishes an announcement.</Step>
            <Step n={4}>You scan announcements with your viewing key.</Step>
            <Step n={5}>Only your spending key can move the funds.</Step>
          </ol>
        </div>
      </aside>
    </div>
  );
}

/* ───────────────── SEND ───────────────── */

function SendPanel() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("ETH");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const recipientPreview =
    recipient.length > 12
      ? `${recipient.slice(0, 6)}…${recipient.slice(-4)}`
      : recipient || "—";

  async function handleSend() {
    if (!recipient || !amount) return;
    setIsSending(true);
    // TODO: Look up recipient meta-address, generate stealth address, send funds
    setTimeout(() => {
      setSent(true);
      setIsSending(false);
    }, 2000);
  }

  function handleReset() {
    setSent(false);
    setRecipient("");
    setAmount("");
  }

  /* DONE */
  if (sent) {
    return (
      <div className="max-w-[640px] mx-auto">
        <div className="bg-[var(--card)] border border-emerald-400/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <p className="text-[13px] font-medium text-emerald-400">
              Payment sent privately
            </p>
          </div>
          <div className="space-y-2 text-[13px]">
            <Row
              label="Recipient"
              value={<span className="font-mono text-xs">{recipientPreview}</span>}
            />
            <Row label="Amount" value={`${amount} ${token}`} />
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed pt-1">
            The recipient will detect this payment when they scan with their viewing key.
            No on-chain link between you and the recipient.
          </p>
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

  return (
    <>
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Send a private payment to any registered stealth address. The recipient is the
        only one who can detect and claim it.
      </p>

      <div className="grid md:grid-cols-[1fr_280px] gap-5">
        {/* LEFT: form */}
        <div className="space-y-4 min-w-0">
          <Field label="Recipient address or ENS">
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x… or vitalik.eth"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors"
            />
          </Field>

          <Field label="Amount">
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors"
              />
              <select
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 text-[13px] text-[var(--text-primary)] focus:border-[#6366f1] focus:outline-none transition-colors"
              >
                <option value="ETH">ETH</option>
                <option value="USDC">USDC</option>
                <option value="DAI">DAI</option>
              </select>
            </div>
          </Field>

          <button
            onClick={handleSend}
            disabled={!recipient || !amount || isSending}
            className="btn-primary w-full py-3 text-[13px] font-semibold"
          >
            {isSending ? "Generating stealth address…" : "Send private payment"}
          </button>
        </div>

        {/* RIGHT: preview */}
        <aside className="md:sticky md:top-4 self-start">
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
              Transfer preview
            </p>

            <div>
              <p className="text-[11px] text-[var(--text-muted)] mb-1">Recipient</p>
              <p className="text-[13px] font-mono font-medium text-[var(--text-primary)] truncate">
                {recipientPreview}
              </p>
            </div>

            <div>
              <p className="text-[11px] text-[var(--text-muted)] mb-1">Amount</p>
              <p className="text-[15px] font-semibold text-[var(--text-primary)] tabular-nums">
                {amount || "0.0"}{" "}
                <span className="text-[12px] font-normal text-[var(--text-muted)]">
                  {token}
                </span>
              </p>
            </div>

            <div className="h-px bg-[var(--border-subtle)]" />

            <div className="space-y-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
              <p>
                <span className="text-[var(--text-secondary)]">A fresh stealth address</span>{" "}
                is derived for this payment — it has never been seen on-chain before.
              </p>
              <p>
                <span className="text-[var(--text-secondary)]">No observer</span> can link
                the stealth address back to the recipient&apos;s public identity.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

/* ───────────────── SCAN ───────────────── */

function ScanPanel() {
  const [isScanning, setIsScanning] = useState(false);
  const [payments, setPayments] = useState<
    { amount: string; token: string; timestamp: string; claimed: boolean }[]
  >([]);

  const unclaimedCount = payments.filter((p) => !p.claimed).length;

  async function handleScan() {
    setIsScanning(true);
    // TODO: Scan announcements with viewing key, detect payments for us
    setTimeout(() => {
      setPayments([
        { amount: "0.5", token: "ETH", timestamp: "2 hours ago", claimed: false },
        { amount: "100", token: "USDC", timestamp: "1 day ago", claimed: true },
      ]);
      setIsScanning(false);
    }, 3000);
  }

  return (
    <>
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Scan the chain for stealth payments sent to you. Your viewing key detects
        payments — only you can see which ones are yours.
      </p>

      <div className="grid md:grid-cols-[1fr_280px] gap-5">
        {/* LEFT: scan + results */}
        <div className="space-y-4 min-w-0">
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="btn-primary w-full py-3 text-[13px] font-semibold"
          >
            {isScanning ? "Scanning announcements…" : "Scan for payments"}
          </button>

          {payments.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
                Found {payments.length} payment{payments.length !== 1 ? "s" : ""}
              </p>
              {payments.map((p, i) => (
                <div
                  key={i}
                  className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 flex items-center justify-between"
                >
                  <div>
                    <p className="text-[13px] font-medium text-[var(--text-primary)] tabular-nums">
                      {p.amount}{" "}
                      <span className="text-[12px] font-normal text-[var(--text-muted)]">
                        {p.token}
                      </span>
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {p.timestamp}
                    </p>
                  </div>
                  {p.claimed ? (
                    <span className="text-[11px] text-[var(--text-muted)] border border-[var(--border)] rounded px-2 py-1">
                      Claimed
                    </span>
                  ) : (
                    <button className="text-[11px] font-medium text-[#818cf8] bg-[#6366f1]/10 border border-[#6366f1]/30 rounded px-2.5 py-1 hover:bg-[#6366f1]/20 transition-colors">
                      Claim
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: scan status */}
        <aside className="md:sticky md:top-4 self-start">
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
              Scan status
            </p>

            <div>
              <p className="text-[11px] text-[var(--text-muted)] mb-1">Payments detected</p>
              <p className="text-[22px] font-semibold text-[var(--text-primary)] tabular-nums leading-none">
                {payments.length}
              </p>
            </div>

            {payments.length > 0 && (
              <div>
                <p className="text-[11px] text-[var(--text-muted)] mb-1">Unclaimed</p>
                <p className="text-[13px] font-medium text-[var(--text-primary)] tabular-nums">
                  {unclaimedCount} of {payments.length}
                </p>
              </div>
            )}

            <div className="h-px bg-[var(--border-subtle)]" />

            <div className="space-y-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
              <p>
                <span className="text-[var(--text-secondary)]">Scanning is local</span>{" "}
                and private — your viewing key never leaves this device.
              </p>
              <p>
                <span className="text-[var(--text-secondary)]">Senders</span> have no way
                to tell whether you&apos;ve seen, claimed, or ignored their payment.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-[var(--text-secondary)]">
      <span>{label}</span>
      <span className="text-[var(--text-primary)] font-medium">{value}</span>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="shrink-0 w-4 h-4 rounded-full bg-[#6366f1]/15 border border-[#6366f1]/40 text-[9px] font-semibold text-[#818cf8] flex items-center justify-center mt-0.5">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
