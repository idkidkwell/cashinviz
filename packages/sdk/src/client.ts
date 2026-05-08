/**
 * `CashinvizClient` — main entry point of the SDK. This file is
 * deliberately thin in v0.0.1: it sets up types, validates config,
 * and throws "not implemented" for state-changing methods so dApp
 * authors can wire imports today and get real behaviour the moment
 * we publish v0.1 (which lands alongside the audit).
 */

import type {
  CashinvizConfig,
  DepositOptions,
  DepositResult,
  Note,
  PoolStats,
  TransferOptions,
  TxResult,
  WithdrawOptions,
} from "./types";

const NOT_YET = (method: string) =>
  new Error(
    `[@cashinviz/sdk] ${method}() is not implemented in v0.0.1. The protocol is pre-audit; ` +
      `state-changing methods land in v0.1.0. See https://github.com/idkidkwell/cashinviz for status.`,
  );

export class CashinvizClient {
  readonly chainId: number;

  constructor(public readonly config: CashinvizConfig) {
    if (!config.chainId) {
      throw new Error("[@cashinviz/sdk] config.chainId is required");
    }
    this.chainId = config.chainId;
  }

  /**
   * Generate a new note + send the deposit transaction. Returns the
   * Note the user must store — losing it is losing the funds.
   */
  async deposit(_opts: DepositOptions): Promise<DepositResult> {
    throw NOT_YET("deposit");
  }

  /**
   * Build a withdrawal proof in-browser, submit on-chain, return tx
   * receipt. The caller chooses whether to broadcast directly or via
   * a relayer.
   */
  async withdraw(_opts: WithdrawOptions): Promise<TxResult> {
    throw NOT_YET("withdraw");
  }

  /**
   * Shielded transfer — consume an input note, produce two output
   * notes. The recipient's note never appears in cleartext on-chain.
   */
  async transfer(_opts: TransferOptions): Promise<TxResult> {
    throw NOT_YET("transfer");
  }

  /**
   * Read-only: query the anonymity-set size + TVL for a given pool
   * on the configured chain. Read methods may ship in v0.0.x because
   * they don't require the proving stack.
   */
  async getPoolStats(_pool: { token: string; denomination: bigint }): Promise<PoolStats> {
    throw NOT_YET("getPoolStats");
  }

  /**
   * Helper: deserialize a note string the user has saved. Useful in
   * UIs that prompt "paste your note to withdraw."
   */
  static parseNote(_serialized: string): Note {
    throw NOT_YET("CashinvizClient.parseNote");
  }
}
