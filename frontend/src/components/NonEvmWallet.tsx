"use client";

import { useState, useCallback } from "react";

// Wallet provider detection and connection for non-EVM chains
// Each wallet injects a global object we can detect and call

interface WalletDef {
  name: string;
  icon: string;       // single-letter
  color: string;      // bg color for icon
  type: "browser" | "hardware";
  detect: () => boolean;
  connect: () => Promise<string>;
  installUrl: string;
}

// Distinct brand colors per wallet
const WALLET_COLORS: Record<string, string> = {
  "Phantom": "#ab9ff2",
  "Solflare": "#fc822b",
  "Backpack": "#e33e3f",
  "MetaMask": "#f6851b",
  "Trust Wallet": "#3375bb",
  "Coinbase Wallet": "#0052ff",
  "Ledger": "#000000",
  "Trezor": "#00854d",
  "OKX Wallet": "#000000",
  "Exodus": "#8b5cf6",
  "Brave Wallet": "#fb542b",
  "Unisat": "#e8540a",
  "Xverse": "#ee7a30",
  "Leather (Hiro)": "#12100f",
  "Keplr": "#4b68f9",
  "Leap": "#32d583",
  "Cosmostation": "#9c6cff",
  "TronLink": "#e53e3e",
  "Tonkeeper": "#45aef5",
  "MyTonWallet": "#0088cc",
  "OpenMask": "#69a0f7",
  "Cake Wallet": "#1ba7e8",
  "Bitget Wallet": "#00ceb4",
  "TokenPocket": "#2980fe",
  "imToken": "#11c4d1",
  "Klever": "#a855f7",
  "Edge Wallet": "#0073d1",
  "Coldcard": "#1a1a2e",
  "Torus": "#0364ff",
  "MathWallet": "#000000",
  "Sparrow": "#8b5e3c",
  "BlueWallet": "#2563eb",
  "Electrum": "#1e3a5f",
  "TON Space": "#0088cc",
  "TonHub": "#1da1f2",
  "Tonhub Sandbox": "#6b7280",
  "Feather Wallet": "#ff6600",
  "Monero GUI": "#ff6600",
  "MyMonero": "#ff6600",
  "Monerujo": "#ff6600",
};

// Helper: generic provider-based wallet
function w(
  name: string,
  icon: string,
  type: "browser" | "hardware",
  detectPath: string | null,
  connectFn: (() => Promise<string>) | null,
  installUrl: string,
  customDetect?: () => boolean,
): WalletDef {
  return {
    name,
    icon,
    color: WALLET_COLORS[name] ?? "#4b5563",
    type,
    detect: customDetect ?? (() => {
      if (!detectPath || typeof window === "undefined") return false;
      const parts = detectPath.split(".");
      let obj: any = window;
      for (const p of parts) { obj = obj?.[p]; if (!obj) return false; }
      return true;
    }),
    connect: connectFn ?? (async () => { throw new Error(`${name} connection not available in this environment`); }),
    installUrl,
  };
}

