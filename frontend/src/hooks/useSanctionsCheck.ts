"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  checkSanctions,
  isSanctionsCheckEnabled,
  type SanctionsResult,
} from "@/lib/sanctions";

export interface SanctionsState {
  /** undefined while still checking, true/false once resolved. */
  sanctioned: boolean | undefined;
  /** The full result, or null if not yet checked. */
  result: SanctionsResult | null;
  /** True while a check is in flight. */
  loading: boolean;
}

/**
 * Watches the connected wallet's address. The moment a wallet
 * connects (or switches accounts), it runs a Chainalysis check.
 * Components can read `sanctioned` to decide whether to render the
 * deposit / withdraw / transfer UI or a blocked banner instead.
 *
 * The check is opt-in via NEXT_PUBLIC_SKIP_SANCTIONS=1 in dev.
 */
export function useSanctionsCheck(): SanctionsState {
  const { address } = useAccount();
  const [state, setState] = useState<SanctionsState>({
    sanctioned: undefined,
    result: null,
    loading: false,
  });

  useEffect(() => {
    if (!address) {
      setState({ sanctioned: undefined, result: null, loading: false });
      return;
    }
    if (!isSanctionsCheckEnabled()) {
      setState({ sanctioned: false, result: null, loading: false });
      return;
    }

    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true }));

    checkSanctions(address, { signal: controller.signal })
      .then((result) => {
        setState({
          sanctioned: result.sanctioned,
          result,
          loading: false,
        });
      })
      .catch(() => {
        // Fail open at the hook level too — the underlying lib
        // already swallows network errors, so this catch is defence
        // in depth for unexpected rejections.
        setState({ sanctioned: false, result: null, loading: false });
      });

    return () => controller.abort();
  }, [address]);

  return state;
}
