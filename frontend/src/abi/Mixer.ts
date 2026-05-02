export const MixerABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_denomination", type: "uint256" },
      { name: "_owner", type: "address" },
    ],
  },
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [],
    stateMutability: "payable",
  },
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
  {
    type: "function",
    name: "denomination",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLastRoot",
    inputs: [],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isKnownRoot",
    inputs: [{ name: "root", type: "bytes32" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nullifierHashes",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "commitments",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextIndex",
    inputs: [],
    outputs: [{ type: "uint32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Deposit",
    inputs: [
      { name: "commitment", type: "bytes32", indexed: true },
      { name: "leafIndex", type: "uint32", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Withdrawal",
    inputs: [
      { name: "to", type: "address", indexed: false },
      { name: "nullifierHash", type: "bytes32", indexed: false },
      { name: "relayer", type: "address", indexed: true },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
] as const;

export const MixerFactoryABI = [
  {
    type: "function",
    name: "mixers",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getDenominations",
    inputs: [],
    outputs: [{ type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPool",
    inputs: [{ name: "_denomination", type: "uint256" }],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "poolCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;
