/**
 * @cashinviz/sdk
 *
 * TypeScript SDK for the Cashinviz privacy protocol. The shape mirrors
 * what the in-tree frontend's lib/ does, but packaged for external
 * consumption (any wagmi/viem dApp can integrate Cashinviz with a
 * single import).
 *
 *   import { CashinvizClient } from "@cashinviz/sdk";
 *
 *   const client = new CashinvizClient({ chainId: 11155111 });
 *   const note  = await client.deposit({ amount: "1.0", token: "ETH" });
 *   await client.withdraw({ note, recipient: "0x..." });
 *
 * Status: PRE-LAUNCH. The signatures below are stable; the
 * implementations land alongside the audit. Today, this package
 * exports the type contracts so dApp authors can integrate against
 * it and have their TS compile, even before the proof / submit
 * helpers are filled in.
 */

export * from "./types";
export * from "./client";
