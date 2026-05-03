# Deployment runbook

End-to-end procedure for putting Cashinviz on a new chain. Follow it
in order. Skip nothing.

> The operator who runs this should be a multisig signer on a hardware
> wallet, not a hot key on a laptop. The deployer's key holds the pool
> ownership for ~30 seconds before transferring to `DEV_WALLET_EVM`.

## 0. Pre-flight

- [ ] You have an audit report **for the version of the contracts
      you're about to deploy**. If not, only deploy to testnets.
- [ ] `dev-wallets.json` reflects the addresses you actually control.
      The `evm.address` constant is also baked into
      `contracts/script/Deploy.s.sol` as `DEV_WALLET_EVM`. They
      must match.
- [ ] `forge test` passes (`42 passed; 0 failed`).
- [ ] You're on a clean working tree with the commit hash you intend
      to deploy: `git status` shows nothing pending; `git rev-parse HEAD`
      matches what was audited.
- [ ] You have an RPC URL with sufficient quota (Alchemy / Infura /
      self-hosted) and your deployer key has gas.

## 1. Compile and verify circuits (one-time per release)

```bash
# Withdraw circuit
cd circuit
nargo test                       # all 4 tests pass
nargo compile                    # produces target/cashinviz.json
bb write_solidity_verifier --verifier-name HonkVerifier \
    -o ../contracts/src/Verifier.sol

# Shielded-transfer circuit
cd ../circuit_transfer
nargo test
nargo compile
bb write_solidity_verifier --verifier-name TransferVerifier \
    -o ../contracts/src/TransferVerifier.sol
```

Confirm the generated `Verifier.sol` matches the version reviewed by
your auditor — if `bb` regenerates with different parameters, anyone
who already deposited under the old verifier will have unverifiable
proofs.

## 2. Deploy EVM contracts

```bash
cd contracts

# Sepolia (testnet) first
PRIVATE_KEY=0x... \
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url $SEPOLIA_RPC \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_KEY

# Then mainnet only after Sepolia ran for ≥ 1 week without incident
```

The script:

1. Deploys `HonkVerifier`, `MixerFactory`, 4 ETH pools, `ShieldedPool`,
   `YieldPool` (mainnet/Sepolia only), `CrossChainBridge`, plus
   chain-specific stablecoin pools.
2. Wires the verifier into every pool.
3. Calls `transferOwnership(DEV_WALLET_EVM)` on every pool.
4. Writes `deployments/<chainId>.json` with all addresses.
5. Prints a punch list of contracts needing `acceptOwnership()`.

## 3. Accept ownership from the dev wallet

This is the second half of the 2-step transfer. The script left every
pool with `pendingOwner = DEV_WALLET_EVM`; the dev wallet must
broadcast `acceptOwnership()` on each. We ship a one-shot script
that reads `deployments/<chainId>.json` and accepts on every pool
in a single broadcast — idempotent, safe to re-run.

```powershell
# PowerShell, from the contracts/ directory.
$env:DEV_KEY = "0x..."                                              # private key of 0xf815919520F422Ca76AAF0333f3C810CBD30BCDc
$env:RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com"        # or your preferred RPC

cd contracts
forge script script/AcceptOwnership.s.sol:AcceptOwnershipScript `
    --rpc-url $env:RPC_URL --broadcast
```

The script will:

1. Verify `$DEV_KEY` derives to `DEV_WALLET_EVM` (early-fail if you've
   pasted the wrong key).
2. Read every pool address from the deployment artifact.
3. Skip pools already owned by the dev wallet (idempotent).
4. Call `acceptOwnership()` on the rest, in one broadcast.

Verify after: `cast call $POOL 'owner()(address)' --rpc-url $RPC_URL`
should return `0xf81…BCDc` for every contract.

The dev wallet needs a small Sepolia balance (~0.005 ETH) to cover
the 8 acceptOwnership transactions.

## 4. Wire the transfer verifier

The shielded-transfer Solidity verifier is pre-generated and committed
at `contracts/verifiers/TransferVerifier.sol` (~101KB, ~28KB runtime —
expected for a Noir-generated verifier). It lives outside `contracts/src/`
because it shares library names (`HonkVerificationKey`, `Errors`,
`FrLib`, etc.) with the withdraw verifier in `contracts/src/Verifier.sol`,
which would cause a Foundry compile clash if both were in the default
build path.

Deploy it standalone, then wire its address into `ShieldedPool`:

```bash
# Deploy from the verifiers/ subdir as an isolated build
forge create contracts/verifiers/TransferVerifier.sol:HonkVerifier \
    --rpc-url $RPC_URL --private-key $DEPLOYER_KEY

