# Security policy

## Reporting a vulnerability

**Do not file public GitHub issues for security vulnerabilities.** Use
one of the following private channels:

- **Email**: `security@cashinviz.com`
- **PGP**: _(public key to be published before mainnet launch — placeholder)_

Please include:

1. A clear description of the vulnerability and the affected
   component (smart contract path, relayer route, frontend file, etc.).
2. Reproduction steps. A working PoC against a local Anvil fork is
   ideal but not required for high-severity findings.
3. Your assessment of impact (funds at risk, data leak, DoS, etc.).
4. Any suggested mitigation.

We will acknowledge receipt within **2 business days** and aim to
provide a substantive response within **5 business days**. Critical
findings are triaged immediately.

## Scope

In scope:

- All Solidity contracts under `contracts/src/`
- The Solana Anchor program under `solana/`
- Noir circuits under `circuit/` and `circuit/transfer/`
- The relayer service under `relayer/`
- The Next.js frontend under `frontend/` (XSS, CSRF, secret handling,
  CSP weaknesses)
- The deployment workflow in `contracts/script/Deploy.s.sol`

Out of scope:

- Third-party dependencies (Aave V3, Uniswap V3, Wormhole, Noir,
  Barretenberg, RainbowKit, wagmi). Report those upstream.
- Privacy issues that require a malicious RPC operator with
  network-level surveillance — these are inherent to all browser-based
  mixers and we document them rather than try to fix them in code.
- Issues that require physical access to the user's device.
- Self-DoS (burning your own gas / signing your own bad transaction).

## Known unfixed issues

The following are documented in code as `🚨 PRODUCTION-BLOCKER` /
`⚠️ NOT PRODUCTION READY` rather than fixed silently. They should not
be reported as new findings.

1. **Verifier exceeds EIP-170 contract-size limit (deploy blocker).**
   `contracts/src/Verifier.sol` is the Solidity verifier produced by
   Noir's Barretenberg backend (`bb write_solidity_verifier -t evm`).
   Its runtime bytecode is **27,750 bytes**, which exceeds the
   **24,576-byte hard cap** that EIP-170 enforces on every Ethereum
   L1 + most L2s. The contract compiles, simulates, and deploys to a
   local Anvil fork (no EIP-170 enforcement on Anvil), but cannot be
   broadcast to Sepolia or mainnet — the chain rejects the CREATE
   opcode result. Two paths to fix:
     - **Migrate to Groth16** — verifier shrinks to ~3–5 KB, well
       under the cap. Requires a per-circuit trusted-setup ceremony
       (multi-party for production). Currently in progress.
     - **Split UltraHonk into proxy + libraries via `delegatecall`** —
       keeps current Noir tooling but adds custom storage/ABI plumbing.
2. **Hash mismatch between EVM tree and Noir circuit.** The
   `IncrementalMerkleTree` uses keccak256 as a placeholder; the Noir
   circuit uses `pedersen_hash`. Real ZK withdrawals will not pass
   `isKnownRoot()` until both sides agree on a hash. See
   `contracts/src/IncrementalMerkleTree.sol` NatSpec.
2. **Solana ZK verifier is a stub** — `require!(proof.len() > 0)`.
   The pool is paused-by-default to prevent fund loss until a real
   Groth16 verifier (light-protocol) is wired. See `solana/programs/privacy_mixer/src/lib.rs`.
3. **Eight EVM premium-feature contracts** ship with placeholder ZK
   verifiers that return `true`. Each is paused-by-default. Listed in
   the README's production-status table.
4. **`UniversalBridge` does not verify Wormhole VAAs.** Paused-by-
   default. The admin must wire VAA verification before un-pausing.
5. **`CrossChainBridge` cross-chain proof verifier is fail-closed**
   (returns `false` until a real verifier is set via
   `setCrossChainVerifier`) AND `enableBridge()` must be called.

## Suggested bounty tiers (placeholder)

Once we list with a bug bounty platform (Immunefi or similar), the
intended tiers are:

| Severity | Range | Examples |
|---|---|---|
| Critical | $50,000 – $500,000 | Direct theft of any user funds; verifier bypass; nullifier replay across pools |
| High | $10,000 – $50,000 | Permanent freezing of user funds; griefing that scales to many users; cross-chain replay |
| Medium | $1,000 – $10,000 | Fee-discount manipulation; loyalty grinding; griefing one user |
| Low | $250 – $1,000 | Information disclosure; weak randomness; gas griefing |

Numbers will firm up alongside the audit and pre-launch listing.

## Threat model in one paragraph

We protect users against on-chain link analysis between their
deposits and their withdrawals. We do **not** protect against:
malicious wallet extensions stealing private keys; malicious RPC
providers correlating queries with IP addresses (use Tor or your own
node); compromise of the contract `owner` key (mitigated by 2-step
ownership transfer + a pending audit, not eliminated); sophisticated
side-channel attacks on the user's browser; or attempts by the user
themselves to leak the secret note (treat the note like a private key).

For the full threat model, see the architecture document — link will
be added once we publish the docs site.
