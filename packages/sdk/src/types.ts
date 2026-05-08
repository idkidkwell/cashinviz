/**
 * Stable types the SDK exposes. Anything here is part of the
 * public API contract — adding fields is a minor bump, removing or
 * renaming is a major.
 */

/** A 0x-prefixed 20-byte Ethereum address. */
export type Address = `0x${string}`;

/** A 0x-prefixed 32-byte hash (commitment, nullifier hash, root). */
export type Hex32 = `0x${string}`;

/** Token symbol the SDK accepts in user-facing inputs. address(0) = native. */
export type TokenSymbol = "ETH" | "USDC" | "USDT" | "DAI" | "WBTC" | string;

/** A deposit note. The user's secret to keep — losing it = losing the funds. */
export interface Note {
  /** BN254 field element. NEVER log. */
  secret: bigint;
  /** BN254 field element. NEVER log. */
  nullifier: bigint;
  /** Pedersen(secret, nullifier, token, amount). */
  commitment: Hex32;
  /** Position in the pool's Merkle tree at deposit time. */
  leafIndex: number;
  /** Token contract (address(0) for native ETH). */
  token: Address;
  /** Amount in the token's smallest unit (wei for ETH, 6dp for USDC, etc). */
  amount: bigint;
  /** Chain ID where the deposit was made. */
  chainId: number;
  /** Wall-clock timestamp the note was created (UI-only, not on-chain). */
  createdAt: number;
}

/** Options for `client.deposit(...)`. */
export interface DepositOptions {
  /** Decimal amount as a string ("1.0", "0.5") — parsed to bigint internally. */
  amount: string;
  /** Token symbol or address. "ETH" maps to address(0). */
  token: TokenSymbol | Address;
}

/** Options for `client.withdraw(...)`. */
export interface WithdrawOptions {
  /** The note returned from a previous deposit. */
  note: Note;
  /** Where to send the withdrawn funds. */
  recipient: Address;
  /** Relayer address (use Address.zero for no-relayer self-broadcast). */
  relayer?: Address;
  /** Relayer fee in token's smallest unit. */
  relayerFee?: bigint;
}

/** Options for `client.transfer(...)` — shielded inside-pool transfer. */
export interface TransferOptions {
  /** The input note being consumed. */
  note: Note;
  /** Amount to send to the recipient (rest goes back to sender as change). */
  recipientAmount: bigint;
  /** Recipient's stealth pub-key. */
  recipientPubKey: Hex32;
}

/** Result returned from `client.deposit(...)`. */
export interface DepositResult {
  /** The new note. Save it. */
  note: Note;
  /** The on-chain transaction hash. */
  txHash: Hex32;
  /** Block number the deposit landed in. */
  blockNumber: bigint;
}

/** Result returned from `client.withdraw(...)` and `client.transfer(...)`. */
export interface TxResult {
  txHash: Hex32;
  blockNumber: bigint;
}

/** Per-pool stats useful for UI rendering. */
export interface PoolStats {
  /** Total deposits ever — proxies the anonymity-set size. */
  depositCount: bigint;
  /** Total value locked, in the pool's token. */
  tvl: bigint;
  /** Number of unique commitments still spendable (not yet withdrawn). */
  anonymitySetSize: bigint;
}

/** SDK configuration. */
export interface CashinvizConfig {
  /** Chain ID we're operating on (e.g. 11155111 for Sepolia). */
  chainId: number;
  /** Optional override for the MixerFactory address. */
  factoryAddress?: Address;
  /** Optional viem PublicClient. If absent, the SDK builds its own. */
  publicClient?: unknown;
  /** Optional viem WalletClient. Required for state-changing methods. */
  walletClient?: unknown;
}