# Capture the address it printed, then:
cast send --private-key $DEV_KEY $SHIELDED_POOL \
    'setTransferVerifier(address)' $TRANSFER_VERIFIER
```

Until this step completes, `ShieldedPool.shieldedTransfer()` runs in
stub mode (the same `transferVerifier == address(0) → return true`
fallback that withdraw used to have). Don't open shielded-transfer in
the frontend before this is wired.

## 5. Update the frontend

Open `frontend/src/lib/wagmi.ts` and populate `MIXER_FACTORY_ADDRESSES`
with the chain's factory address from
`contracts/deployments/<chainId>.json`. Commit + redeploy the
frontend.

The frontend will throw `MixerNotDeployedError` if a user tries to
interact on a chain that's still `0x0000…0000`.

### WalletConnect project ID

The project's WalletConnect ID lives in `wagmi.ts` as the
`CASHINVIZ_WC_PROJECT_ID` constant (currently
`714dac64d9ad9183b836f85bceb3fdec`). It's not a secret — these IDs
are public identifiers, similar to Google Analytics properties.

To rotate (or to point a fork at its own Reown dashboard), set
`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in the deployment environment
(Vercel / your host's env vars) — the env value takes precedence over
the hardcoded fallback.

## 6. Wire the relayer

```bash
cd relayer
cp .env.example .env
# Set:
#   RELAYER_PRIVATE_KEY=...           (the relayer's key)
#   RPC_<chainId>=...                 (per-chain RPC; or use defaults)
#   API_KEY=...                       (for /relay endpoints)
#   ADMIN_KEY=...                     (for /admin endpoints)
#   MIN_FEE_<chainId>=...             (per-chain minimum fee in wei)

npm run build
npm start
```

Recommended infra: 3 geographically distributed instances behind a
load balancer, each behind Tor for outbound RPC. Health checks at
`/health`. Metrics at `/metrics` (Prometheus format).

## 7. Solana program (separate flow)

```bash
cd solana
anchor build
anchor deploy --provider.cluster mainnet-beta

# After deploy, initialize the pool with the dev wallet as fee_recipient
anchor run init-pool -- \
    --denomination 100000000000 \
    --fee-recipient BsH6VKGnBRYtNLgJo6xUK7aDuun4x1JZBxZ24fPdjVzS

# Pool starts paused. Un-pause only after the Groth16 verifier is wired.
```

## 8. Premium-feature contracts

`TimeLockedWithdrawal`, `MultiPathWithdrawal`, `CrossAssetMixer`,
`ProofOfInnocence`, `PrivateDeFiRouter`, `UniversalBridge` are NOT in
the deploy script. They ship paused. Each requires its own circuit
and verifier deployment before un-pausing. See each contract's
NatSpec for what's missing.

## 9. Post-deployment monitoring

- [ ] Status page covering `frontend.cashinviz.com`, every `relayer-*.cashinviz.com`,
      and synthetic checks against contract `getLastRoot()` per chain.
- [ ] Alerting on relayer error rate, unusual withdrawal volume, large
      changes in `anonymitySetSize()`.
- [ ] Sentry on the frontend (self-hosted, no third-party log
      retention — privacy).
- [ ] Subgraph indexing pool deposits and withdrawals so the frontend
      can show live anonymity-set numbers without spamming RPCs.

## 10. Submit HSTS preload

After 2+ weeks of stable HTTPS service:
https://hstspreload.org/

This protects first-time visitors from man-in-the-middle on the cert.

---

## Rollback

There is no `pause()` on the live mixer pools (Mixer, ERC20Mixer,
ShieldedPool, YieldPool) — by design. If a critical bug is found
post-deploy, the only mitigation is a frontend warning banner and an
off-chain advisory. Funds in the pool are still withdrawable by anyone
with a valid note. **This is why the audit must happen before
mainnet.**

The premium-feature contracts and `CrossChainBridge` and
`UniversalBridge` *do* have `setPaused(true)` — re-pause them
immediately if anything looks off.
