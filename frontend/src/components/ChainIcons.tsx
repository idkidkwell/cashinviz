"use client";

/* Minimal, recognizable chain icons as SVG — no external dependencies */

export function EthereumIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 1.5l-7 10.17L12 15l7-3.33L12 1.5z" fill="#627EEA" />
      <path d="M12 1.5v13.5l7-3.33L12 1.5z" fill="#3C3C3B" fillOpacity={0.2} />
      <path d="M12 16.5l-7-3.83L12 22.5l7-9.83-7 3.83z" fill="#627EEA" />
      <path d="M12 16.5v6l7-9.83-7 3.83z" fill="#3C3C3B" fillOpacity={0.2} />
    </svg>
  );
}

export function ArbitrumIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#213147" />
      <path d="M12.7 7l3.8 6.2-2.3 3.6L10 10.2 12.7 7z" fill="#28A0F0" />
      <path d="M7.5 13.2l2.5 3.6h4.5l-2.3-3.6-4.7-6.2-2.5 3.6 2.5 2.6z" fill="white" />
    </svg>
  );
}

export function OptimismIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#FF0420" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="sans-serif">OP</text>
    </svg>
  );
}

export function BaseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#0052FF" />
      <path d="M12 6a6 6 0 100 12 6 6 0 000-12zm0 9.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z" fill="white" />
    </svg>
  );
}

export function PolygonIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M16 8l-2-1.15L12 8l-2-1.15L8 8v4.6L12 15l4-2.4V8z" fill="#8247E5" />
      <path d="M14 6.85L12 8l-2-1.15 2-1.15 2 1.15z" fill="#8247E5" opacity={0.7} />
    </svg>
  );
}

export function BSCIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#F0B90B" />
      <path d="M12 6l2 2-3.5 3.5L12 13l3.5-3.5L17.5 11.5 12 17l-5.5-5.5 2-2L12 13l1.5-1.5L12 10 8.5 13.5 6.5 11.5 12 6z" fill="white" />
    </svg>
  );
}

export function AvalancheIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#E84142" />
      <path d="M15.5 15H17L12 6l-5 9h1.5l.8-1.5h4.4l.8 1.5zm-5-3L12 9l1.5 3h-3z" fill="white" />
    </svg>
  );
}

export function GnosisIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#04795B" />
      <path d="M8 10.5a3.5 3.5 0 017 0M8 10.5c0 2 1.5 3 3.5 5 2-2 3.5-3 3.5-5" stroke="white" strokeWidth={1.5} fill="none" />
    </svg>
  );
}

export function LineaIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#121212" />
      <path d="M8 16V8h1.5v8H8zm3 0V8h5v1.5h-3.5V16H11z" fill="#61DFFF" />
    </svg>
  );
}

export function BitcoinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#F7931A" />
      <path d="M14.5 10.5c.3-.7 0-1.5-.8-1.8l.4-1.5-.8-.2-.4 1.4c-.2-.1-.4-.1-.6-.2l.4-1.4-.8-.2-.4 1.5c-.2 0-.4-.1-.5-.1l-1.1-.3-.3.9s.6.1.6.2c.3.1.4.3.3.5l-.4 1.6c0 0 .1 0 .1 0l-.1 0-.5 2.2c0 .1-.1.3-.4.2 0 0-.6-.1-.6-.1l-.4 1 1 .3c.2.1.4.1.6.1l-.4 1.5.8.2.4-1.5c.2.1.4.1.6.2l-.4 1.5.8.2.4-1.5c1.5.3 2.6.2 3.1-.9.4-.9 0-1.4-.7-1.7.5-.1.9-.5 1-1.2zm-1.7 2.4c-.3 1-2.1.5-2.7.3l.5-1.9c.6.2 2.5.5 2.2 1.6zm.3-2.4c-.3.9-1.8.4-2.3.3l.4-1.7c.5.1 2.1.4 1.9 1.4z" fill="white" />
    </svg>
  );
}

export function SolanaIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="solG" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="50%" stopColor="#5B4FE3" />
          <stop offset="100%" stopColor="#14F195" />
        </linearGradient>
      </defs>
      {/* Top bar — slants right */}
      <path d="M8 5.5h11.5c.5 0 .8.6.4 1l-1.8 1.8c-.1.1-.3.2-.5.2H6.1c-.5 0-.8-.6-.4-1l1.8-1.8c.1-.1.3-.2.5-.2z" fill="url(#solG)" />
      {/* Middle bar — slants left */}
      <path d="M6.1 10.5h11.5c.2 0 .4.1.5.2l1.8 1.8c.4.4.1 1-.4 1H8c-.2 0-.4-.1-.5-.2l-1.8-1.8c-.4-.4-.1-1 .4-1z" fill="url(#solG)" />
      {/* Bottom bar — slants right */}
      <path d="M8 15.5h11.5c.5 0 .8.6.4 1l-1.8 1.8c-.1.1-.3.2-.5.2H6.1c-.5 0-.8-.6-.4-1l1.8-1.8c.1-.1.3-.2.5-.2z" fill="url(#solG)" />
    </svg>
  );
}

export function MoneroIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#FF6600" />
      <path d="M7 16v-6l5 5 5-5v6" stroke="white" strokeWidth={1.5} fill="none" />
      <path d="M5 16h3M16 16h3" stroke="white" strokeWidth={1.5} />
    </svg>
  );
}

export function CosmosIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#2E3148" />
      <ellipse cx="12" cy="12" rx="7" ry="3" stroke="#6F7390" strokeWidth={1} fill="none" />
      <ellipse cx="12" cy="12" rx="7" ry="3" stroke="#6F7390" strokeWidth={1} fill="none" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="7" ry="3" stroke="#6F7390" strokeWidth={1} fill="none" transform="rotate(-60 12 12)" />
      <circle cx="12" cy="12" r="1.5" fill="#B7B9C8" />
    </svg>
  );
}

export function TronIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#EF0027" />
      <path d="M8 7l8 1-5 10L8 7z" fill="white" />
      <path d="M8 7l3.5 2.5L16 8 8 7z" fill="white" opacity={0.7} />
    </svg>
  );
}

export function TONIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#0098EA" />
      <path d="M7 8h10l-5 10L7 8z" fill="white" />
      <path d="M12 8v10" stroke="#0098EA" strokeWidth={1} />
      <path d="M7 8h10" stroke="white" strokeWidth={0.5} opacity={0.5} />
    </svg>
  );
}

/* ─── Lookup map ─────────────────────────────── */

const CHAIN_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  ethereum: EthereumIcon,
  arbitrum: ArbitrumIcon,
  optimism: OptimismIcon,
  base: BaseIcon,
  polygon: PolygonIcon,
  bsc: BSCIcon,
  avalanche: AvalancheIcon,
  gnosis: GnosisIcon,
  linea: LineaIcon,
  bitcoin: BitcoinIcon,
  solana: SolanaIcon,
  monero: MoneroIcon,
  cosmos: CosmosIcon,
  tron: TronIcon,
  ton: TONIcon,
};

export function ChainIcon({ chainId, size = 14 }: { chainId: string; size?: number }) {
  const Icon = CHAIN_ICON_MAP[chainId];
  if (!Icon) {
    return (
      <div
        className="rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold text-white"
        style={{ width: size, height: size }}
      >
        {chainId[0]?.toUpperCase()}
      </div>
    );
  }
  return <Icon size={size} />;
}
