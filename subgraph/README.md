# Cashinviz subgraph

The Graph schema for indexing every deployed pool. Powers the
frontend's anonymity-set numbers, recent-activity feeds, and the
status / dashboard pages — without forcing the client to spam an
RPC for `eth_getLogs` on every page load.

## Status

- `schema.graphql` — entity definitions (committed, audited)
- `subgraph.yaml` — network + datasource manifest (TODO: fill in
  with Sepolia addresses after the first stable testnet deploy
  has run for ≥1 week without contract changes)
- Mappings (`mapping/*.ts`) — TODO: write event handlers per pool
  contract type

## Deploy (once mappings are written)

```bash
npm install -g @graphprotocol/graph-cli

# Subgraph Studio (recommended, free tier)
graph init --studio cashinviz
graph codegen
graph build
graph auth --studio <DEPLOY_KEY>
graph deploy --studio cashinviz
```

## Why The Graph and not eth_getLogs

The frontend needs:

- **Anonymity-set size per pool** — derived as `depositCount - withdrawalCount`.
  Reading it on every page load via `pool.depositCount()` × N pools is
  fine but stale once you go past hundreds of pools.
- **Recent activity feed** — last 50 deposits across all pools, ordered.
  An indexer is the only sane way.
- **Search by tx hash** — "did my withdraw land?" — RPC `eth_getLogs`
  with the right filter works but is slow on cold pages.

The subgraph runs all this off-chain and serves GraphQL over HTTPS.
The frontend's connect-src CSP allowlist already permits subgraph
gateways once we know the URL.
