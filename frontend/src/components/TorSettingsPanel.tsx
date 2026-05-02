"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const HOP_OPTIONS = [
  { value: 3, label: "3 hops · Standard" },
  { value: 5, label: "5 hops · Paranoid" },
  { value: 7, label: "7 hops · Maximum" },
];

export function TorSettingsPanel() {
  const [torEnabled, setTorEnabled] = useState(true);
  const [hops, setHops] = useState(3);
  const [bridgeMode, setBridgeMode] = useState(false);
  const [isolateStreams, setIsolateStreams] = useState(true);
  const [socksPort, setSocksPort] = useState("9050");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [circuitAge, setCircuitAge] = useState(503);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const newCircuitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (newCircuitTimerRef.current) clearTimeout(newCircuitTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!torEnabled) return;
    const interval = setInterval(() => {
      setCircuitAge((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [torEnabled]);

  const formatTime = useCallback((totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  }, []);

  function handleNewCircuit() {
    if (newCircuitTimerRef.current) clearTimeout(newCircuitTimerRef.current);
    setRefreshing(true);
    newCircuitTimerRef.current = setTimeout(() => {
      setCircuitAge(0);
      setRefreshing(false);
      newCircuitTimerRef.current = null;
    }, 1500);
  }

  function handleCopyOnion() {
    navigator.clipboard.writeText(
      "privatmxr3kq8v2x5ndf7ghzw9jkl4mp6yt0cs1rae8bu2io47ad.onion"
    );
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setCopied(true);
    copyTimerRef.current = setTimeout(() => {
      setCopied(false);
      copyTimerRef.current = null;
    }, 2000);
  }

  const latencyMs = 340;
  const latencyColor =
    latencyMs < 500
      ? "text-emerald-400"
      : latencyMs < 1000
        ? "text-amber-400"
        : "text-mixer-red";

  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Route every mixer transaction through Tor for network-level anonymity. Your IP never
        touches the relayer network.
      </p>

      {/* ── Status + circuit ──────────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {torEnabled ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-emerald-400 font-medium text-[13px]">
                  Connected to Tor
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex h-2 w-2 rounded-full bg-[var(--text-muted)]" />
                <span className="text-[var(--text-muted)] font-medium text-[13px]">
                  Tor disabled
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => setTorEnabled(!torEnabled)}
            className={`shrink-0 w-10 rounded-full transition-colors ${
              torEnabled ? "bg-[#6366f1]" : "bg-[var(--border)]"
            }`}
            style={{ height: "22px" }}
          >
            <div
              className={`w-[18px] h-[18px] bg-white rounded-full transition-transform mx-0.5 ${
                torEnabled ? "translate-x-[18px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Circuit path */}
        <div className="relative flex items-center justify-between gap-1 overflow-hidden py-2">
          {["You", "Guard", "Middle", "Exit", "Relay"].map((node, i) => (
            <div key={node} className="flex items-center gap-1 z-10">
              <div
                className={`px-2 py-1 rounded-md text-[11px] font-mono border ${
                  torEnabled
                    ? "bg-[#6366f1]/10 border-[#6366f1]/30 text-[#818cf8]"
                    : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                {node}
              </div>
              {i < 4 && (
                <span className="text-[var(--text-muted)] text-[10px] select-none">
                  →
                </span>
              )}
            </div>
          ))}

          {torEnabled && (
            <div className="absolute inset-0 pointer-events-none">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="absolute top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-emerald-400 opacity-70"
                  style={{
                    animation: `torFlow 3s ${dot * 1}s linear infinite`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <style>{`
          @keyframes torFlow {
            0% { left: 5%; opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { left: 95%; opacity: 0; }
          }
        `}</style>
      </div>

      {!torEnabled && (
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-3 flex items-start gap-2 mb-3">
          <span className="text-amber-400 leading-none mt-0.5">⚠</span>
          <p className="text-[12px] text-amber-300/90">
            Without Tor, your IP address may be visible to relayers. For maximum privacy,
            keep Tor enabled.
          </p>
        </div>
      )}

      {/* ── Circuit settings ─────────────────────────── */}
      {torEnabled && (
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3 mb-3">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
            Circuit
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleNewCircuit}
              disabled={refreshing}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/30 text-[#818cf8] text-[12px] font-medium hover:bg-[#6366f1]/20 transition-colors disabled:opacity-50"
            >
              <span className={`inline-block transition-transform ${refreshing ? "animate-spin" : ""}`}>
                ↻
              </span>
              {refreshing ? "Building…" : "New circuit"}
            </button>

            <select
              value={hops}
              onChange={(e) => setHops(Number(e.target.value))}
              className="py-2 px-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] text-[12px] focus:outline-none focus:border-[#6366f1] appearance-none cursor-pointer"
            >
              {HOP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>
              Exit:{" "}
              <span className="text-emerald-400 font-mono">de-42.torproject.org</span>
            </span>
            <span>
              Active{" "}
              <span className="text-[var(--text-primary)] font-mono tabular-nums">
                {formatTime(circuitAge)}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* ── Advanced ─────────────────────────────────── */}
      {torEnabled && (
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden mb-3">
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] hover:bg-[var(--bg)] transition-colors"
          >
            <span>Advanced</span>
            <span
              className={`transform transition-transform duration-200 text-[10px] ${
                advancedOpen ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>

          {advancedOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-[var(--border-subtle)] pt-3">
              <ToggleRow
                title="Bridge mode"
                detail="Use Tor bridges to bypass censorship"
                value={bridgeMode}
                onChange={setBridgeMode}
              />

              <div className="flex items-center justify-between">
                <p className="text-[13px] text-[var(--text-primary)]">SOCKS5 port</p>
                <input
                  type="text"
                  value={socksPort}
                  onChange={(e) => setSocksPort(e.target.value)}
                  className="w-20 py-1.5 px-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] text-[12px] font-mono text-center focus:outline-none focus:border-[#6366f1]"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] text-[var(--text-primary)]">.onion service</p>
                  <p className="text-[11px] text-emerald-400 font-mono truncate mt-0.5">
                    privatmxr3k…7ad.onion
                  </p>
                </div>
                <button
                  onClick={handleCopyOnion}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)] hover:border-[#6366f1]/40 transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <ToggleRow
                title="Isolate streams"
                detail="Separate Tor circuit per transaction"
                value={isolateStreams}
                onChange={setIsolateStreams}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Stats ─────────────────────────────────────── */}
      {torEnabled && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3 text-center">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">
              Latency
            </p>
            <p className={`text-[18px] font-semibold font-mono tabular-nums ${latencyColor}`}>
              ~{latencyMs}ms
            </p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3 text-center">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">
              Bandwidth
            </p>
            <p className="text-[18px] font-semibold font-mono tabular-nums text-[var(--text-primary)]">
              1.2 MB/s
            </p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3 text-center">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">
              Uptime
            </p>
            <p className="text-[18px] font-semibold font-mono tabular-nums text-emerald-400">
              99.7%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  title,
  detail,
  value,
  onChange,
}: {
  title: string;
  detail: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[13px] text-[var(--text-primary)]">{title}</p>
        <p className="text-[11px] text-[var(--text-muted)]">{detail}</p>
      </div>
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
    </div>
  );
}
