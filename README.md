# Cashinviz

**The privacy layer for crypto.** Non-custodial mixer that breaks the
on-chain link between deposits and withdrawals using zero-knowledge
proofs. No accounts. No logs. The secret that controls funds is
generated and used in the user's browser — it never reaches a server.

> ⚠️ **Pre-launch.** Not audited. Do not deposit mainnet funds.

## What it is

A multi-chain shielded pool with a Tornado-Cash-style anonymity set,
plus extensions Tornado never had:

- **Shielded transfers** — move funds inside the pool without a
  withdrawal (UTXO notes, Pedersen commitments).
- **Multi-asset** — ETH, ERC-20s, and 6 non-EVM chains via bridges.
- **Yield-bearing pool** — Aave-backed, principal stays shielded.
- **Cross-chain withdrawal** — deposit on chain A, withdraw on chain B.
- **Operational extras** — relayer registry, MEV shield, time-locked
  withdrawals, multi-path withdrawals, stealth addresses, proof of
  innocence. All are killswitch-paused until their circuits land.

15 chains: 9 EVM (Ethereum, Arbitrum, Optimism, Base, Polygon, BNB,
Avalanche, Gnosis, Linea) + 6 non-EVM via bridge (Bitcoin via HTLC
atomic swap, Solana / Tron / TON via Wormhole, Monero via atomic
swap, Cosmos via IBC + Axelar).

## Repo layout

```
cashinviz/
├── contracts/            Solidity (Foundry) — Mixer, ERC20Mixer,
│                         ShieldedPool, YieldPool, CrossChainBridge,
│                         BitcoinBridge, MixerFactory, plus
│                         placeholder-paused premium-feature contracts
├── circuit/              Noir withdraw circuit (UltraPLONK)
│   └── transfer/         Noir shielded-transfer circuit (separate project)
├── solana/               Anchor program — native Solana mixer
├── relayer/              Node/Express relayer (TypeScript)
├── frontend/             Next.js 14 app (TypeScript, wagmi, RainbowKit)
├── scripts/              WSL helpers for nargo + bb installation
├── deployments/          Per-chain deployment artifacts (chainId.json)
├── dev-wallets.json      Project receiving wallets (EVM / SOL / BTC)
├── DEPLOYMENT.md         Operator runbook
└── SECURITY.md           Vuln disclosure policy
```

## Quickstart (development)

Prerequisites: Node 20+, [Foundry](https://book.getfoundry.sh/),
[Noir](https://noir-lang.org/docs/getting_started/installation/) (`nargo`)
and Barretenberg (`bb`) for circuit work.

```bash
# 1. Smart contracts
cd contracts
forge install
forge build
forge test                              # 42/42 should pass

# 2. ZK circuits
cd ../circuit
nargo test                              # withdraw circuit unit tests
nargo compile
bb write_solidity_verifier              # produces a Verifier.sol

cd ../circuit_transfer
nargo test
nargo compile
bb write_solidity_verifier              # produces the transfer Verifier.sol

# 3. Relayer
cd ../../relayer
npm install
npm run typecheck
npm test

# 4. Frontend
cd ../frontend
npm install
npm run dev                             # http://localhost:3000
```

## Security model

The protocol is intentionally **trustless after deployment**, with one
exception: the contract `owner` can rotate the verifier address. To
mitigate that:

- **2-step ownership transfer** on every fund-holding contract — the
  outgoing owner records a `pendingOwner`; the new owner must call
  `acceptOwnership()` from their key. Prevents typo'd transfers.
- **`setVerifier(address(0))` is rejected** — once a real verifier is
  wired, the owner cannot revert to stub mode (which would let any
  proof verify).
- **Killswitch-paused premium contracts** — every contract that has a
  placeholder ZK verifier ships with `paused = true` by default. The
  authority must explicitly opt in via `setPaused(false)` after wiring
  the corresponding circuit. This applies to `TimeLockedWithdrawal`,
  `MultiPathWithdrawal`, `CrossAssetMixer`, `ProofOfInnocence`,
  `PrivateDeFiRouter`, `CrossChainBridge`, `UniversalBridge`. Read
  each contract's NatSpec for what's missing before un-pausing.
- **Two-step proof binding on cross-chain** — `CrossChainBridge`
  proofs are bound to `(block.chainid, address(this), sourceChain,
  root, nullifierHash, recipient, token, amount)` so a proof valid
  on chain A cannot be replayed on chain B.

For details on what we do and do **not** trust, see the threat model
section in `SECURITY.md` and the audit-stance disclaimer above.

## Production status

| Component | State |
|---|---|
| EVM core (Mixer, ERC20Mixer, ShieldedPool, YieldPool, CrossChainBridge) | Code-complete + 42 tests passing. Awaiting Pedersen / Poseidon2 alignment between EVM tree and Noir circuit. |
| EVM premium-feature contracts | Killswitch-paused. Need their respective ZK circuits before un-pausing. |
| Solana program | Code-complete with `paused` killswitch + `fee_recipient`. Real Groth16 verifier (light-protocol) and Wormhole publish are TODO. |
| Withdraw Noir circuit | Complete, 4 tests pass. Uses Pedersen. |
| Shielded-transfer Noir circuit | Scaffolded as `circuit_transfer/`. |
| Relayer | Production-ready: per-chain queue, dedup, Tor, Prometheus metrics, admin endpoints. |
| Frontend | Live at `localhost:3000`, full CSP, 15-chain support, MEV Blocker Full Privacy on mainnet. |
| Deploy.s.sol | Auto-transfers ownership of every pool to `DEV_WALLET_EVM` (2-step, operator finalizes). |
| **Audit** | Not yet booked. **Required before mainnet.** |
| **Production deployment** | Not yet done. Sepolia first. |

See `DEPLOYMENT.md` for the operator runbook.

## License

MIT. See `LICENSE`.
