"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Hero } from "@/components/Hero";
import { SanctionsBanner } from "@/components/SanctionsBanner";
import { FeatureShowcase } from "@/components/FeatureShowcase";
import { DepositPanel } from "@/components/DepositPanel";
import { WithdrawPanel } from "@/components/WithdrawPanel";
import { ShieldedTransferPanel } from "@/components/ShieldedTransferPanel";
import { NoteManager } from "@/components/NoteManager";
import { Stats } from "@/components/Stats";
import { PrivacyScore } from "@/components/PrivacyScore";
import { SocialRecovery } from "@/components/SocialRecovery";
import { YieldPool } from "@/components/YieldPool";
import { StealthAddressPanel } from "@/components/StealthAddressPanel";
import { ProofOfInnocencePanel } from "@/components/ProofOfInnocencePanel";
import { PrivateDeFiPanel } from "@/components/PrivateDeFiPanel";
import { TimeLockPanel } from "@/components/TimeLockPanel";
import { MultiPathPanel } from "@/components/MultiPathPanel";
import { LoyaltyPanel } from "@/components/LoyaltyPanel";
import { MEVShieldPanel } from "@/components/MEVShieldPanel";
import { ChainBridgePanel } from "@/components/ChainBridgePanel";
import { MixingModeSelector } from "@/components/MixingModeSelector";
import { NonEvmWallet } from "@/components/NonEvmWallet";
import { PrivacyDashboard } from "@/components/PrivacyDashboard";
import { TransactionGraphVisualizer } from "@/components/TransactionGraphVisualizer";
import { DeveloperSDKPanel } from "@/components/DeveloperSDKPanel";
import { ComplianceExport } from "@/components/ComplianceExport";
import { GasOptimizer } from "@/components/GasOptimizer";
import { PrivateNFTPurchase } from "@/components/PrivateNFTPurchase";
import { PrivateDAOVoting } from "@/components/PrivateDAOVoting";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher, useLanguage } from "@/components/LanguageSwitcher";
import { t } from "@/lib/i18n";
import { TorSettingsPanel } from "@/components/TorSettingsPanel";
import { AIDecoyPanel } from "@/components/AIDecoyPanel";
import { EncryptionPanel } from "@/components/EncryptionPanel";
import { ExchangeLiquidityPanel } from "@/components/ExchangeLiquidityPanel";
import { PrivacyAuditor } from "@/components/PrivacyAuditor";
import { DarkPool } from "@/components/DarkPool";
import { PrivacyRelayNetwork } from "@/components/PrivacyRelayNetwork";
import { ZKIdentity } from "@/components/ZKIdentity";
import { DeadDrops } from "@/components/DeadDrops";
import { GhostMode } from "@/components/GhostMode";
import { PrivacyMiddleware } from "@/components/PrivacyMiddleware";
import { ChainIcon } from "@/components/ChainIcons";
import { CommandPalette } from "@/components/CommandPalette";
import { PoolActivityStrip } from "@/components/PoolActivityStrip";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

/* ─── SVG Icon Components ────────────────────── */

