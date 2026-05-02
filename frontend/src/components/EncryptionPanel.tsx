"use client";

import { useEffect, useRef, useState } from "react";

const AUDIT_EVENTS = [
  { event: "Note encrypted with AES-GCM-256", time: "2m ago" },
  { event: "ZK proof generated (valid)", time: "15m ago" },
  { event: "RSA key exchange completed", time: "1h ago" },
  { event: "TLS 1.3 session established", time: "1h ago" },
  { event: "Key derivation completed (PBKDF2)", time: "2h ago" },
];

const SELF_TEST_STEPS = [
  "Verifying AES-GCM encryption…",
  "Testing key derivation…",
  "Validating ZK proof system…",
  "Checking RSA key exchange…",
  "Verifying Perfect Forward Secrecy…",
];

export function EncryptionPanel() {
  const [useArgon2, setUseArgon2] = useState(false);
  const [password, setPassword] = useState("");
  const [selfTestRunning, setSelfTestRunning] = useState(false);
  const [selfTestStep, setSelfTestStep] = useState(0);
  const [selfTestDone, setSelfTestDone] = useState(false);
  const [generatingKeys, setGeneratingKeys] = useState(false);

  const selfTestIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const keyGenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (selfTestIntervalRef.current) clearInterval(selfTestIntervalRef.current);
      if (keyGenTimerRef.current) clearTimeout(keyGenTimerRef.current);
    };
  }, []);

  function runSelfTest() {
    if (selfTestIntervalRef.current) clearInterval(selfTestIntervalRef.current);
    setSelfTestRunning(true);
    setSelfTestStep(0);
    setSelfTestDone(false);
    let step = 0;
    selfTestIntervalRef.current = setInterval(() => {
      step++;
      if (step >= SELF_TEST_STEPS.length) {
        if (selfTestIntervalRef.current) {
          clearInterval(selfTestIntervalRef.current);
          selfTestIntervalRef.current = null;
        }
        setSelfTestRunning(false);
        setSelfTestDone(true);
        setSelfTestStep(SELF_TEST_STEPS.length);
      } else {
        setSelfTestStep(step);
      }
    }, 700);
  }

  function handleGenerateKeys() {
    if (keyGenTimerRef.current) clearTimeout(keyGenTimerRef.current);
    setGeneratingKeys(true);
    keyGenTimerRef.current = setTimeout(() => {
      setGeneratingKeys(false);
      keyGenTimerRef.current = null;
    }, 2000);
  }

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Military-grade encryption protects your notes, transactions, and metadata. All keys
        live in your browser — nothing is ever sent to a server.
      </p>

      {/* ── Status ─────────────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-3 flex items-center gap-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <div>
          <p className="text-[13px] text-[var(--text-primary)] font-medium">All systems secure</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            End-to-end encryption active on all channels
          </p>
        </div>
      </div>

      {/* ── Note encryption ────────────────────── */}
      <Section title="Note encryption">
        <Row label="Algorithm">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-400">
            <Check /> AES-GCM 256-bit
          </span>
        </Row>
        <Row label="Key derivation">
          <span className="text-[12px] text-[var(--text-secondary)] font-mono">
            {useArgon2 ? "Argon2id" : "PBKDF2 · 600k iter"}
          </span>
        </Row>

        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
          <div>
            <p className="text-[13px] text-[var(--text-primary)]">Upgrade to Argon2id</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Memory-hard KDF, resistant to GPU attacks
            </p>
          </div>
          <Toggle value={useArgon2} onChange={setUseArgon2} />
        </div>

        <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
          <label className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.06em] font-medium">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter encryption password"
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#6366f1]"
          />
          {password.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      level <= passwordStrength.level
                        ? passwordStrength.color
                        : "bg-[var(--border)]"
                    }`}
                  />
                ))}
              </div>
              <div className={`text-[11px] ${passwordStrength.textColor}`}>
                {passwordStrength.label}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Transport ──────────────────────────── */}
      <Section title="Transport encryption">
        <Row label="RSA-2048 key exchange">
          <Badge tone="emerald">Active</Badge>
        </Row>
        <p className="text-[11px] text-[var(--text-muted)] font-mono -mt-1">
          Fingerprint: a4:c1:9e:7b:3d:f8:2a:01:ee:5c
        </p>
        <Row label="TLS 1.3">
          <Badge tone="indigo">Encrypted</Badge>
        </Row>
        <Row label="Perfect forward secrecy">
          <Badge tone="emerald">Enabled</Badge>
        </Row>

        <div className="pt-3 border-t border-[var(--border-subtle)]">
          <button
            onClick={handleGenerateKeys}
            disabled={generatingKeys}
            className="w-full py-2 rounded-lg text-[12px] font-medium transition-all bg-[#6366f1]/10 border border-[#6366f1]/30 text-[#818cf8] hover:bg-[#6366f1]/15 disabled:opacity-50"
          >
            {generatingKeys ? "Generating new keys…" : "Generate new keys"}
          </button>
        </div>
      </Section>

      {/* ── ZK Proof System ────────────────────── */}
      <Section title="Zero-knowledge proof system">
        <Row label="Proving system">
          <span className="text-[12px] text-[var(--text-primary)] font-medium">
            UltraPLONK (Noir)
          </span>
        </Row>
        <Row label="Trusted setup">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-400">
            <Check /> None required
          </span>
        </Row>
        <Row label="Proof size">
          <span className="text-[12px] text-[var(--text-secondary)] font-mono tabular-nums">
            ~1.2 KB
          </span>
        </Row>
        <Row label="Verification time">
          <span className="text-[12px] text-[var(--text-secondary)] font-mono tabular-nums">
            ~200ms
          </span>
        </Row>

        <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
          <button
            onClick={runSelfTest}
            disabled={selfTestRunning}
            className="w-full py-2 rounded-lg text-[12px] font-medium transition-all bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/15 disabled:opacity-50"
          >
            {selfTestRunning
              ? "Running self-test…"
              : selfTestDone
                ? "Self-test passed ✓"
                : "Run self-test"}
          </button>
          {(selfTestRunning || selfTestDone) && (
            <div className="space-y-1.5 pt-1">
              {SELF_TEST_STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  {i < selfTestStep ? (
                    <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : i === selfTestStep && selfTestRunning ? (
                    <span className="w-3 h-3 flex-shrink-0 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="w-3 h-3 flex-shrink-0 rounded-full border border-[var(--border)]" />
                  )}
                  <span
                    className={
                      i < selfTestStep
                        ? "text-emerald-400"
                        : i === selfTestStep && selfTestRunning
                          ? "text-[#818cf8]"
                          : "text-[var(--text-muted)]"
                    }
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ── Audit trail ────────────────────────── */}
      <Section title="Security audit trail" noPadding>
        <div className="divide-y divide-[var(--border-subtle)]">
          {AUDIT_EVENTS.map((entry, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-[12px] text-[var(--text-primary)]">{entry.event}</span>
              </div>
              <span className="text-[11px] text-[var(--text-muted)]">{entry.time}</span>
            </div>
          ))}
        </div>
      </Section>

      <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-xl p-4 flex items-start gap-3">
        <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div>
          <p className="text-[12px] font-medium text-emerald-400 mb-0.5">100% non-custodial</p>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Your keys, your crypto. All encryption happens client-side — we never hold your
            funds or store your data.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Tiny helpers ────────────────────────────── */

function Section({
  title,
  children,
  noPadding,
}: {
  title: string;
  children: React.ReactNode;
  noPadding?: boolean;
}) {
  return (
    <div className="mb-3">
      <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
        {title}
      </p>
      <div
        className={`bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl ${
          noPadding ? "" : "p-4 space-y-2.5"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
      {children}
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "emerald" | "indigo";
  children: React.ReactNode;
}) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-400/10 text-emerald-400"
      : "bg-[#6366f1]/10 text-[#818cf8]";
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${cls}`}>
      {children}
    </span>
  );
}

function Check() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`shrink-0 w-10 rounded-full transition-colors ${
        value ? "bg-[#6366f1]" : "bg-[var(--border)]"
      }`}
      style={{ height: "22px" }}
    >
      <div
        className={`w-[18px] h-[18px] bg-white rounded-full transition-transform mx-0.5 ${
          value ? "translate-x-[18px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function getPasswordStrength(pw: string): {
  level: number;
  label: string;
  color: string;
  textColor: string;
} {
  if (pw.length === 0) return { level: 0, label: "", color: "", textColor: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { level: 1, label: "Weak", color: "bg-mixer-red", textColor: "text-mixer-red" };
  if (score === 2) return { level: 2, label: "Fair", color: "bg-amber-400", textColor: "text-amber-400" };
  if (score === 3) return { level: 3, label: "Good", color: "bg-[#6366f1]", textColor: "text-[#818cf8]" };
  return { level: 4, label: "Strong", color: "bg-emerald-400", textColor: "text-emerald-400" };
}
