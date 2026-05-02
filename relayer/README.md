# Privacy Mixer — Relayer

A Tornado-style fee-funded relayer for the privacy-mixer contracts.

The relayer pays gas on behalf of withdrawers so the recipient address
never has a transactional link back to the depositor. In exchange the
relayer keeps a configurable fee out of each withdrawal.

## What's in the box

- **POST /relay** — fixed-denomination Mixer / ERC20Mixer withdraw
- **POST /relay/shielded** — unified ShieldedPool withdraw (any token, any amount)
- **POST /relay/transfer** — intra-pool private transfer (no on-chain payout)
- **POST /relay/yield** — YieldPool withdraw (principal + accrued yield)
- **POST /relay/cross-chain** — CrossChainBridge withdraw on destination chain
- **GET /health** — per-chain RPC reachability + balance + min-fee
- **GET /chains** — supported chain registry
- **GET /metrics** — Prometheus exposition
- **GET /status/:chain/:contract/:nullifier** — has-this-nullifier-been-spent
- **POST /admin/stats/reset** — zero counters (gated)
- **POST /admin/nonce/reset** — force nonce resync (gated)
- **GET /admin/balance** — per-chain ETH/native balance (gated)

## How requests are processed

```
client ── POST /relay ──▶ validate inputs ──▶ claim nullifier (dedup)
                          │
                          ▼
                          on-chain nullifier view check (cheap)
                          │
                          ▼
                          eth_call simulation (full circuit)
                          │
                          ▼
                          gas estimate
                          │
                          ▼
                          per-chain serial lock + nonce ──▶ broadcast
                          │
                          ▼
                          waitForReceipt (timeout-bounded)
                          │
                          ▼
                          release nullifier
                          │
                          ▼
                          200 OK { txHash, blockNumber }
```

Each step short-circuits at the cheapest possible failure mode:

- **validation** rejects malformed inputs (400) before viem touches them
- **dedup** rejects an in-flight duplicate (409) before any RPC call
- **view check** rejects an already-spent nullifier (409) for one eth_call
- **simulate** rejects a bad proof (400) for one eth_call
- **lock + nonce** prevents two concurrent submits from racing the same nonce
- **receipt timeout** unsticks the HTTP handler if the chain is wedged

## Running it

```sh
cp .env.example .env
# edit .env — set RELAYER_PRIVATE_KEY and at least one RPC_URL_*
npm install
npm run dev
```

Production:

```sh
npm run build
npm start
```

Or with Docker:

```sh
docker build -t privacy-mixer-relayer .
docker run --rm -p 4000:4000 \
  -v $(pwd)/data:/data \
  --env-file .env \
  privacy-mixer-relayer
```

## Configuration

See [`.env.example`](./.env.example) for the full list. The minimum
viable config is `RELAYER_PRIVATE_KEY` + at least one `RPC_URL_*`.

Key knobs:

| env var                       | default          | what it does |
|-------------------------------|------------------|---|
| `PORT`                        | 4000             | listen port |
| `RELAYER_FEE`                 | 0.001            | global min fee in ETH |
| `RELAYER_MIN_FEE_<chainId>`   | (unset)          | per-chain override (wei) — e.g. `RELAYER_MIN_FEE_137=50000000000000000` |
| `RELAYER_API_KEY`             | (unset)          | gate /relay/* with `x-api-key` header; unset = public |
| `RELAYER_ADMIN_KEY`           | (unset)          | gate /admin/* with `x-admin-key` header; unset = /admin/* returns 404 |
| `WRITE_RATE_LIMIT`            | 10/min/IP        | per-IP rate limit on /relay/* |
| `READ_RATE_LIMIT`             | 120/min/IP       | per-IP rate limit on /health, /status |
| `TX_CONFIRM_TIMEOUT_MS`       | 120000           | how long to wait for a receipt before 500 |
| `USE_PRIVATE_MEMPOOL`         | false            | route mainnet broadcasts through Flashbots |
| `FLASHBOTS_RPC_URL`           | https://rpc.flashbots.net | private mempool endpoint |
| `TOR_ENABLED`                 | false            | route every outbound RPC through Tor SOCKS5 |
| `TOR_SOCKS_HOST`              | 127.0.0.1        | local tor SOCKS5 host |
| `TOR_SOCKS_PORT`              | 9050             | local tor SOCKS5 port |
| `CORS_ORIGINS`                | (wide-open)      | comma-separated allowlist; empty = `*` |
| `STATS_FILE`                  | .stats.json      | persistent counter file path |
| `LOG_LEVEL`                   | info             | debug \| info \| warn \| error |

## Operational notes

- **Nonce manager.** The relayer maintains an in-memory next-nonce per
  chain. If you send a manual tx from the same key out-of-band, the
  next relay submit will detect the drift, reset, and re-fetch. You
  can also force a reset with `POST /admin/nonce/reset { chainId }`.

- **Stats persistence.** `.stats.json` survives restarts. Mount the
  file (or its dir) on a volume in production; ephemeral filesystems
  will reset stats on container replacement.

- **Private mempool.** Mainnet withdrawals are sandwich-attackable
  because they include a public address transfer. Setting
  `USE_PRIVATE_MEMPOOL=true` routes mainnet broadcasts through
  Flashbots Protect. L2 withdrawals don't suffer this — the L2
  sequencer is the only "miner."

- **Tor egress.** With `TOR_ENABLED=true`, every JSON-RPC request goes
  through a local Tor SOCKS5. Combined with running the relayer as a
  Tor hidden service, both halves of the relay path are anonymized.
  Note that batched RPC is disabled under Tor (each call gets its own
  request) because batching can be linkable across the circuit.

- **Multi-relayer setup.** Run multiple relayer instances behind a
  load balancer with **distinct** `RELAYER_PRIVATE_KEY`s. Sharing a
  key across instances breaks the in-memory nonce manager.

## Testing

```sh
npm test
```

Tests use Node's built-in test runner via tsx. They cover the
validators (untrusted-input parsing), the dedup map, and the queue's
serialization invariants. They do not require a running RPC.

## Security

- **Never log the private key.** The logger redacts string values whose
  keys match `key | secret | password | token | auth` (case-insensitive,
  word-boundary). Belt-and-suspenders if a stray request body ever
  carries a leaked secret.

- **Rate limit on the IP, not the user.** A single `RELAYER_API_KEY`
  doesn't protect against a misbehaving client; the per-IP limit does.
  In a multi-tenant deployment use distinct API keys + a CDN to enforce
  per-tenant quotas.

- **Admin gate is separate.** `RELAYER_ADMIN_KEY` does NOT default to
  `RELAYER_API_KEY`. Compromising the public key shouldn't grant
  control of stats / nonces.

- **Don't expose /metrics publicly.** It includes per-chain counts that
  can fingerprint your client base. Put it on a private listener or
  block at the LB.