function IconDeposit() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v9m0 0l-3-3m3 3l3-3M3 13h10" />
    </svg>
  );
}
function IconWithdraw() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 14V5m0 0L5 8m3-3l3 3M3 2h10" />
    </svg>
  );
}
function IconTransfer() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5h12m0 0l-3-3m3 3l-3 3M14 11H2m0 0l3-3m-3 3l3 3" />
    </svg>
  );
}
function IconNotes() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="10" height="12" rx="1.5" />
      <path d="M6 5h4M6 8h4M6 11h2" />
    </svg>
  );
}
function IconTimeLock() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8.5" r="4.5" />
      <path d="M8 6.5v2.5l1.5 1M6 3h4" />
    </svg>
  );
}
function IconMultiPath() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="3" cy="8" r="1.5" />
      <circle cx="13" cy="4" r="1.5" />
      <circle cx="13" cy="12" r="1.5" />
      <path d="M4.5 8h3l3-4h1.5M7.5 8l3 4h1.5" />
    </svg>
  );
}
function IconStealth() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5S1 8 1 8z" />
      <circle cx="8" cy="8" r="2" />
      <path d="M2 2l12 12" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5L2.5 4v4c0 3.5 2.5 5.5 5.5 6.5 3-1 5.5-3 5.5-6.5V4L8 1.5z" />
      <path d="M6 8l1.5 1.5L10 6" />
    </svg>
  );
}
function IconCompliance() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5L2.5 4v4c0 3.5 2.5 5.5 5.5 6.5 3-1 5.5-3 5.5-6.5V4L8 1.5z" />
    </svg>
  );
}
function IconTor() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="3" />
      <circle cx="8" cy="8" r="0.75" fill="currentColor" />
    </svg>
  );
}
function IconDecoy() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4.5C12 6.5 10 9 8 11 6 9 4 6.5 4 4.5a4 4 0 118 0z" />
      <circle cx="8" cy="4.5" r="1" />
      <path d="M5 13h6" />
    </svg>
  );
}
function IconEncryption() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
      <circle cx="8" cy="10.5" r="1" fill="currentColor" />
    </svg>
  );
}
function IconYield() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 13l3-4 3 2 4-6 2 2" />
      <path d="M11 5h2v2" />
    </svg>
  );
}
function IconSwap() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="6" r="3" />
      <circle cx="10.5" cy="10" r="3" />
    </svg>
  );
}
function IconNFT() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M2 10l3-3 2 2 3-3 4 4" />
      <circle cx="10" cy="5.5" r="1" />
    </svg>
  );
}
function IconDAO() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="3.5" r="2" />
      <circle cx="3.5" cy="11" r="2" />
      <circle cx="12.5" cy="11" r="2" />
      <path d="M8 5.5v2.5L3.5 9M8 8l4.5 1" />
    </svg>
  );
}
function IconDarkPool() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2C5 2 3 5 3 8s2 6 5 6 5-3 5-6-2-6-5-6z" />
      <path d="M8 2c1.5 0 2.5 3 2.5 6s-1 6-2.5 6" />
      <path d="M3.5 6h9M3.5 10h9" />
    </svg>
  );
}
function IconRelay() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M4 6.5 A4 4 0 0 1 12 6.5" />
      <path d="M5 9.5 A3 3 0 0 0 11 9.5" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}
function IconGas() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14V3.5a1.5 1.5 0 011.5-1.5h4A1.5 1.5 0 0111 3.5V14M4 7h7" />
      <path d="M11 5l1.5 1.5v3a1 1 0 002 0V6" />
      <path d="M3 14h10" />
    </svg>
  );
}
function IconLiquidity() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2s4 3.5 4 7a4 4 0 11-8 0c0-3.5 4-7 4-7z" />
    </svg>
  );
}
function IconLoyalty() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="8,1.5 9.8,5.3 14,5.8 10.9,8.6 11.8,12.8 8,10.7 4.2,12.8 5.1,8.6 2,5.8 6.2,5.3" />
    </svg>
  );
}
function IconRecovery() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8a6 6 0 0111.96-.75" />
      <path d="M14 8a6 6 0 01-11.96.75" />
      <path d="M14 4v4h-4M2 12V8h4" />
    </svg>
  );
}
function IconGhost() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14v-4a4 4 0 118 0v4l-1.5-1.5L9 14l-1-1.5L7 14l-1.5-1.5L4 14z" />
      <circle cx="6.5" cy="8" r="0.75" fill="currentColor" />
      <circle cx="9.5" cy="8" r="0.75" fill="currentColor" />
    </svg>
  );
}
function IconAuditor() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
      <path d="M5.5 7h3M7 5.5v3" />
    </svg>
  );
}
function IconMiddleware() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
      <path d="M7 4.5h2v7h-2" />
    </svg>
  );
}
function IconDashboard() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="3" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="7" width="5" height="7" rx="1" />
    </svg>
  );
}
function IconGraph() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="4" cy="4" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="8" cy="12" r="1.5" />
      <path d="M5.2 5.2l2.3 5.3M10.8 5.2l-2.3 5.3M5.5 4h5" />
    </svg>
  );
}
function IconSDK() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4L2 8l3 4M11 4l3 4-3 4M9 2l-2 12" />
    </svg>
  );
}
function IconZKID() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
      <circle cx="6" cy="7" r="1.5" />
      <path d="M9 6h2.5M9 9h2.5M4.5 10.5c0-1 .7-1.5 1.5-1.5s1.5.5 1.5 1.5" />
    </svg>
  );
}
function IconExport() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v7m0 0l-2.5-2.5M8 9l2.5-2.5" />
      <path d="M3 11v2.5h10V11" />
    </svg>
  );
}
function IconDeadDrop() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 5l5.5 3.5L13.5 5" />
      <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" />
    </svg>
  );
}