function getWalletsForChain(chainId: string): WalletDef[] {
  switch (chainId) {
    case "solana":
      return [
        w("Phantom", "P", "browser", "phantom.solana", async () => {
          const resp = await (window as any).phantom.solana.connect();
          return resp.publicKey.toString();
        }, "https://phantom.app/"),
        w("Solflare", "S", "browser", "solflare", async () => {
          const p = (window as any).solflare; await p.connect();
          return p.publicKey.toString();
        }, "https://solflare.com/"),
        w("Backpack", "B", "browser", "backpack.solana", async () => {
          const resp = await (window as any).backpack.solana.connect();
          return resp.publicKey.toString();
        }, "https://backpack.app/"),
        w("Coinbase Wallet", "C", "browser", "coinbaseSolana", async () => {
          const resp = await (window as any).coinbaseSolana.connect();
          return resp.publicKey.toString();
        }, "https://www.coinbase.com/wallet"),
        w("Trust Wallet", "T", "browser", "trustwallet.solana", async () => {
          const resp = await (window as any).trustwallet.solana.connect();
          return resp.publicKey.toString();
        }, "https://trustwallet.com/"),
        w("Exodus", "E", "browser", "exodus.solana", async () => {
          const resp = await (window as any).exodus.solana.connect();
          return resp.publicKey.toString();
        }, "https://www.exodus.com/"),
        w("Brave Wallet", "B", "browser", null, async () => {
          const resp = await (window as any).solana.connect();
          return resp.publicKey.toString();
        }, "https://brave.com/wallet/", () => typeof window !== "undefined" && !!(window as any).solana?.isBraveWallet),
        w("Torus", "T", "browser", null, async () => {
          const resp = await (window as any).solana.connect();
          return resp.publicKey.toString();
        }, "https://tor.us/", () => typeof window !== "undefined" && !!(window as any).solana?.isTorus),
        w("MetaMask (via Snaps)", "M", "browser", "ethereum.isMetaMask", async () => {
          // MetaMask does NOT natively support Solana.
          // Users need a dedicated Solana wallet like Phantom or Solflare.
          throw new Error("MetaMask doesn't support Solana directly. Use Phantom, Solflare, or Backpack for Solana — or enter your address manually below.");
        }, "https://metamask.io/"),
        w("MathWallet", "M", "browser", null, async () => {
          const resp = await (window as any).solana.connect();
          return resp.publicKey.toString();
        }, "https://mathwallet.org/", () => typeof window !== "undefined" && !!(window as any).solana?.isMathWallet),
        w("OKX Wallet", "O", "browser", "okxwallet.solana", async () => {
          const resp = await (window as any).okxwallet.solana.connect();
          return resp.publicKey.toString();
        }, "https://www.okx.com/web3"),
        w("Bitget Wallet", "B", "browser", "bitkeep.solana", async () => {
          const resp = await (window as any).bitkeep.solana.connect();
          return resp.publicKey.toString();
        }, "https://web3.bitget.com/"),
        w("Ledger", "L", "hardware", null, null, "https://www.ledger.com/"),
        w("Trezor", "T", "hardware", null, null, "https://trezor.io/"),
      ];
    case "bitcoin":
      return [
        w("Unisat", "U", "browser", "unisat", async () => {
          const accounts = await (window as any).unisat.requestAccounts();
          return accounts[0];
        }, "https://unisat.io/"),
        w("Xverse", "X", "browser", "XverseProviders", async () => {
          const resp = await (window as any).XverseProviders.BitcoinProvider.request("getAccounts", null);
          return resp.result[0].address;
        }, "https://www.xverse.app/"),
        w("OKX Wallet", "O", "browser", "okxwallet.bitcoin", async () => {
          const result = await (window as any).okxwallet.bitcoin.connect();
          return result.address;
        }, "https://www.okx.com/web3"),
        w("Leather (Hiro)", "H", "browser", "LeatherProvider", async () => {
          const resp = await (window as any).LeatherProvider.request("getAddresses");
          return resp.result.addresses[0].address;
        }, "https://leather.io/"),
        w("Phantom", "P", "browser", "phantom.bitcoin", async () => {
          const accounts = await (window as any).phantom.bitcoin.requestAccounts();
          return accounts[0].address;
        }, "https://phantom.app/"),
        w("Trust Wallet", "T", "browser", "trustwallet.bitcoin", async () => {
          const accounts = await (window as any).trustwallet.bitcoin.requestAccounts();
          return accounts[0];
        }, "https://trustwallet.com/"),
        w("Coinbase Wallet", "C", "browser", "coinbaseWalletExtension", null, "https://www.coinbase.com/wallet"),
        w("MetaMask (Snaps)", "M", "browser", null, null, "https://snaps.metamask.io/", () => typeof window !== "undefined" && !!(window as any).ethereum?.isMetaMask),
        w("Sparrow", "S", "browser", null, null, "https://sparrowwallet.com/"),
        w("BlueWallet", "B", "browser", null, null, "https://bluewallet.io/"),
        w("Electrum", "E", "browser", null, null, "https://electrum.org/"),
        w("Ledger", "L", "hardware", null, null, "https://www.ledger.com/"),
        w("Trezor", "T", "hardware", null, null, "https://trezor.io/"),
        w("Coldcard", "C", "hardware", null, null, "https://coldcard.com/"),
      ];
    case "cosmos":
      return [
        w("Keplr", "K", "browser", "keplr", async () => {
          const k = (window as any).keplr; await k.enable("cosmoshub-4");
          const s = k.getOfflineSigner("cosmoshub-4"); const a = await s.getAccounts();
          return a[0].address;
        }, "https://www.keplr.app/"),
        w("Leap", "L", "browser", "leap", async () => {
          const l = (window as any).leap; await l.enable("cosmoshub-4");
          const s = l.getOfflineSigner("cosmoshub-4"); const a = await s.getAccounts();
          return a[0].address;
        }, "https://www.leapwallet.io/"),
        w("Cosmostation", "C", "browser", "cosmostation.providers.keplr", async () => {
          const k = (window as any).cosmostation.providers.keplr;
          await k.enable("cosmoshub-4");
          const s = k.getOfflineSigner("cosmoshub-4"); const a = await s.getAccounts();
          return a[0].address;
        }, "https://cosmostation.io/"),
        w("OKX Wallet", "O", "browser", "okxwallet.keplr", async () => {
          const k = (window as any).okxwallet.keplr;
          await k.enable("cosmoshub-4");
          const s = k.getOfflineSigner("cosmoshub-4"); const a = await s.getAccounts();
          return a[0].address;
        }, "https://www.okx.com/web3"),
        w("Trust Wallet", "T", "browser", "trustwallet.cosmos", null, "https://trustwallet.com/"),
        w("Exodus", "E", "browser", "exodus.cosmos", null, "https://www.exodus.com/"),
        w("MetaMask (Snaps)", "M", "browser", null, null, "https://snaps.metamask.io/", () => typeof window !== "undefined" && !!(window as any).ethereum?.isMetaMask),
        w("Ledger", "L", "hardware", null, null, "https://www.ledger.com/"),
      ];
    case "tron":
      return [
        w("TronLink", "T", "browser", "tronLink", async () => {
          const res = await (window as any).tronLink.request({ method: "tron_requestAccounts" });
          if (res.code === 200) return (window as any).tronWeb.defaultAddress.base58;
          throw new Error("TronLink rejected");
        }, "https://www.tronlink.org/"),
        w("OKX Wallet", "O", "browser", "okxwallet.tronLink", async () => {
          const res = await (window as any).okxwallet.tronLink.request({ method: "tron_requestAccounts" });
          return res.address;
        }, "https://www.okx.com/web3"),
        w("Trust Wallet", "T", "browser", "trustwallet.tron", null, "https://trustwallet.com/"),
        w("TokenPocket", "T", "browser", "tokenpocket.tron", null, "https://www.tokenpocket.pro/"),
        w("imToken", "i", "browser", "imToken", null, "https://token.im/"),
        w("Bitget Wallet", "B", "browser", "bitkeep.tronLink", async () => {
          const res = await (window as any).bitkeep.tronLink.request({ method: "tron_requestAccounts" });
          return res.address;
        }, "https://web3.bitget.com/"),
        w("Klever", "K", "browser", "klever", null, "https://klever.io/"),
        w("Coinbase Wallet", "C", "browser", "coinbaseWalletExtension", null, "https://www.coinbase.com/wallet"),
        w("Ledger", "L", "hardware", null, null, "https://www.ledger.com/"),
      ];
    case "ton":
      return [
        w("Tonkeeper", "T", "browser", "tonkeeper", async () => {
          const r = await (window as any).tonkeeper.send("ton_requestAccounts");
          return r[0];
        }, "https://tonkeeper.com/"),
        w("MyTonWallet", "M", "browser", "mytonwallet", async () => {
          const r = await (window as any).mytonwallet.send("ton_requestAccounts");
          return r[0];
        }, "https://mytonwallet.io/"),
        w("TON Space", "T", "browser", "tonspace", null, "https://tonspace.co/"),
        w("OpenMask", "O", "browser", "openMask", async () => {
          const r = await (window as any).openMask.send("ton_requestAccounts");
          return r[0];
        }, "https://www.openmask.app/"),
        w("TonHub", "T", "browser", "tonhub", null, "https://tonhub.com/"),
        w("Tonhub Sandbox", "S", "browser", "tonhubSandbox", null, "https://sandbox.tonhub.com/"),
        w("Trust Wallet", "T", "browser", "trustwallet.ton", null, "https://trustwallet.com/"),
        w("OKX Wallet", "O", "browser", "okxwallet.ton", null, "https://www.okx.com/web3"),
        w("Ledger", "L", "hardware", null, null, "https://www.ledger.com/"),
      ];
    case "monero":
      return [
        w("Cake Wallet", "C", "browser", null, null, "https://cakewallet.com/"),
        w("Feather Wallet", "F", "browser", null, null, "https://featherwallet.org/"),
        w("Monero GUI", "M", "browser", null, null, "https://www.getmonero.org/downloads/"),
        w("MyMonero", "M", "browser", null, null, "https://mymonero.com/"),
        w("Edge Wallet", "E", "browser", null, null, "https://edge.app/"),
        w("Monerujo", "M", "browser", null, null, "https://www.monerujo.io/"),
        w("Ledger", "L", "hardware", null, null, "https://www.ledger.com/"),
        w("Trezor", "T", "hardware", null, null, "https://trezor.io/"),
      ];
    default:
      return [];
  }
}

