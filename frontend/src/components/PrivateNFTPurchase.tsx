"use client";

import { useEffect, useRef, useState } from "react";

const MARKETPLACES = ["OpenSea", "Blur", "LooksRare", "X2Y2"] as const;
type Marketplace = (typeof MARKETPLACES)[number];

interface NFTDetails {
  name: string;
  collection: string;
  price: string;
  owner: string;
}

const MOCK_NFT: NFTDetails = {
  name: "Bored Ape #7291",
  collection: "Bored Ape Yacht Club",
  price: "2.4 ETH",
  owner: "0x1a2B...9f4E",
};

const PROCESSING_STEPS = [
  "Generating stealth address",
  "Routing funds",
  "Executing purchase",
  "Complete",
];

/**
 * Private NFT Purchase Panel — buy NFTs without linking your wallet.
 * Routes the purchase through a stealth address with optional delay + splitting.
 */
export function PrivateNFTPurchase() {
  const [marketplace, setMarketplace] = useState<Marketplace>("OpenSea");
  const [listingUrl, setListingUrl] = useState("");
  const [fetched, setFetched] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const [useStealth, setUseStealth] = useState(true);
  const [timeDelay, setTimeDelay] = useState(0);
  const [splitPurchase, setSplitPurchase] = useState(false);

  const [purchasing, setPurchasing] = useState(false);
  const [processingStep, setProcessingStep] = useState(-1);

  // Timers are held in refs so we can clean them up on unmount or re-entry.
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const purchaseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
      if (purchaseIntervalRef.current) clearInterval(purchaseIntervalRef.current);
    };
  }, []);

  function handleFetch() {
    if (!listingUrl.trim()) return;
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    setIsFetching(true);
    fetchTimerRef.current = setTimeout(() => {
      setFetched(true);
      setIsFetching(false);
      fetchTimerRef.current = null;
    }, 1200);
  }

  function handlePurchase() {
    // Guard against double-click starting a second interval.
    if (purchaseIntervalRef.current) return;
    setPurchasing(true);
    setProcessingStep(0);
    let step = 0;
    purchaseIntervalRef.current = setInterval(() => {
      step++;
      if (step >= PROCESSING_STEPS.length) {
        if (purchaseIntervalRef.current) {
          clearInterval(purchaseIntervalRef.current);
          purchaseIntervalRef.current = null;
        }
        setProcessingStep(PROCESSING_STEPS.length - 1);
      } else {
        setProcessingStep(step);
      }
    }, 1400);
  }

  return (
    <div className="max-w-[820px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Buy NFTs anonymously. Funds route through a stealth address so the purchase is
        never linked to your main wallet.
      </p>

      <div className="grid md:grid-cols-[1fr_280px] gap-5">
        {/* ── LEFT: Listing + purchase flow ─────────────── */}
        <div className="space-y-4 min-w-0">
          {/* Marketplace tabs */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1.5">
              Marketplace
            </label>
            <div className="flex gap-1 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-1">
              {MARKETPLACES.map((mp) => (
                <button
                  key={mp}
                  onClick={() => {
                    setMarketplace(mp);
                    setFetched(false);
                  }}
                  className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                    marketplace === mp
                      ? "bg-[#6366f1] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {mp}
                </button>
              ))}
            </div>
          </div>

          {/* Listing URL */}
          <Field label="Listing URL or contract address">
            <div className="flex gap-2">
              <input
                type="text"
                value={listingUrl}
                onChange={(e) => {
                  setListingUrl(e.target.value);
                  setFetched(false);
                }}
                placeholder={`https://${marketplace.toLowerCase()}.io/assets/0x...`}
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors min-w-0"
              />
              <button
                onClick={handleFetch}
                disabled={!listingUrl.trim() || isFetching}
                className="px-3 py-2.5 rounded-lg border border-[var(--border)] hover:border-[#6366f1]/50 disabled:opacity-40 text-[13px] text-[var(--text-secondary)] transition-colors whitespace-nowrap"
              >
                {isFetching ? "Fetching…" : "Fetch"}
              </button>
            </div>
          </Field>

          {/* NFT preview */}
          {fetched && (
            <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 flex gap-4 items-start">
              <div className="w-16 h-16 rounded-lg shrink-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400" />
              <div className="space-y-0.5 min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                  {MOCK_NFT.name}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">
                  {MOCK_NFT.collection}
                </p>
                <div className="flex items-center justify-between pt-1.5">
                  <p className="text-[13px] font-semibold text-emerald-400 tabular-nums">
                    {MOCK_NFT.price}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    {MOCK_NFT.owner}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Purchase settings */}
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
              Purchase settings
            </p>

            <ToggleRow
              label="Stealth address"
              detail="Receive NFT at an unlinkable address"
              value={useStealth}
              onChange={setUseStealth}
            />

            <ToggleRow
              label="Split purchase"
              detail="Route through multiple intermediate addresses"
              value={splitPurchase}
              onChange={setSplitPurchase}
            />

            {/* Time delay slider */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-[var(--text-primary)] leading-tight">
                    Time delay
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
                    Break timing correlation
                  </p>
                </div>
                <span className="text-[13px] font-medium text-[#818cf8] tabular-nums">
                  {timeDelay}h
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={24}
                value={timeDelay}
                onChange={(e) => setTimeDelay(Number(e.target.value))}
                className="w-full accent-[#6366f1]"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                <span>0h</span>
                <span>12h</span>
                <span>24h</span>
              </div>
            </div>
          </div>

          {/* CTA / processing */}
          {purchasing ? (
            <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-2.5">
              {PROCESSING_STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      i < processingStep
                        ? "bg-emerald-400/15 text-emerald-400"
                        : i === processingStep
                        ? "bg-[#6366f1]/15 text-[#6366f1] animate-pulse"
                        : "bg-[var(--bg)] text-[var(--text-muted)]"
                    }`}
                  >
                    {i < processingStep ? (
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : i === processingStep ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full border border-current" />
                    )}
                  </div>
                  <span
                    className={`text-[13px] ${
                      i <= processingStep
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={handlePurchase}
              disabled={!fetched}
              className="btn-primary w-full py-3 text-[13px] font-semibold"
            >
              Purchase privately
            </button>
          )}
        </div>

        {/* ── RIGHT: Cost breakdown + explainer ─────────── */}
        <aside className="md:sticky md:top-4 self-start">
          <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
              Cost breakdown
            </p>

            <div className="space-y-1.5">
              <Row
                label="NFT price"
                value={fetched ? MOCK_NFT.price : "—"}
              />
              <Row label="Mixer fee (0.3%)" value={fetched ? "0.0072 ETH" : "—"} />
              <Row label="Estimated gas" value="~0.008 ETH" muted />
              <div className="pt-1.5 mt-1.5 border-t border-[var(--border-subtle)]">
                <Row
                  label="Total"
                  value={fetched ? "~2.4152 ETH" : "—"}
                  strong
                />
              </div>
            </div>

            <div className="h-px bg-[var(--border-subtle)]" />

            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
              How it works
            </p>
            <div className="space-y-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
              <p>
                <span className="text-[var(--text-secondary)]">1.</span> Fund your
                shielded wallet with ETH/WETH.
              </p>
              <p>
                <span className="text-[var(--text-secondary)]">2.</span> Paste a listing
                URL — we fetch price + owner.
              </p>
              <p>
                <span className="text-[var(--text-secondary)]">3.</span> Purchase routes
                through a stealth address you control.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
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

function ToggleRow({
  label,
  detail,
  value,
  onChange,
}: {
  label: string;
  detail: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] text-[var(--text-primary)] leading-tight">{label}</p>
        <p className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
          {detail}
        </p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
          value ? "bg-emerald-400" : "bg-[var(--border)]"
        }`}
        aria-pressed={value}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            value ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between text-[12px] ${
        strong ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)]"
      }`}
    >
      <span>{label}</span>
      <span className={`tabular-nums ${muted ? "text-[var(--text-muted)]" : ""}`}>
        {value}
      </span>
    </div>
  );
}