/* ─── Tab / Nav Types ────────────────────────── */

type Tab =
  | "deposit" | "withdraw" | "transfer" | "notes"
  | "stealth" | "mevshield" | "timelock" | "multipath" | "tor" | "decoys" | "ghost" | "encryption"
  | "yield" | "defi" | "nft" | "dao" | "darkpool" | "loyalty"
  | "auditor" | "graph" | "middleware" | "relay" | "gas" | "liquidity"
  | "zkid" | "compliance" | "deaddrops" | "export" | "recovery" | "sdk"
  | "dashboard";

interface NavItem {
  id: Tab;
  label: string;
  icon: React.ComponentType;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

/* Primary sections — the core mixer experience.
   Mixing modes are picked inline inside Deposit, so no standalone tab for them.
   Chain Bridge auto-activates inside Deposit for non-EVM chains.
   Time Lock + Multi-Path are withdrawal strategies and live under Privacy. */
const NAV_PRIMARY: NavSection[] = [
  {
    label: "Core",
    items: [
      { id: "deposit", label: "Deposit", icon: IconDeposit },
      { id: "withdraw", label: "Withdraw", icon: IconWithdraw },
      { id: "transfer", label: "Transfer", icon: IconTransfer },
      { id: "notes", label: "Notes", icon: IconNotes },
    ],
  },
  {
    label: "Privacy",
    items: [
      { id: "stealth", label: "Stealth Address", icon: IconStealth },
      { id: "mevshield", label: "MEV Shield", icon: IconShield },
      { id: "timelock", label: "Time Lock", icon: IconTimeLock },
      { id: "multipath", label: "Multi-Path", icon: IconMultiPath },
      { id: "tor", label: "Tor Network", icon: IconTor },
      { id: "decoys", label: "AI Decoys", icon: IconDecoy },
      { id: "ghost", label: "Ghost Mode", icon: IconGhost },
      { id: "encryption", label: "Encryption", icon: IconEncryption },
    ],
  },
  {
    label: "DeFi",
    items: [
      { id: "yield", label: "Yield", icon: IconYield },
      { id: "defi", label: "Swap & Lend", icon: IconSwap },
      { id: "nft", label: "Private NFTs", icon: IconNFT },
      { id: "dao", label: "DAO Voting", icon: IconDAO },
      { id: "darkpool", label: "Dark Pool", icon: IconDarkPool },
      { id: "loyalty", label: "Loyalty", icon: IconLoyalty },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "auditor", label: "Privacy Auditor", icon: IconAuditor },
      { id: "graph", label: "TX Graph", icon: IconGraph },
      { id: "middleware", label: "Middleware", icon: IconMiddleware },
      { id: "relay", label: "Relay Network", icon: IconRelay },
      { id: "gas", label: "Gas Optimizer", icon: IconGas },
      { id: "liquidity", label: "Liquidity", icon: IconLiquidity },
    ],
  },
];

/* Utility section — account, identity, and developer docs. */
const NAV_UTILITY: NavSection[] = [
  {
    label: "Account",
    items: [
      { id: "zkid", label: "ZK Identity", icon: IconZKID },
      { id: "compliance", label: "Innocence Proof", icon: IconCompliance },
      { id: "deaddrops", label: "Dead Drops", icon: IconDeadDrop },
      { id: "export", label: "Export Data", icon: IconExport },
      { id: "recovery", label: "Recovery", icon: IconRecovery },
      { id: "sdk", label: "SDK Docs", icon: IconSDK },
    ],
  },
];

/* Combined for lookups */
const NAV = [...NAV_PRIMARY, ...NAV_UTILITY];

/* ─── Chain Data ─────────────────────────────── */

const EVM_CHAINS = [
  { id: "ethereum", label: "Ethereum", color: "#627EEA" },
  { id: "arbitrum", label: "Arbitrum", color: "#28A0F0" },
  { id: "optimism", label: "Optimism", color: "#FF0420" },
  { id: "base", label: "Base", color: "#0052FF" },
  { id: "polygon", label: "Polygon", color: "#8247E5" },
  { id: "bsc", label: "BNB Chain", color: "#F0B90B" },
  { id: "avalanche", label: "Avalanche", color: "#E84142" },
  { id: "gnosis", label: "Gnosis", color: "#04795B" },
  { id: "linea", label: "Linea", color: "#61DFFF" },
];

