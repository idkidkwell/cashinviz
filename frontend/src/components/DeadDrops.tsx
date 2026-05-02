"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type SelfDestruct = "off" | "1view" | "24h" | "7d";

interface InboxMessage {
  id: string;
  subject: string;
  received: string;
  read: boolean;
  selfDestructs?: string;
  decryptedContent?: string;
  metadata?: string;
}

const SELF_DESTRUCT_OPTIONS: { value: SelfDestruct; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "1view", label: "1 view" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
];

const INITIAL_INBOX: InboxMessage[] = [
  {
    id: "m1",
    subject: "[Encrypted]",
    received: "2h ago",
    read: false,
    decryptedContent:
      "Meeting confirmed for Friday. Use the stealth address I sent last week. Burn this message after reading.",
    metadata: "ECIES-256 · Tor relay · no sender metadata",
  },
  {
    id: "m2",
    subject: "[Encrypted]",
    received: "1d ago",
    read: true,
    decryptedContent:
      "The governance proposal passed. Token migration begins next week. Keep this between us.",
    metadata: "ECIES-256 · Tor relay · no sender metadata",
  },
  {
    id: "m3",
    subject: "[Encrypted]",
    received: "3d ago",
    read: true,
    decryptedContent:
      "Audit report is clean. Deploying contracts to mainnet tomorrow at 03:00 UTC.",
    metadata: "ECIES-256 · Tor relay · no sender metadata",
  },
  {
    id: "m4",
    subject: "[Encrypted]",
    received: "5h ago",
    read: false,
    selfDestructs: "4h",
    decryptedContent:
      "Coordinates received. Proceed with the multi-sig signing at the agreed time. This message will self-destruct.",
    metadata: "ECIES-256 · Tor relay · no sender metadata",
  },
];

const GLITCH_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789abcdef";

function useGlitchDecrypt(text: string, active: boolean, duration = 1500): string {
  const [display, setDisplay] = useState("");
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active) {
      setDisplay("");
      return;
    }
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const revealedCount = Math.floor(progress * text.length);
      let result = "";
      for (let i = 0; i < text.length; i++) {
        if (i < revealedCount) {
          result += text[i];
        } else {
          result += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
      }
      setDisplay(result);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [active, text, duration]);

  return active ? display || text : "";
}

