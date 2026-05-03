# Contributing to Cashinviz

Thanks for taking an interest. This is a privacy-critical financial
protocol — small bugs become large losses very quickly. The bar for
incoming changes is correspondingly high.

## Before you write code

For anything more than a typo or a comment fix, **open an issue first**.
A 5-line reply on an issue saves you from a 500-line PR getting closed.

## What we love

- **Bug fixes with a regression test.** A failing test → a passing
  test → done. No prose required.
- **Documentation improvements.** If the comment is wrong, the code
  is wrong; fix the comment first.
- **New circuits or hash primitives.** See the open issues tagged
  `circuit` for the queue.
- **Wallet adapters / chain integrations.** Each non-EVM chain we
  support is a bridge / atomic-swap pair away.

## What we don't merge

- **New features without a security model.** If you can't say in one
  sentence what the worst-case attacker capability is, the feature
  isn't ready.
- **Anything that adds a trusted off-chain operator** to the deposit
  or withdrawal path. Relayers can be censored / bribed and we
  design around that; please don't add new ones.
- **Branding / SEO tweaks.** This isn't a marketing repo.

## Repo layout

See the README. Each subproject has its own README + tests:

- `contracts/` — Solidity, Foundry. Run `forge test` before pushing.
- `circuit/` + `circuit_transfer/` — Noir. Run `nargo test` before pushing.
- `solana/` — Anchor program. `anchor test` if you have the toolchain.
- `relayer/` — Node. Run `npm run typecheck && npm test`.
- `frontend/` — Next.js. Run `npx tsc --noEmit -p .` before pushing.

## Local development

```bash
# Smart contracts
cd contracts && forge install foundry-rs/forge-std && forge test

# Frontend
cd frontend && npm install && npm run dev

# Relayer
cd relayer && npm install && npm test

# Noir circuits (needs nargo + bb)
cd circuit && nargo test
cd ../circuit_transfer && nargo test
```

The CI workflow at `.github/workflows/ci.yml` runs the same gates on
every PR. Mirror it locally and you'll never get a red build.

## Coding style

- **Solidity**: NatSpec on every public/external function. Custom
  errors instead of revert strings (saves gas + makes them queryable).
  No `unchecked` blocks unless you've explained why in a comment.
- **TypeScript**: Strict mode. No `any`. Imports use `@/` path alias
  for in-repo files.
- **Noir**: `pedersen_hash` for commitments and Merkle nodes (until
  Poseidon2 goes public — when it does, both circuits migrate at once).
- **Comments**: Explain *why*, not *what*. The diff shows the *what*.
  See [How to comment](https://stackoverflow.blog/2021/12/23/best-practices-for-writing-code-comments/)
  if you need a reference style.

## Commit messages

Format: `<area>: <imperative summary>`. Examples:

```
contracts: revert WBTC transfer in registerLP if non-spec ERC-20
frontend: tighten CSP connect-src to MEV Blocker + publicnode
relayer: add per-chain serial queue to prevent nonce collisions
ci: don't fail on EIP-170 size for Noir-generated verifiers
```

The body should explain the *why* — what was broken, what you weighed,
why this fix instead of the obvious one. If you can't explain the
"why" in two sentences, the change is too big and should be split.

## Reporting a security vulnerability

**Do not file a public issue.** See `SECURITY.md` for the disclosure
process. Anything that touches user funds is in scope; anything you'd
report to a competitor is in scope.

## License

By contributing you agree that your contribution is licensed under
the MIT License (see `LICENSE`).