const OTHER_CHAINS = [
  { id: "bitcoin", label: "Bitcoin", color: "#F7931A", wallets: ["Xverse", "Unisat", "Ledger"] },
  { id: "solana", label: "Solana", color: "#9945FF", wallets: ["Phantom", "Solflare", "Ledger"] },
  { id: "monero", label: "Monero", color: "#FF6600", wallets: ["Feather", "Monero GUI", "Ledger"] },
  { id: "cosmos", label: "Cosmos", color: "#6F7390", wallets: ["Keplr", "Leap", "Ledger"] },
  { id: "tron", label: "Tron", color: "#FF060A", wallets: ["TronLink", "Ledger"] },
  { id: "ton", label: "TON", color: "#0098EA", wallets: ["Tonkeeper", "MyTonWallet", "Ledger"] },
];

const ALL_CHAINS = [
  ...EVM_CHAINS.map((c) => ({ ...c, type: "evm" as const, icon: c.label[0] })),
  ...OTHER_CHAINS.map((c) => ({ ...c, type: "non-evm" as const, icon: c.label[0] })),
];

/* ─── Main Component ─────────────────────────── */

type Page = "hero" | "app";

export default function Home() {
  const [page, setPage] = useState<Page>("hero");

  // Diagnostic: log every page transition. Lets us confirm in
  // browser devtools whether `setPage("app")` actually re-runs
  // the component when the Open app button is clicked.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[Cashinviz] page =", page);
  }, [page]);
  const [activeTab, setActiveTabRaw] = useState<Tab>("dashboard");
  const mainContentRef = useRef<HTMLElement>(null);
  const setActiveTab = useCallback((tab: Tab) => {
    setActiveTabRaw(tab);
    // Scroll content area to top on tab change
    mainContentRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState("ethereum");
  const [showNetworkPicker, setShowNetworkPicker] = useState(false);
  // Two-step deposit flow — null until user picks a mixing mode
  const [depositMixMode, setDepositMixMode] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { isConnected } = useAccount();
  const sidebarNavRef = useRef<HTMLElement>(null);
  const [lang] = useLanguage();

  const currentChain = ALL_CHAINS.find((c) => c.id === selectedNetwork);
  const isNonEvm = currentChain?.type === "non-evm";

  const currentSection = NAV.find((s) => s.items.some((i) => i.id === activeTab));
  const currentItem = currentSection?.items.find((i) => i.id === activeTab);

  // Close network picker on outside click
  useEffect(() => {
    if (!showNetworkPicker) return;
    const handler = () => setShowNetworkPicker(false);
    const timer = setTimeout(() => document.addEventListener("click", handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener("click", handler); };
  }, [showNetworkPicker]);

  // Global keyboard shortcut for command palette: "/" or Cmd+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !commandPaletteOpen)) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [commandPaletteOpen]);

  // Scroll sidebar to active section
  const scrollSidebarToSection = useCallback((sectionLabel: string) => {
    if (!sidebarNavRef.current) return;
    const el = sidebarNavRef.current.querySelector(`[data-section="${sectionLabel}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Auto-scroll sidebar when activeTab changes
  useEffect(() => {
    if (currentSection) {
      scrollSidebarToSection(currentSection.label);
    }
  }, [activeTab, currentSection, scrollSidebarToSection]);

  // Build command palette items from NAV
  const commandItems = NAV.flatMap((section) =>
    section.items.map((item) => {
      const Icon = item.icon;
      return {
        id: item.id,
        label: item.label,
        section: section.label,
        icon: <Icon />,
      };
    })
  );

  /* ─── HERO / LANDING ───────────────────────── */
  if (page === "hero") {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <SanctionsBanner />
        <Hero onEnterApp={() => setPage("app")} />
        <OnboardingTutorial isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
      </div>
    );
  }

  /* ─── APP LAYOUT ───────────────────────────── */
  return (
    <AppErrorBoundary onReset={() => setPage("hero")}>
    <SanctionsBanner />
    <div className="h-screen flex bg-[var(--bg)] overflow-hidden">
      {/* Ambient background effects */}
      <div className="ambient-mesh" />
      <div className="noise-overlay" />

      {/* ─── Sidebar ─────────────────────────── */}
      <aside
        className={`${
          sidebarOpen ? "w-[232px]" : "w-0"
        } hidden md:flex flex-col shrink-0 sidebar transition-all duration-200 overflow-hidden`}
      >
        {/* Logo — clickable, returns to landing page. Blender icon
            with a $ inside (same shape used in Hero.tsx's nav). If
            you redesign, redo both. */}
        <div className="h-[52px] flex items-center gap-2.5 px-4 shrink-0 border-b border-[var(--border-subtle)]">
          <button
            onClick={() => setPage("hero")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="Back to Cashinviz home"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 shrink-0 text-[var(--text-primary)]"
              aria-hidden
            >
              <rect x={10.5} y={2.2} width={3} height={1.6} rx={0.4} fill="currentColor" />
              <rect x={6.8} y={3.8} width={10.4} height={1.7} rx={0.5} fill="currentColor" />
              <path
                d="M 7.6 5.5 L 7.1 16.2 L 16.9 16.2 L 16.4 5.5 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.4}
                strokeLinejoin="round"
              />
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
              <rect x={5.6} y={16.2} width={12.8} height={3.3} rx={0.9} fill="currentColor" />
              <rect x={8.5} y={19.5} width={2} height={2.3} rx={0.3} fill="currentColor" />
              <rect x={13.5} y={19.5} width={2} height={2.3} rx={0.3} fill="currentColor" />
            </svg>
            <span className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">Cashinviz</span>
          </button>
        </div>

        {/* Network selector moved to topbar */}

        {/* Navigation */}
        <nav ref={sidebarNavRef} className="flex-1 overflow-y-auto scrollbar-none py-1.5 px-2">
          {/* Dashboard — standalone top-level */}
          <div className="mb-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`nav-item w-full text-left ${activeTab === "dashboard" ? "active" : ""}`}
            >
              <IconDashboard />
              <span>Dashboard</span>
            </button>
          </div>
          <div className="mx-2 mb-3 border-t border-[var(--border)]" />

          {/* Primary sections */}
          {NAV_PRIMARY.map((section, si) => (
            <div key={section.label} data-section={section.label} className={si > 0 ? "mt-3" : "mt-1"}>
              <p className="sidebar-section-label">{section.label}</p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`nav-item w-full text-left ${isActive ? "active" : ""}`}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}

          {/* Divider between primary and utility */}
          <div className="mx-2 my-4 border-t border-[var(--border)]" />
          <p className="px-2 mb-2 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
            Utilities
          </p>

          {/* Utility sections */}
          {NAV_UTILITY.map((section, si) => (
            <div key={section.label} data-section={section.label} className={si > 0 ? "mt-3" : ""}>
              <p className="sidebar-section-label">{section.label}</p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`nav-item w-full text-left ${isActive ? "active" : ""}`}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="px-3 py-3 border-t border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--accent-surface)]">
            <span className="status-online live-pulse" />
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">Mainnet</span>
            <span className="ml-auto text-[10px] text-[var(--text-muted)] font-mono">v2.4.1</span>
          </div>
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setShowTutorial(true)}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Help & Docs
            </button>
            <div className="flex items-center gap-0.5">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main Content ────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="topbar h-[52px] flex items-center justify-between px-4 md:px-5 shrink-0 relative z-50">
          <div className="topbar-accent" />
          <div className="flex items-center gap-2">
            {/* Mobile menu */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-surface)] transition-colors"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-surface)] transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x="1" y="2" width="14" height="12" rx="2" />
                <path d="M5.5 2v12" />
              </svg>
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[13px] ml-1">
              {activeTab === "dashboard" ? (
                <span className="text-[var(--text-primary)] font-medium">Dashboard</span>
              ) : (
                <>
                  <span className="text-[var(--text-muted)]">{currentSection?.label}</span>
                  <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-[var(--text-primary)] font-medium">{currentItem?.label}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Mobile controls */}
            <div className="flex md:hidden items-center gap-1">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>

            {/* Network selector */}
            <div className="relative hidden md:block">
              <button
                onClick={(e) => { e.stopPropagation(); setShowNetworkPicker(!showNetworkPicker); }}
                className="flex items-center gap-2 px-3 py-[6px] rounded-lg text-[12px] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-surface)] transition-colors"
              >
                <ChainIcon chainId={selectedNetwork} size={15} />
                <span className="text-[var(--text-primary)] font-medium">{currentChain?.label}</span>
                {isNonEvm && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-medium">Non-EVM</span>
                )}
                <svg className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${showNetworkPicker ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showNetworkPicker && (
                <div
                  className="absolute top-full right-0 mt-1.5 z-50 glass border border-[var(--border)] rounded-xl shadow-elevation-3 overflow-hidden animate-fade-in min-w-[220px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-1.5 max-h-[360px] overflow-y-auto scrollbar-none">
                    <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] px-2.5 py-1.5">EVM Chains</p>
                    {EVM_CHAINS.map((chain) => (
                      <button
                        key={chain.id}
                        onClick={() => { setSelectedNetwork(chain.id); setShowNetworkPicker(false); }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12px] transition-colors ${
                          selectedNetwork === chain.id
                            ? "bg-[var(--accent-surface)] text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-surface)]"
                        }`}
                      >
                        <ChainIcon chainId={chain.id} size={14} />
                        <span>{chain.label}</span>
                        {selectedNetwork === chain.id && (
                          <svg className="w-3 h-3 ml-auto text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                    <div className="h-px bg-[var(--border)] mx-2 my-1.5" />
                    <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] px-2.5 py-1.5">Other Chains</p>
                    {OTHER_CHAINS.map((chain) => (
                      <button
                        key={chain.id}
                        onClick={() => { setSelectedNetwork(chain.id); setShowNetworkPicker(false); }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12px] transition-colors ${
                          selectedNetwork === chain.id
                            ? "bg-[var(--accent-surface)] text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-surface)]"
                        }`}
                      >
                        <ChainIcon chainId={chain.id} size={14} />
                        <span>{chain.label}</span>
                        {selectedNetwork === chain.id && (
                          <svg className="w-3 h-3 ml-auto text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Search hint */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden lg:flex items-center gap-2 px-3 py-[5px] rounded-lg border border-[var(--border)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Search...
              <kbd className="ml-3 px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[10px] font-mono">
                /
              </kbd>
            </button>

            {/* Wallet */}
            {isNonEvm ? (
              <NonEvmWallet
                chainId={selectedNetwork}
                chainLabel={currentChain?.label ?? ""}
                chainIcon={currentChain?.icon ?? ""}
                chainColor={`text-[var(--text-primary)]`}
              />
            ) : (
              <ConnectButton
                accountStatus="address"
                chainStatus="none"
                showBalance={false}
              />
            )}
          </div>
        </header>

        {/* Section tabs bar with hover dropdowns */}
        <div className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg)] relative z-40 hidden md:block">
          <div className="flex items-center px-4 md:px-5 overflow-visible">
            {/* Dashboard tab — standalone */}
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`relative px-3 py-2.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
                activeTab === "dashboard"
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Dashboard
              {activeTab === "dashboard" && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[var(--accent)]" />
              )}
            </button>

            {/* Separator */}
            <div className="w-px h-4 bg-[var(--border)] mx-1" />

            {/* Primary section tabs */}
            {NAV_PRIMARY.map((section) => {
              const isActiveSection = currentSection?.label === section.label;
              return (
                <div key={section.label} className="relative group">
                  <button
                    onClick={() => setActiveTab(section.items[0].id)}
                    className={`relative px-3 py-2.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
                      isActiveSection
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {section.label}
                    {isActiveSection && (
                      <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[var(--accent)]" />
                    )}
                  </button>

                  {/* Hover dropdown */}
                  <div className="absolute top-full left-0 pt-1 hidden group-hover:block">
                    <div className="glass border border-[var(--border)] rounded-xl shadow-elevation-3 py-1.5 min-w-[200px] animate-fade-in">
                      <p className="px-3 pt-1 pb-1.5 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
                        {section.label}
                      </p>
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-[7px] text-left text-[13px] transition-colors ${
                              isActive
                                ? "text-[var(--text-primary)] bg-[var(--accent-surface)]"
                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-surface)]"
                            }`}
                          >
                            <span className={`[&>svg]:opacity-100 ${isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
                              <Icon />
                            </span>
                            <span>{item.label}</span>
                            {isActive && (
                              <svg className="w-3 h-3 ml-auto text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Separator */}
            <div className="w-px h-4 bg-[var(--border)] mx-1.5" />

            {/* Utility section tabs */}
            {NAV_UTILITY.map((section) => {
              const isActiveSection = currentSection?.label === section.label;
              return (
                <div key={section.label} className="relative group">
                  <button
                    onClick={() => setActiveTab(section.items[0].id)}
                    className={`relative flex items-center gap-1 px-2.5 py-2.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
                      isActiveSection
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {section.label}
                    {isActiveSection && (
                      <span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] rounded-full bg-[var(--accent)]" />
                    )}
                  </button>

                  {/* Hover dropdown */}
                  <div className="absolute top-full left-0 pt-1 hidden group-hover:block">
                    <div className="glass border border-[var(--border)] rounded-xl shadow-elevation-3 py-1.5 min-w-[200px] animate-fade-in">
                      <p className="px-3 pt-1 pb-1.5 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
                        {section.label}
                      </p>
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-[7px] text-left text-[13px] transition-colors ${
                              isActive
                                ? "text-[var(--text-primary)] bg-[var(--accent-surface)]"
                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-surface)]"
                            }`}
                          >
                            <span className={`[&>svg]:opacity-100 ${isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
                              <Icon />
                            </span>
                            <span>{item.label}</span>
                            {isActive && (
                              <svg className="w-3 h-3 ml-auto text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="md:hidden border-b border-[var(--border-subtle)] bg-[var(--card)] max-h-[60vh] overflow-y-auto animate-fade-in">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
              <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">Network</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CHAINS.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => setSelectedNetwork(chain.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                      selectedNetwork === chain.id
                        ? "bg-[var(--accent-surface)] text-[var(--text-primary)] border border-[var(--border)]"
                        : "text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <ChainIcon chainId={chain.id} size={12} />
                    {chain.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3">
              {NAV.map((section) => (
                <div key={section.label} className="mb-2">
                  <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] px-2 py-1">{section.label}</p>
                  <div className="grid grid-cols-2 gap-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setActiveTab(item.id); setMobileNavOpen(false); }}
                          className={`flex items-center gap-2 text-left px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${
                            activeTab === item.id
                              ? "text-[var(--text-primary)] bg-[var(--accent-surface)]"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          <Icon />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content area */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto bg-[var(--bg)] relative">
          {/* Subtle top glow inside content */}
          <div className="pointer-events-none absolute top-0 inset-x-0 h-[200px] opacity-40 z-0" style={{
            background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(99,102,241,0.05) 0%, transparent 100%)"
          }} />

          <div className="relative max-w-[960px] mx-auto px-4 md:px-8 py-8">

            {/* Non-EVM banner */}
            {isNonEvm && (
              <div className="mb-5 animate-in">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--accent-surface)] border border-[var(--border)]">
                  <ChainIcon chainId={selectedNetwork} size={16} />
                  <p className="text-[13px] text-[var(--text-secondary)]">
                    <span className="text-[var(--text-primary)] font-medium">{currentChain?.label}</span>
                    {" "}— deposits via{" "}
                    {selectedNetwork === "bitcoin" ? "HTLC atomic swap" :
                     selectedNetwork === "monero" ? "atomic swap" :
                     "Wormhole bridge"}
                  </p>
                </div>
              </div>
            )}

            {/* Privacy score on withdraw */}
            {activeTab === "withdraw" && (
              <div className="mb-5 animate-in">
                <PrivacyScore anonymitySetSize={0} timeSinceDeposit={null} token="ETH" />
              </div>
            )}

            {/* Panel */}
            <div className="tab-panel" key={activeTab}>
              {activeTab === "deposit" && (
                <div className="space-y-6 max-w-[560px] mx-auto">
                  {/* STEP 1 — Mixing mode */}
                  <MixingModeSelector
                    selected={depositMixMode}
                    onSelect={(m) => setDepositMixMode(m.id)}
                    onClear={() => setDepositMixMode(null)}
                    collapseOnSelect
                    step={1}
                  />

                  {/* STEP 2 — Deposit details, revealed after mode is picked */}
                  {depositMixMode && (
                    <div className="border-t border-[var(--border-subtle)] pt-6 animate-in">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#6366f1]/10 text-[#6366f1] text-[10px] font-semibold">2</span>
                        <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">Deposit details</p>
                      </div>
                      {isNonEvm
                        ? <ChainBridgePanel selectedNetwork={selectedNetwork} showMixingMode={false} />
                        : <DepositPanel selectedNetwork={selectedNetwork} />}
                    </div>
                  )}

                  {/* Supporting content — only when picking a mode (Step 1 visible) */}
                  {!depositMixMode && (
                    <div className="pt-2 animate-in">
                      {/* Pool activity strip — live-ticking stats */}
                      <PoolActivityStrip />

                      {/* How it works */}
                      <div className="mt-8">
                        <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-4">How it works</p>
                        <div className="space-y-4">
                          <div className="flex gap-3">
                            <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#6366f1]/10 text-[#6366f1] text-[11px] font-semibold mt-0.5">1</span>
                            <div>
                              <p className="text-[13px] font-medium text-[var(--text-primary)]">Deposit creates a zero-knowledge note</p>
                              <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed mt-0.5">
                                Your funds enter the pool. You receive a cryptographic note — the only proof of ownership. Nothing on-chain ties your address to the deposit.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#6366f1]/10 text-[#6366f1] text-[11px] font-semibold mt-0.5">2</span>
                            <div>
                              <p className="text-[13px] font-medium text-[var(--text-primary)]">Mix into the anonymity set</p>
                              <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed mt-0.5">
                                Your deposit joins thousands of others. The transaction graph is severed — no observer can trace funds through the pool.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#6366f1]/10 text-[#6366f1] text-[11px] font-semibold mt-0.5">3</span>
                            <div>
                              <p className="text-[13px] font-medium text-[var(--text-primary)]">Withdraw to any address</p>
                              <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed mt-0.5">
                                Present your note and a zero-knowledge proof. Funds land in a fresh wallet with no on-chain link to the original deposit.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Trust row */}
                      <div className="mt-8 pt-5 border-t border-[var(--border-subtle)] flex items-center justify-center gap-6 text-[11px] text-[var(--text-muted)]">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Non-custodial
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Open source
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Audited
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Client-side proofs
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "withdraw" && <WithdrawPanel />}
              {activeTab === "transfer" && <ShieldedTransferPanel />}
              {activeTab === "notes" && <NoteManager />}
              {activeTab === "yield" && <YieldPool />}
              {activeTab === "stealth" && <StealthAddressPanel />}
              {activeTab === "compliance" && <ProofOfInnocencePanel />}
              {activeTab === "defi" && <PrivateDeFiPanel />}
              {activeTab === "recovery" && <SocialRecovery />}
              {activeTab === "timelock" && <TimeLockPanel />}
              {activeTab === "multipath" && <MultiPathPanel />}
              {activeTab === "loyalty" && <LoyaltyPanel />}
              {activeTab === "mevshield" && <MEVShieldPanel />}
              {activeTab === "dashboard" && <PrivacyDashboard />}
              {activeTab === "graph" && <TransactionGraphVisualizer />}
              {activeTab === "gas" && <GasOptimizer />}
              {activeTab === "nft" && <PrivateNFTPurchase />}
              {activeTab === "dao" && <PrivateDAOVoting />}
              {activeTab === "export" && <ComplianceExport />}
              {activeTab === "sdk" && <DeveloperSDKPanel />}
              {activeTab === "tor" && <TorSettingsPanel />}
              {activeTab === "decoys" && <AIDecoyPanel />}
              {activeTab === "encryption" && <EncryptionPanel />}
              {activeTab === "liquidity" && <ExchangeLiquidityPanel />}
              {activeTab === "auditor" && <PrivacyAuditor />}
              {activeTab === "darkpool" && <DarkPool />}
              {activeTab === "relay" && <PrivacyRelayNetwork />}
              {activeTab === "zkid" && <ZKIdentity />}
              {activeTab === "deaddrops" && <DeadDrops />}
              {activeTab === "ghost" && <GhostMode />}
              {activeTab === "middleware" && <PrivacyMiddleware />}
            </div>

          </div>
        </main>
      </div>

      {/* Tutorial overlay */}
      <OnboardingTutorial isOpen={showTutorial} onClose={() => setShowTutorial(false)} />

      {/* Command palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        items={commandItems}
        onSelect={(id) => setActiveTab(id as Tab)}
      />
    </div>
    </AppErrorBoundary>
  );
}
