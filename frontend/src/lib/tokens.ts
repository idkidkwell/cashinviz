/**
 * Token registry — maps chain IDs to supported tokens and their metadata.
 * This powers the token selector in the deposit/withdraw UI.
 *
 * Logos sourced from cryptocurrency-icons (jsdelivr CDN).
 */

export interface TokenInfo {
  address: string; // address(0) = native token
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string;
  isNative: boolean;
}

const ZERO = "0x0000000000000000000000000000000000000000";

// CDN base for token logos (cryptocurrency-icons package)
const LOGO = (id: string) =>
  `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${id}.png`;

// ── Token lists per chain ────────────────────────────────────

export const TOKENS: Record<number, TokenInfo[]> = {
  // Ethereum Mainnet
  1: [
    { address: ZERO, symbol: "ETH", name: "Ether", decimals: 18, logoUrl: LOGO("eth"), isNative: true },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6, logoUrl: LOGO("usdc"), isNative: false },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether", decimals: 6, logoUrl: LOGO("usdt"), isNative: false },
    { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai", decimals: 18, logoUrl: LOGO("dai"), isNative: false },
    { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped Bitcoin", decimals: 8, logoUrl: LOGO("btc"), isNative: false },
  ],
  // Sepolia
  11155111: [
    { address: ZERO, symbol: "ETH", name: "Ether", decimals: 18, logoUrl: LOGO("eth"), isNative: true },
  ],
  // Polygon
  137: [
    { address: ZERO, symbol: "MATIC", name: "Polygon", decimals: 18, logoUrl: LOGO("matic"), isNative: true },
    { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6, logoUrl: LOGO("usdc"), isNative: false },
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether", decimals: 6, logoUrl: LOGO("usdt"), isNative: false },
  ],
  // Arbitrum
  42161: [
    { address: ZERO, symbol: "ETH", name: "Ether", decimals: 18, logoUrl: LOGO("eth"), isNative: true },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6, logoUrl: LOGO("usdc"), isNative: false },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether", decimals: 6, logoUrl: LOGO("usdt"), isNative: false },
    { address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", symbol: "WBTC", name: "Wrapped Bitcoin", decimals: 8, logoUrl: LOGO("btc"), isNative: false },
  ],
  // Optimism
  10: [
    { address: ZERO, symbol: "ETH", name: "Ether", decimals: 18, logoUrl: LOGO("eth"), isNative: true },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", name: "USD Coin", decimals: 6, logoUrl: LOGO("usdc"), isNative: false },
    { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT", name: "Tether", decimals: 6, logoUrl: LOGO("usdt"), isNative: false },
  ],
  // Base
  8453: [
    { address: ZERO, symbol: "ETH", name: "Ether", decimals: 18, logoUrl: LOGO("eth"), isNative: true },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6, logoUrl: LOGO("usdc"), isNative: false },
  ],
  // BSC
  56: [
    { address: ZERO, symbol: "BNB", name: "BNB", decimals: 18, logoUrl: LOGO("bnb"), isNative: true },
    { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18, logoUrl: LOGO("usdc"), isNative: false },
    { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether", decimals: 18, logoUrl: LOGO("usdt"), isNative: false },
    { address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoUrl: LOGO("eth"), isNative: false },
  ],
  // Avalanche
  43114: [
    { address: ZERO, symbol: "AVAX", name: "Avalanche", decimals: 18, logoUrl: LOGO("avax"), isNative: true },
    { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", name: "USD Coin", decimals: 6, logoUrl: LOGO("usdc"), isNative: false },
    { address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", symbol: "USDT", name: "Tether", decimals: 6, logoUrl: LOGO("usdt"), isNative: false },
  ],
  // Gnosis
  100: [
    { address: ZERO, symbol: "xDAI", name: "xDAI", decimals: 18, logoUrl: LOGO("dai"), isNative: true },
    { address: "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83", symbol: "USDC", name: "USD Coin", decimals: 6, logoUrl: LOGO("usdc"), isNative: false },
    { address: "0x4ECaBa5870353805a9F068101A40E0f32ed605C6", symbol: "USDT", name: "Tether", decimals: 6, logoUrl: LOGO("usdt"), isNative: false },
    { address: "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1", symbol: "WETH", name: "Wrapped Ether", decimals: 18, logoUrl: LOGO("eth"), isNative: false },
  ],
};

export function getTokensForChain(chainId: number | undefined): TokenInfo[] {
  return TOKENS[chainId ?? 1] ?? TOKENS[1];
}

export function getNativeToken(chainId: number | undefined): TokenInfo {
  const tokens = getTokensForChain(chainId);
  return tokens.find((t) => t.isNative) ?? tokens[0];
}

/// Default denominations for a given token
export function getDenominationsForToken(token: TokenInfo): { label: string; value: bigint }[] {
  if (token.decimals === 18) {
    return [
      { label: `0.1 ${token.symbol}`, value: BigInt("100000000000000000") },
      { label: `1 ${token.symbol}`, value: BigInt("1000000000000000000") },
      { label: `10 ${token.symbol}`, value: BigInt("10000000000000000000") },
      { label: `100 ${token.symbol}`, value: BigInt("100000000000000000000") },
    ];
  } else if (token.decimals === 6) {
    // USDC, USDT
    return [
      { label: `100 ${token.symbol}`, value: BigInt("100000000") },
      { label: `1K ${token.symbol}`, value: BigInt("1000000000") },
      { label: `10K ${token.symbol}`, value: BigInt("10000000000") },
      { label: `100K ${token.symbol}`, value: BigInt("100000000000") },
    ];
  } else if (token.decimals === 8) {
    // WBTC
    return [
      { label: `0.01 ${token.symbol}`, value: BigInt("1000000") },
      { label: `0.1 ${token.symbol}`, value: BigInt("10000000") },
      { label: `1 ${token.symbol}`, value: BigInt("100000000") },
      { label: `10 ${token.symbol}`, value: BigInt("1000000000") },
    ];
  }
  // Fallback
  return [
    { label: `1 ${token.symbol}`, value: BigInt(10) ** BigInt(token.decimals) },
  ];
}
