"use client";

import { useState, useRef, useEffect } from "react";
import { type TokenInfo } from "@/lib/tokens";

interface TokenSelectorProps {
  tokens: TokenInfo[];
  selected: TokenInfo;
  onSelect: (token: TokenInfo) => void;
}

function TokenLogo({ token, size = 20 }: { token: TokenInfo; size?: number }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    // Fallback: colored circle with first letter
    return (
      <span
        className="rounded-full bg-[#6366f1]/20 flex items-center justify-center text-xs font-bold text-[#6366f1] flex-shrink-0"
        style={{ width: size, height: size }}
      >
        {token.symbol[0]}
      </span>
    );
  }

  return (
    <img
      src={token.logoUrl}
      alt={token.symbol}
      width={size}
      height={size}
      className="rounded-full flex-shrink-0"
      onError={() => setErrored(true)}
    />
  );
}

export function TokenSelector({ tokens, selected, onSelect }: TokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 hover:border-[#6366f1]/50 transition-colors"
      >
        <TokenLogo token={selected} size={22} />
        <span className="text-sm font-medium text-white">{selected.symbol}</span>
        <svg
          className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 min-w-[220px] bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-50 overflow-hidden">
          {tokens.map((token) => (
            <button
              key={token.address}
              onClick={() => {
                onSelect(token);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--card-hover)] transition-colors ${
                token.address === selected.address ? "bg-[var(--bg)]" : ""
              }`}
            >
              <TokenLogo token={token} size={24} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{token.symbol}</p>
                <p className="text-xs text-[var(--text-secondary)] truncate">{token.name}</p>
              </div>
              {token.address === selected.address && (
                <svg className="w-4 h-4 text-[#6366f1] ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
