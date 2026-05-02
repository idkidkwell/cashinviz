"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";

/**
 * Tracks chain changes and triggers a callback when the chain switches.
 * Does NOT disconnect — that causes UI jank. Instead, RainbowKit's
 * built-in chain switcher handles the "Switch Network" prompt smoothly.
 *
 * This hook just returns the chain change event so components can
 * reset their state instantly (e.g., token selector, denomination).
 */
export function useChainChange(onChainChange?: (newChainId: number) => void) {
  const { chain } = useAccount();
  const prevChainId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!chain) return;

    if (prevChainId.current !== undefined && prevChainId.current !== chain.id) {
      onChainChange?.(chain.id);
    }

    prevChainId.current = chain.id;
  }, [chain, onChainChange]);

  return chain?.id;
}
