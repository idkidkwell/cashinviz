/**
 * ABI fragments for every contract the relayer submits to.
 *
 * Kept minimal on purpose: we only need the function selectors we
 * actually call, so there's less surface for a malicious RPC to trick
 * us into signing something we didn't intend.
 */

export const MIXER_WITHDRAW_ABI = [
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "root", type: "bytes32" },
      { name: "nullifierHash", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "relayer", type: "address" },
      { name: "relayerFee", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const SHIELDED_WITHDRAW_ABI = [
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "root", type: "bytes32" },
      { name: "nullifierHash", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "relayer", type: "address" },
      { name: "relayerFee", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

/// Private intra-pool transfers don't have any relayer-fee parameter
/// because funds never leave the contract. The relayer is only
/// submitting the transaction; it collects nothing. We still expose
/// this endpoint so users can submit from fresh throwaway IPs.
export const SHIELDED_TRANSFER_ABI = [
  {
    type: "function",
    name: "shieldedTransfer",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "root", type: "bytes32" },
      { name: "inputNullifier", type: "bytes32" },
      { name: "outputCommitment1", type: "bytes32" },
      { name: "outputCommitment2", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const YIELD_WITHDRAW_ABI = [
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "root", type: "bytes32" },
      { name: "nullifierHash", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "relayer", type: "address" },
      { name: "relayerFee", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const CROSS_CHAIN_WITHDRAW_ABI = [
  {
    type: "function",
    name: "crossChainWithdraw",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "sourceChain", type: "uint256" },
      { name: "root", type: "bytes32" },
      { name: "nullifierHash", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "relayer", type: "address" },
      { name: "relayerFee", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const NULLIFIER_VIEW_ABI = [
  {
    type: "function",
    name: "nullifierHashes",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
] as const;