export function DeadDrops() {
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [selfDestruct, setSelfDestruct] = useState<SelfDestruct>("off");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [inbox, setInbox] = useState<InboxMessage[]>(INITIAL_INBOX);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const [decryptedIds, setDecryptedIds] = useState<Set<string>>(new Set());
  const [whistleMode, setWhistleMode] = useState(false);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decryptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
      if (sentResetTimerRef.current) clearTimeout(sentResetTimerRef.current);
      if (decryptTimerRef.current) clearTimeout(decryptTimerRef.current);
    };
  }, []);

  const selectedMsg = inbox.find((m) => m.id === selectedMessage);
  const isDecrypting = decryptingId === selectedMessage;
  const isDecrypted = selectedMessage ? decryptedIds.has(selectedMessage) : false;

  const glitchText = useGlitchDecrypt(
    selectedMsg?.decryptedContent || "",
    isDecrypting
  );

  const handleSend = useCallback(() => {
    if (!recipient || !message) return;
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    if (sentResetTimerRef.current) clearTimeout(sentResetTimerRef.current);
    setSending(true);
    sendTimerRef.current = setTimeout(() => {
      setSending(false);
      setSent(true);
      setRecipient("");
      setMessage("");
      setAttachmentName(null);
      setSelfDestruct("off");
      sentResetTimerRef.current = setTimeout(() => {
        setSent(false);
        sentResetTimerRef.current = null;
      }, 3000);
      sendTimerRef.current = null;
    }, 1500);
  }, [recipient, message]);

  const handleOpenMessage = useCallback(
    (id: string) => {
      setSelectedMessage(id);
      if (!decryptedIds.has(id)) {
        if (decryptTimerRef.current) clearTimeout(decryptTimerRef.current);
        setDecryptingId(id);
        decryptTimerRef.current = setTimeout(() => {
          setDecryptingId(null);
          setDecryptedIds((prev) => new Set(prev).add(id));
          setInbox((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
          decryptTimerRef.current = null;
        }, 1500);
      }
    },
    [decryptedIds]
  );

  const handleDestroy = useCallback((id: string) => {
    setInbox((prev) => prev.filter((m) => m.id !== id));
    setSelectedMessage(null);
    setDecryptedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Send encrypted messages to any wallet. Zero metadata, zero trace — only the
        recipient&apos;s private key can decrypt.
      </p>

      {/* ── Compose ─────────────────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4 mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
          Compose
        </p>

        <Field label="Recipient">
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x… or name.eth"
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors"
          />
        </Field>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-400/10 text-emerald-400 text-[11px] font-medium rounded border border-emerald-400/25">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            AES-256 + ECIES
          </span>
        </div>

        <Field
          label="Message"
          aside={
            <span className="text-[10px] text-[var(--text-muted)] font-mono tabular-nums">
              {message.length}/5000
            </span>
          }
        >
          <textarea
            value={message}
            onChange={(e) => {
              if (e.target.value.length <= 5000) setMessage(e.target.value);
            }}
            placeholder="Type your message…"
            rows={4}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors resize-none"
          />
        </Field>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAttachmentName(attachmentName ? null : "document.pdf")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--text-secondary)] hover:border-[#6366f1]/40 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
            {attachmentName ?? "Attach (IPFS)"}
          </button>
          <span className="text-[10px] text-[var(--text-muted)]">Max 10MB</span>
          {attachmentName && (
            <button
              onClick={() => setAttachmentName(null)}
              className="text-[11px] text-mixer-red hover:opacity-80"
            >
              Remove
            </button>
          )}
        </div>

        <div>
          <p className="text-[11px] text-[var(--text-muted)] mb-1.5">Self-destruct</p>
          <div className="flex gap-1.5">
            {SELF_DESTRUCT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelfDestruct(opt.value)}
                className={`px-2.5 py-1.5 text-[12px] rounded-lg border transition-colors ${
                  selfDestruct === opt.value
                    ? "bg-[#6366f1]/15 text-[#6366f1] border-[#6366f1]/40"
                    : "bg-[var(--bg)] text-[var(--text-muted)] border-[var(--border)] hover:border-[#6366f1]/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={!recipient || !message || sending}
          className="btn-primary w-full py-2.5 text-[13px] font-semibold"
        >
          {sending
            ? "Encrypting & sending…"
            : sent
            ? "Message sent ✓"
            : "Send anonymous message"}
        </button>

        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Your identity is never attached. Only the recipient&apos;s private key can decrypt.
        </p>
      </div>

      {/* ── Inbox + View ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">
            Inbox
          </p>
          <div className="space-y-1.5">
            {inbox.length === 0 && (
              <p className="text-[12px] text-[var(--text-muted)] text-center py-8">No messages</p>
            )}
            {inbox.map((msg) => (
              <button
                key={msg.id}
                onClick={() => handleOpenMessage(msg.id)}
                className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                  selectedMessage === msg.id
                    ? "bg-[#6366f1]/5 border-[#6366f1]/30"
                    : "bg-[var(--bg)] border-[var(--border)] hover:border-[#6366f1]/30"
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[var(--text-primary)] font-medium">
                      Anonymous
                    </span>
                    {!msg.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Unread" />
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">{msg.received}</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">{msg.subject}</p>
                {msg.selfDestructs && (
                  <p className="text-[10px] text-mixer-red mt-0.5">
                    Self-destructs in {msg.selfDestructs}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">
            Message
          </p>
          {!selectedMessage ? (
            <div className="text-center py-12">
              <svg className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <p className="text-[12px] text-[var(--text-muted)]">Select a message to decrypt</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 min-h-[100px]">
                {isDecrypting && (
                  <p className="text-[12px] font-mono text-emerald-400/80 break-all leading-relaxed">
                    {glitchText}
                  </p>
                )}
                {isDecrypted && selectedMsg && (
                  <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                    {selectedMsg.decryptedContent}
                  </p>
                )}
                {!isDecrypting && !isDecrypted && (
                  <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                    <div className="w-3 h-3 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
                    Decrypting…
                  </div>
                )}
              </div>

              {isDecrypted && selectedMsg && (
                <>
                  <p className="text-[10px] text-[var(--text-muted)] font-mono">{selectedMsg.metadata}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    <button className="px-2.5 py-1.5 bg-[#6366f1] text-white text-[11px] font-medium rounded-lg hover:bg-[#6366f1]/85 transition-colors">
                      Reply
                    </button>
                    <button
                      onClick={() => handleDestroy(selectedMsg.id)}
                      className="px-2.5 py-1.5 bg-mixer-red/10 text-mixer-red text-[11px] font-medium rounded-lg border border-mixer-red/25 hover:bg-mixer-red/15 transition-colors"
                    >
                      Destroy
                    </button>
                    <button className="px-2.5 py-1.5 bg-[var(--bg)] text-[var(--text-secondary)] text-[11px] font-medium rounded-lg border border-[var(--border)] hover:border-[#6366f1]/30 transition-colors">
                      Save encrypted
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Whistle mode ─────────────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[13px] text-[var(--text-primary)]">Whistle mode</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Maximum anonymity for high-risk messages
            </p>
          </div>
          <button
            onClick={() => setWhistleMode(!whistleMode)}
            className={`shrink-0 w-10 rounded-full transition-colors relative ${
              whistleMode ? "bg-[#6366f1]" : "bg-[var(--border)]"
            }`}
            style={{ height: "22px" }}
          >
            <div
              className={`w-[18px] h-[18px] bg-white rounded-full transition-transform mx-0.5 ${
                whistleMode ? "translate-x-[18px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 gap-2 transition-opacity ${
            whistleMode ? "opacity-100" : "opacity-40"
          }`}
        >
          <WhistleItem title="7-hop Tor" detail="Relays through 7 onion routers" />
          <WhistleItem title="Timing jitter" detail="Random 1–6h delay" />
          <WhistleItem title="Decoy traffic" detail="Plausible deniability" />
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Sent", value: "12,847" },
          { label: "Destroyed", value: "8,291" },
          { label: "Avg delivery", value: "340ms" },
          { label: "Metadata leaks", value: "0" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3 text-center"
          >
            <p className="text-[18px] font-semibold text-[var(--text-primary)] tabular-nums">
              {stat.value}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 uppercase tracking-[0.06em]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tiny helpers ─────────────────────────────── */

function Field({
  label,
  aside,
  children,
}: {
  label: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
          {label}
        </label>
        {aside}
      </div>
      {children}
    </div>
  );
}

function WhistleItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-3">
      <p className="text-[12px] text-[var(--text-primary)]">{title}</p>
      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{detail}</p>
    </div>
  );
}
