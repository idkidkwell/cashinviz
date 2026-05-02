"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { config } from "@/lib/wagmi";
import { mainnet } from "wagmi/chains";
import { useState, useEffect, useMemo } from "react";
import "@rainbow-me/rainbowkit/styles.css";

// Module-level QueryClient — don't recreate on every render or wagmi
// re-subscribes to every hook and triggers a fresh RPC storm.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't refetch chain/account metadata while the user is just
      // mousing toward the Connect button.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function useIsDark() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => setIsDark(!document.documentElement.classList.contains("light"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const isDark = useIsDark();

  const theme = useMemo(
    () =>
      isDark
        ? darkTheme({
            accentColor: "#6366f1",
            accentColorForeground: "white",
            borderRadius: "medium",
          })
        : lightTheme({
            accentColor: "#6366f1",
            accentColorForeground: "white",
            borderRadius: "medium",
          }),
    [isDark],
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={theme}
          modalSize="compact"
          initialChain={mainnet}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
