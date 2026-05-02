"use client";

import { useState } from "react";
import { FeatureShowcase } from "./FeatureShowcase";

/* ─── Brand mark ─────────────────────────────────────────────
   A blender holding a dollar bill — the literal product
   metaphor. Cashinviz mixes (blends) cash. The lid + jar +
   motor + feet + the $ inside read as one icon at 24-32px;
   the dollar is rendered in the accent colour so the brand
   mark always carries a hit of green. Pure SVG, no raster. */
function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 text-[var(--text-primary)] ${className}`}
      aria-hidden
    >
      {/* Lid handle (small knob on top) */}
      <rect x={10.5} y={2.2} width={3} height={1.6} rx={0.4} fill="currentColor" />
      {/* Lid (cap) */}
      <rect x={6.8} y={3.8} width={10.4} height={1.7} rx={0.5} fill="currentColor" />
      {/* Jar / glass — slightly tapered cup */}
      <path
        d="M 7.6 5.5 L 7.1 16.2 L 16.9 16.2 L 16.4 5.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {/* Cash inside — bold $ in the accent colour */}
      <text
        x={12}
        y={13.7}
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize={8.5}
        fontWeight={800}
        fill="var(--accent)"
      >
        $
      </text>
      {/* Motor / base */}
      <rect x={5.6} y={16.2} width={12.8} height={3.3} rx={0.9} fill="currentColor" />
      {/* Feet */}
      <rect x={8.5} y={19.5} width={2} height={2.3} rx={0.3} fill="currentColor" />
      <rect x={13.5} y={19.5} width={2} height={2.3} rx={0.3} fill="currentColor" />
    </svg>
  );
}

/* ─── Privacy-flow diagram ───────────────────────────────────
   Inline SVG illustration that shows what the protocol does
   at a glance: deposit address → mixing pool → withdraw
   address, with the link visually severed. Not decoration —
   the dot grid in the centre is the same metaphor as the
   logo (anonymity set), and the lines deliberately don't
   carry your dot through, demonstrating the core guarantee.
   Pure black-and-grey + one accent. No gradients. */
function FlowDiagram() {
  return (
    <svg
      viewBox="0 0 720 240"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      role="img"
      aria-label="Deposit address flows into a mixing pool of commitments; withdraw address comes out the other side with no on-chain link to the deposit."
    >
      {/* From address card */}
      <g>
        <rect
          x={20}
          y={86}
          width={170}
          height={68}
          rx={10}
          fill="var(--card)"
          stroke="var(--border)"
        />
        <text
          x={36}
          y={110}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize={11}
          fill="var(--text-muted)"
          letterSpacing="0.06em"
        >
          FROM
        </text>
        <text
          x={36}
          y={134}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize={13}
          fill="var(--text-primary)"
        >
          0xA1f3…92cd
        </text>
      </g>

      {/* Arrow: deposit */}
      <g stroke="var(--text-muted)" strokeWidth={1.25} fill="none">
        <line x1={195} y1={120} x2={265} y2={120} />
        <polyline points="259,114 265,120 259,126" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text
        x={230}
        y={108}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize={10}
        fill="var(--text-muted)"
        textAnchor="middle"
        letterSpacing="0.04em"
      >
        deposit
      </text>

      {/* Mixing pool — anonymity set */}
      <g>
        <rect
          x={270}
          y={40}
          width={180}
          height={160}
          rx={12}
          fill="var(--card)"
          stroke="var(--border)"
        />
        <text
          x={360}
          y={66}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize={11}
          fill="var(--text-muted)"
          textAnchor="middle"
          letterSpacing="0.06em"
        >
          ANONYMITY SET
        </text>
        {/* Dot grid: 5 cols × 4 rows. One dot in accent — yours
            among the crowd, gently pulsing so the page reads as
            alive rather than static. */}
        {Array.from({ length: 4 }).flatMap((_, row) =>
          Array.from({ length: 5 }).map((_, col) => {
            const cx = 296 + col * 32;
            const cy = 92 + row * 28;
            const isAccent = row === 2 && col === 2;
            return (
              <circle
                key={`${row}-${col}`}
                cx={cx}
                cy={cy}
                r={isAccent ? 4 : 3}
                fill={isAccent ? "var(--accent)" : "currentColor"}
                opacity={isAccent ? 1 : 0.35}
                className={isAccent ? "hero-pulse" : undefined}
              />
            );
          })
        )}
      </g>

      {/* Arrow: ZK proof */}
      <g stroke="var(--text-muted)" strokeWidth={1.25} fill="none">
        <line x1={455} y1={120} x2={525} y2={120} />
        <polyline points="519,114 525,120 519,126" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text
        x={490}
        y={108}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize={10}
        fill="var(--text-muted)"
        textAnchor="middle"
        letterSpacing="0.04em"
      >
        ZK proof
      </text>

      {/* To address card */}
      <g>
        <rect
          x={530}
          y={86}
          width={170}
          height={68}
          rx={10}
          fill="var(--card)"
          stroke="var(--border)"
        />
        <text
          x={546}
          y={110}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize={11}
          fill="var(--text-muted)"
          letterSpacing="0.06em"
        >
          TO
        </text>
        <text
          x={546}
          y={134}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize={13}
          fill="var(--text-primary)"
        >
          0xBe7c…4d2f
        </text>
      </g>

      {/* Caption strip — "no on-chain link" */}
      <g>
        <line
          x1={36}
          y1={210}
          x2={684}
          y2={210}
          stroke="var(--border-subtle)"
          strokeWidth={1}
        />
        <text
          x={360}
          y={228}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize={10}
          fill="var(--text-muted)"
          textAnchor="middle"
          letterSpacing="0.06em"
        >
          NO ON-CHAIN LINK BETWEEN FROM AND TO
        </text>
      </g>
    </svg>
  );
}

/* ─── Content ────────────────────────────────────────────────
   Plain copy. No marketing fluff, no fake testimonials, no
   numbers we can't verify. Stats are intentionally absent
   pre-launch — they'll go in once we have real on-chain data
   to point to. */

const NAV_LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Networks", href: "#networks" },
  { label: "FAQ", href: "#faq" },
  { label: "GitHub", href: "https://github.com/" }, // TODO: replace with the real repo URL
];

const HOW_IT_WORKS = [
  {
    n: "1",
    title: "Deposit",
    desc: "You generate a secret in your browser, hash it into a commitment, and send a fixed amount of ETH or an ERC-20 to the pool contract. The commitment goes on-chain. The secret stays with you.",
  },
  {
    n: "2",
    title: "Wait",
    desc: "Your deposit sits in a pool with everyone else's. The longer you wait and the more deposits join, the larger the anonymity set you withdraw against.",
  },
  {
    n: "3",
    title: "Withdraw",
    desc: "From a fresh address, you submit a zero-knowledge proof that you own one of the commitments — without revealing which one. The contract pays out to the address you choose.",
  },
];

const EVM_NETWORKS = [
  "Ethereum",
  "Arbitrum",
  "Optimism",
  "Base",
  "Polygon",
  "BNB Chain",
  "Avalanche",
  "Gnosis",
  "Linea",
];

// Non-EVM chains plug in through chain-specific bridges. Bitcoin uses
// HTLC atomic swaps; Solana / Cosmos / Tron / TON ride Wormhole (with
// IBC + Axelar fallbacks for Cosmos); Monero is reached through an
// atomic swap with a privacy-preserving intermediary.
const NON_EVM_NETWORKS = [
  { name: "Bitcoin", via: "HTLC atomic swap" },
  { name: "Solana", via: "Wormhole" },
  { name: "Monero", via: "atomic swap" },
  { name: "Cosmos", via: "IBC / Axelar" },
  { name: "Tron", via: "Wormhole" },
  { name: "TON", via: "Wormhole" },
];

const FACTS = [
  "Non-custodial. The contracts hold your funds during the wait; nobody can move them without your secret.",
  "Open source under MIT. The full repo, including the Noir circuits, is on GitHub.",
  "Client-side proofs. The ZK proof is generated in your browser via Barretenberg WASM. The secret never leaves the page.",
  "No accounts, no logs. The site has no backend that knows who you are.",
];

const FAQ = [
  {
    q: "How does it actually break the link between deposits and withdrawals?",
    a: "Every deposit is a Poseidon2 commitment of (secret, nullifier). The pool stores commitments in a Merkle tree. To withdraw, you prove in zero-knowledge that you know a (secret, nullifier) whose commitment is in the tree, and that the corresponding nullifier hash hasn't been spent yet. The proof reveals the nullifier hash but not which commitment it came from — so an outside observer can't link your withdraw to a specific deposit.",
  },
  {
    q: "What's a relayer? Do I have to use one?",
    a: "If you withdraw to a fresh address that has zero balance, you can't pay the gas yourself. A relayer pays the gas for you and takes a small cut from the withdrawn amount. You don't have to use one — if you fund the recipient address through some other private route first, you can broadcast the withdraw yourself.",
  },
  {
    q: "What does it cost?",
    a: "1% protocol fee on each withdrawal, taken from the withdrawn amount. If you use a relayer, the relayer fee is on top of that — typically a few tenths of a percent. There's no fee on deposits.",
  },
  {
    q: "Can someone reverse what I did if they get my secret?",
    a: "If your secret leaks, the holder can withdraw your deposit before you do. Treat the note like a private key — back it up, don't paste it into chat, and consider using the in-browser encrypted note manager so you only need to remember a password.",
  },
  {
    q: "Is this audited?",
    a: "Not yet. We've done internal review and an automated security pass, but no third-party audit has happened. Don't deposit money you can't afford to lose until the audit lands.",
  },
];

/* ─── Component ──────────────────────────────────────────── */

export function Hero({ onEnterApp }: { onEnterApp: () => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Diagnostic wrapper. If the user reports "Open app not working",
  // the browser console will tell us in one click whether (a) the
  // event fires at all, (b) the parent's onEnterApp executes, and
  // (c) any synchronous error escapes. Once the click flow is
  // confirmed working end-to-end this can come back out.
  const handleOpenApp = () => {
    // eslint-disable-next-line no-console
    console.log("[Cashinviz] Open app clicked");
    try {
      onEnterApp();
      // eslint-disable-next-line no-console
      console.log("[Cashinviz] onEnterApp() returned");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Cashinviz] onEnterApp() threw:", e);
    }
  };

  return (
    <div className="hero-ambient relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      {/* ── Page-wide ambient layers ──
          Drifting orbs, sparks, and chain marks scattered across
          the full scroll length so the background stays alive when
          the user scrolls past the hero. Positions are percentages
          of the page height, hand-set so they don't cluster. */}

      {/* Drifting emerald orbs distributed top→bottom */}
      <span className="float-orb float-orb-1" aria-hidden />
      <span className="float-orb float-orb-2" aria-hidden />
      <span className="float-orb float-orb-3" aria-hidden />
      <span
        className="float-orb float-orb-1"
        style={{ top: "32%", left: "auto", right: "-100px" }}
        aria-hidden
      />
      <span
        className="float-orb float-orb-2"
        style={{ top: "55%", left: "-80px", right: "auto", bottom: "auto" }}
        aria-hidden
      />
      <span
        className="float-orb float-orb-3"
        style={{ top: "78%", left: "auto", right: "10%" }}
        aria-hidden
      />

      {/* Floating chain / token shape marks scattered through the page */}
      <svg className="float-chain float-chain-a" viewBox="0 0 32 32" style={{ top: "6%", left: "3%", width: 44, height: 44 }} aria-hidden>
        <path d="M16 3 L24 16 L16 19 Z" fill="currentColor" fillOpacity="0.85" />
        <path d="M16 3 L8 16 L16 19 Z" fill="currentColor" />
        <path d="M16 29 L24 18 L16 21 Z" fill="currentColor" fillOpacity="0.6" />
        <path d="M16 29 L8 18 L16 21 Z" fill="currentColor" fillOpacity="0.85" />
      </svg>
      <svg className="float-chain float-chain-d" viewBox="0 0 32 32" style={{ top: "3%", left: "47%", width: 30, height: 30 }} aria-hidden>
        <path d="M16 3 L18 14 L29 16 L18 18 L16 29 L14 18 L3 16 L14 14 Z" fill="currentColor" />
      </svg>
      <svg className="float-chain float-chain-d" viewBox="0 0 32 32" style={{ top: "5%", right: "4%", width: 48, height: 48 }} aria-hidden>
        <path d="M5 9 L24 9 L27 13 L8 13 Z" fill="currentColor" />
        <path d="M5 14.5 L24 14.5 L27 18.5 L8 18.5 Z" fill="currentColor" fillOpacity="0.85" />
        <path d="M5 20 L24 20 L27 24 L8 24 Z" fill="currentColor" fillOpacity="0.7" />
      </svg>
      <svg className="float-chain float-chain-b" viewBox="0 0 32 32" style={{ top: "18%", left: "2%", width: 38, height: 38 }} aria-hidden>
        <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <svg className="float-chain float-chain-a" viewBox="0 0 32 32" style={{ top: "22%", right: "3%", width: 42, height: 42 }} aria-hidden>
        <polygon points="16,4 28,26 4,26" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <svg className="float-chain float-chain-c" viewBox="0 0 32 32" style={{ top: "34%", left: "5%", width: 52, height: 52 }} aria-hidden>
        <polygon points="16,3 28,10 28,22 16,29 4,22 4,10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <svg className="float-chain float-chain-b" viewBox="0 0 32 32" style={{ top: "40%", right: "6%", width: 36, height: 36 }} aria-hidden>
        <polygon points="16,4 28,16 16,28 4,16" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <svg className="float-chain float-chain-c" viewBox="0 0 32 32" style={{ top: "52%", left: "44%", width: 34, height: 34 }} aria-hidden>
        <polygon points="11,4 21,4 28,11 28,21 21,28 11,28 4,21 4,11" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <svg className="float-chain float-chain-d" viewBox="0 0 32 32" style={{ top: "58%", left: "3%", width: 40, height: 40 }} aria-hidden>
        <path d="M16 3 L24 16 L16 19 Z" fill="currentColor" fillOpacity="0.85" />
        <path d="M16 3 L8 16 L16 19 Z" fill="currentColor" />
        <path d="M16 29 L24 18 L16 21 Z" fill="currentColor" fillOpacity="0.6" />
        <path d="M16 29 L8 18 L16 21 Z" fill="currentColor" fillOpacity="0.85" />
      </svg>
      <svg className="float-chain float-chain-a" viewBox="0 0 32 32" style={{ top: "66%", right: "4%", width: 44, height: 44 }} aria-hidden>
        <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <svg className="float-chain float-chain-b" viewBox="0 0 32 32" style={{ top: "76%", left: "6%", width: 38, height: 38 }} aria-hidden>
        <polygon points="16,4 28,26 4,26" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <svg className="float-chain float-chain-c" viewBox="0 0 32 32" style={{ top: "84%", right: "5%", width: 50, height: 50 }} aria-hidden>
        <polygon points="16,3 28,10 28,22 16,29 4,22 4,10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <svg className="float-chain float-chain-d" viewBox="0 0 32 32" style={{ top: "91%", left: "40%", width: 32, height: 32 }} aria-hidden>
        <polygon points="16,4 28,16 16,28 4,16" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      {/* Twinkling sparks scattered across the entire page */}
      {[
        ["8%", "22%", "0s"], ["14%", "62%", "0.6s"],
        ["20%", "12%", "1.2s"], ["28%", "82%", "1.8s"],
        ["35%", "30%", "2.4s"], ["42%", "68%", "0.3s"],
        ["49%", "20%", "1.0s"], ["56%", "74%", "1.6s"],
        ["63%", "12%", "2.0s"], ["70%", "62%", "0.9s"],
        ["77%", "26%", "1.4s"], ["84%", "70%", "2.2s"],
        ["90%", "34%", "0.4s"], ["94%", "58%", "1.7s"],
      ].map(([top, left, animationDelay]) => (
        <span
          key={`${top}-${left}`}
          className="float-spark"
          style={{ top, left, animationDelay }}
          aria-hidden
        />
      ))}

      {/* ── Nav ──
          Logo on the left, everything else (links + CTA) grouped on the
          right. Same Stripe / Linear / Vercel pattern. The max-width
          matches the hero container below (1180px) so the logo sits
          flush with the hero copy edge — no more nav items "floating
          in the middle". */}
      <nav className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--bg)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between px-6">
          <a
            href="#top"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
            aria-label="Cashinviz home"
          >
            <LogoMark className="h-6 w-6 text-[var(--text-primary)]" />
            <span className="text-[15px] font-semibold tracking-tight">
              Cashinviz
            </span>
          </a>
          <div className="flex items-center gap-7">
            <div className="hidden items-center gap-6 md:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <button
              onClick={handleOpenApp}
              className="btn-primary px-4 py-1.5 text-[13px]"
            >
              Open app
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ──
          Ambient layers (orbs / sparks / chain marks) live on the
          page wrapper above so they continue past the hero. This
          section just hosts content + a divider into the next
          section. */}
      <section
        id="top"
        className="relative border-b border-[var(--border-subtle)]"
      >
        <div className="relative mx-auto max-w-[1180px] px-6 pt-8 pb-10 md:pt-10 md:pb-14">
          {/* Two-column layout above lg breakpoint: copy on the
              left, browser-frame mockup on the right so the page
              isn't a wall of text with empty space below. Stacks
              vertically on tablet and mobile. */}
          <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            {/* ── Left column: copy + CTAs + facts ── */}
            <div>
              {/* Pre-launch badge */}
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm px-3 py-1 text-[11px] text-[var(--text-secondary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]" />
                Pre-launch · Sepolia testnet
              </div>

              {/* Headline — product definition in the Stripe /
                  Linear cadence. Accent on "privacy" since that's
                  the keyword the eye should land on. The negative
                  `text-indent` compensates for the capital "T"'s
                  optical side-bearing so it lines up flush with
                  the "l" in "layer" on the next line. */}
              <h1
                className="text-[48px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[60px] md:text-[68px] lg:text-[72px]"
                style={{ textIndent: "-0.05em" }}
              >
                The <span className="text-[var(--accent)]">privacy</span> layer
                for crypto.
              </h1>

              <p className="mt-5 max-w-[560px] text-[16px] leading-[1.6] text-[var(--text-secondary)]">
                Cashinviz is a non-custodial mixer that breaks the on-chain
                link between your deposit and your withdrawal using
                zero-knowledge proofs. No accounts. No logs. The secret that
                controls your funds is generated and used in your browser —
                it never reaches a server.
              </p>

              {/* CTAs */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenApp}
                  className="btn-primary px-6 py-3 text-[14px] shadow-[0_0_28px_-6px_var(--accent)]"
                >
                  Open app
                </button>
                <a
                  href="#how"
                  className="btn-secondary px-6 py-3 text-[14px]"
                >
                  How it works
                </a>
              </div>

              {/* Fact chips. Chain count matches the Comparison
                  table + Stats card: 9 EVM (Ethereum, Arbitrum,
                  Optimism, Base, Polygon, BNB, Avalanche, Gnosis,
                  Linea) plus 6 non-EVM via bridges (Bitcoin, Solana,
                  Monero, Cosmos, Tron, TON) = 15 total. */}
              <div className="mt-6 flex flex-wrap gap-2 text-[12px] text-[var(--text-secondary)]">
                {[
                  "MIT licensed",
                  "Client-side ZK proofs",
                  "15 chains supported",
                  "1% protocol fee",
                ].map((fact) => (
                  <span
                    key={fact}
                    className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]/70 backdrop-blur-sm px-2.5 py-1"
                  >
                    {fact}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Right column: privacy-flow diagram in a
                browser-frame mockup. */}
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)]/75 backdrop-blur-md shadow-elevation-3 overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]/70" />
                </div>
                <div className="ml-3 flex-1 max-w-[300px] rounded-md bg-[var(--bg)] border border-[var(--border-subtle)] px-2.5 py-1 font-mono text-[11px] text-[var(--text-muted)] truncate">
                  cashinviz.com / privacy-flow
                </div>
                <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Live
                </span>
              </div>

              {/* Diagram body */}
              <div className="p-5 sm:p-7">
                <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  How a single deposit looks on-chain
                </p>
                <FlowDiagram />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        id="how"
        className="mx-auto max-w-[960px] border-t border-[var(--border-subtle)] px-6 py-14"
      >
        <h2 className="text-[24px] font-semibold tracking-tight">
          How it works
        </h2>
        <div className="mt-6 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border)] md:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.n}
              className="bg-[var(--card)] p-6"
            >
              <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Step {item.n}
              </div>
              <div className="mt-2 text-[16px] font-semibold">
                {item.title}
              </div>
              <p className="mt-3 text-[13px] leading-[1.65] text-[var(--text-secondary)]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What's built in ── */}
      <section
        id="features"
        className="mx-auto max-w-[960px] border-t border-[var(--border-subtle)] px-6 py-14"
      >
        <FeatureShowcase />
      </section>

      {/* ── Networks ── */}
      <section
        id="networks"
        className="mx-auto max-w-[960px] border-t border-[var(--border-subtle)] px-6 py-14"
      >
        <h2 className="text-[24px] font-semibold tracking-tight">Networks</h2>
        <p className="mt-3 max-w-[560px] text-[13px] leading-[1.65] text-[var(--text-secondary)]">
          Native EVM deployment on 9 chains. Six non-EVM chains plug in via
          purpose-built bridges so a deposit anywhere in this list ends up in
          the same shielded pool. Sepolia is the live testnet target; mainnet
          rollout follows the audit.
        </p>

        <div className="mt-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] mb-3">
            EVM
          </p>
          <div className="flex flex-wrap gap-2">
            {EVM_NETWORKS.map((n) => (
              <span
                key={n}
                className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)]"
              >
                {n}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] mb-3">
            Non-EVM (via bridge)
          </p>
          <div className="flex flex-wrap gap-2">
            {NON_EVM_NETWORKS.map((n) => (
              <span
                key={n.name}
                className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)]"
              >
                <span className="text-[var(--text-primary)]">{n.name}</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span>{n.via}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Facts (replaces fake "trust" testimonials) ── */}
      <section className="mx-auto max-w-[960px] border-t border-[var(--border-subtle)] px-6 py-14">
        <h2 className="text-[24px] font-semibold tracking-tight">
          What you get
        </h2>
        <ul className="mt-6 space-y-4">
          {FACTS.map((line, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-[14px] leading-[1.65] text-[var(--text-secondary)]"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── FAQ ── */}
      <section
        id="faq"
        className="mx-auto max-w-[720px] border-t border-[var(--border-subtle)] px-6 py-14"
      >
        <h2 className="text-[24px] font-semibold tracking-tight">FAQ</h2>
        <div className="mt-6 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {FAQ.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-[14px] font-medium">{item.q}</span>
                  <span
                    className="text-[18px] leading-none text-[var(--text-muted)]"
                    aria-hidden
                  >
                    {isOpen ? "–" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <p className="pb-5 pr-8 text-[13px] leading-[1.7] text-[var(--text-secondary)]">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="mx-auto max-w-[720px] border-t border-[var(--border-subtle)] px-6 py-14">
        <h2 className="text-[24px] font-semibold tracking-tight">
          Ready to try it?
        </h2>
        <p className="mt-3 max-w-[480px] text-[13px] leading-[1.65] text-[var(--text-secondary)]">
          The app runs entirely client-side. Connecting a wallet is enough — no
          signup.
        </p>
        <button
          onClick={onEnterApp}
          className="btn-primary mt-6 px-5 py-2.5 text-[14px]"
        >
          Open app
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg)]">
        <div className="mx-auto flex max-w-[960px] flex-col gap-3 px-6 py-8 text-[12px] text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            Cashinviz · MIT licensed · cashinviz.com
          </div>
          <div className="flex items-center gap-5">
            <a
              href="https://github.com/" // TODO: replace with real repo URL
              className="hover:text-[var(--text-primary)]"
            >
              GitHub
            </a>
            <a href="#" className="hover:text-[var(--text-primary)]">
              Docs
            </a>
            <a href="#" className="hover:text-[var(--text-primary)]">
              Security
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