interface Props {
  chainId: string;
  chainLabel: string;
  chainIcon: string;
  chainColor: string;
}

export function NonEvmWallet({ chainId, chainLabel, chainIcon, chainColor }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState("");

  const wallets = getWalletsForChain(chainId);
  const isMonero = chainId === "monero";

  const handleConnect = useCallback(async (wallet: WalletDef) => {
    setError(null);

    // Hardware wallets — open their app/site
    if (wallet.type === "hardware") {
      window.open(wallet.installUrl, "_blank");
      setError(`Connect ${wallet.name} via its companion app, then enter your address below.`);
      return;
    }

    // Deep link map for mobile wallets / iframe-blocked wallets
    const dappUrl = encodeURIComponent(window.location.origin);
    const deepLinks: Record<string, string> = {
      "Trust Wallet": `https://link.trustwallet.com/open_url?coin_id=501&url=${dappUrl}`,
      "MetaMask": `https://metamask.app.link/dapp/${window.location.host}`,
      "Coinbase Wallet": `https://go.cb-w.com/dapp?cb_url=${dappUrl}`,
      "OKX Wallet": `https://www.okx.com/download`,
      "Bitget Wallet": `https://web3.bitget.com/`,
      "TokenPocket": `https://www.tokenpocket.pro/`,
    };

    // Check if site is in an iframe (causes Trust Wallet "frames-disallowed")
    const isInIframe = window.self !== window.top;

    // If in iframe and this wallet has known iframe issues, use deep link directly
    if (isInIframe && deepLinks[wallet.name]) {
      window.open(deepLinks[wallet.name], "_blank");
      setError(`${wallet.name} can't connect inside an embedded frame. Opening ${wallet.name} — or open this site directly in your browser at ${window.location.origin}`);
      return;
    }

    // Check if wallet is installed
    if (!wallet.detect()) {
      window.open(wallet.installUrl, "_blank");
      setError(`${wallet.name} not detected — opening install page. After installing, refresh and try again.`);
      return;
    }

    setConnecting(wallet.name);
    try {
      // Race the connect call against a 15s timeout to prevent hanging
      const address = await Promise.race([
        wallet.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Connection timed out")), 15000)
        ),
      ]);
      setConnectedAddress(address);
      setShowModal(false);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("timeout") || msg.includes("Timeout") || msg.includes("JSON-RPC")) {
        setError(`${wallet.name} connection timed out. Make sure the wallet extension is unlocked and try again.`);
      } else if (msg.includes("frames-disallowed") || msg.includes("iframe") || msg.includes("blocked")) {
        const link = deepLinks[wallet.name];
        if (link) {
          window.open(link, "_blank");
          setError(`${wallet.name} blocked this connection. Opening deep link — or open ${window.location.origin} directly in your browser.`);
        } else {
          setError(`${wallet.name} blocked the connection. Open this site directly in your browser (not in an iframe) and try again.`);
        }
      } else if (msg.includes("User rejected") || msg.includes("rejected") || msg.includes("denied")) {
        setError(`Connection rejected. Please approve the request in ${wallet.name} to connect.`);
      } else {
        setError(msg || `Failed to connect ${wallet.name}`);
      }
    } finally {
      setConnecting(null);
    }
  }, []);

  const handleManualConnect = () => {
    if (manualAddress.trim()) {
      setConnectedAddress(manualAddress.trim());
      setShowModal(false);
    }
  };

  const truncate = (addr: string) =>
    addr.length > 14 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  // Already connected
  if (connectedAddress) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--card)] border border-emerald-400/30">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className={`font-bold text-sm ${chainColor}`}>{chainIcon}</span>
          <span className="text-sm text-white font-mono">{truncate(connectedAddress)}</span>
        </div>
        <button
          onClick={() => {
            setConnectedAddress(null);
            setManualAddress("");
          }}
          className="px-2 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--card)] border border-[var(--border)] hover:border-red-500/30 transition-all"
          title="Disconnect"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowModal(!showModal)}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-[#6366f1] text-white hover:bg-[#6366f1]/80 btn-glow transition-all"
      >
        Connect Wallet
      </button>

      {showModal && (
        <div className="absolute top-full right-0 mt-2 z-50 w-80 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl shadow-black/50 animate-fade-in overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-[var(--border)]">
            <p className="text-sm font-semibold text-white">
              Connect to {chainLabel}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {isMonero
                ? "Enter your Monero address to receive funds"
                : `Select a ${chainLabel}-compatible wallet`}
            </p>
          </div>

          {/* Wallet list */}
          {wallets.length > 0 && (
            <div className="p-2 max-h-72 overflow-y-auto">
              {wallets.map((wallet) => {
                const detected = wallet.detect();
                const isConnecting = connecting === wallet.name;
                return (
                  <button
                    key={wallet.name}
                    onClick={() => handleConnect(wallet)}
                    disabled={isConnecting}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[var(--card-hover)] transition-all group disabled:opacity-50"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-sm font-bold"
                      style={{ backgroundColor: wallet.color }}
                    >
                      {wallet.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white font-medium">{wallet.name}</p>
                        {detected ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400">
                            Detected
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]">
                            Install
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {isConnecting
                          ? "Connecting..."
                          : wallet.type === "hardware"
                          ? "Hardware wallet"
                          : "Browser / Mobile"}
                      </p>
                    </div>
                    {isConnecting && (
                      <div className="w-4 h-4 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Manual address input — always available as fallback */}
          <div className="px-3 pb-3 pt-1">
            {wallets.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-[10px] text-[var(--text-muted)]">or enter address manually</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder={`${chainLabel} address`}
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-white placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none"
              />
              <button
                onClick={handleManualConnect}
                disabled={!manualAddress.trim()}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-[#6366f1] text-white hover:bg-[#6366f1]/80 disabled:opacity-30 transition-all"
              >
                Connect
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="px-4 py-2 border-t border-red-500/20 bg-red-500/5">
              <p className="text-[11px] text-red-400">{error}</p>
            </div>
          )}

          <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--card-hover)]">
            <p className="text-[10px] text-[var(--text-muted)] text-center">
              {isMonero
                ? "Monero transactions use atomic swaps — no browser extension needed"
                : "Wallet not detected? It will open the install page"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
