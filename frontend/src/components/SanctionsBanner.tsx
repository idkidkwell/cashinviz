"use client";

import { useSanctionsCheck } from "@/hooks/useSanctionsCheck";

/**
 * Renders a hard block when the connected address is on a sanctions
 * list. Drop this component near the top of `page.tsx` (just above
 * the panels) — when the connected wallet hits, every panel below
 * stops mattering because the user is told to disconnect.
 *
 * No-op when:
 *   - No wallet is connected (the hook returns sanctioned = undefined)
 *   - The check is disabled in dev (NEXT_PUBLIC_SKIP_SANCTIONS=1)
 *   - The address is clean
 *
 * The "blocked" state is intentionally aggressive — full-bleed red
 * banner, no Close button. The whole point is the operator
 * (cashinviz.com itself) refuses to serve, even though the on-chain
 * protocol doesn't care. Forks / CLI / custom frontends still work.
 */
export function SanctionsBanner() {
  const { sanctioned, result } = useSanctionsCheck();

  if (!sanctioned) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[1000] border-b border-red-500/40 bg-red-950/95 backdrop-blur-md text-red-100 px-6 py-4 shadow-elevation-3"
    >
      <div className="mx-auto max-w-[960px] flex items-start gap-3">
        <svg
          className="mt-0.5 h-5 w-5 shrink-0 text-red-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <circle cx="12" cy="16" r="0.5" fill="currentColor" />
        </svg>
        <div className="flex-1">
          <p className="text-[14px] font-semibold">
            This address is on a sanctions list.
          </p>
          <p className="mt-1 text-[12.5px] leading-[1.5] text-red-200">
            cashinviz.com cannot serve interfaces to addresses identified by
            OFAC or other sanctions authorities. The on-chain protocol does
            not block anyone — but this hosted frontend does. Disconnect and
            try a different address, or run a self-hosted instance from the
            open-source repository.
          </p>
          {result?.identifications.length ? (
            <ul className="mt-2 space-y-0.5 text-[11.5px] text-red-200/80">
              {result.identifications.slice(0, 3).map((id, i) => (
                <li key={i}>
                  · {id.source}
                  {id.name ? ` — ${id.name}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
