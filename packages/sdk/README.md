# @cashinviz/sdk

TypeScript SDK for the [Cashinviz](https://github.com/idkidkwell/cashinviz)
privacy protocol — deposit, withdraw, and shielded-transfer wrappers
around viem + the in-browser ZK-proof pipeline.

> ⚠️ **v0.0.1 — pre-launch.** Type contracts only. State-changing
> methods (`deposit`, `withdraw`, `transfer`) throw "not implemented"
> and land in v0.1.0 alongside the third-party audit.

## Install

```bash
npm install @cashinviz/sdk viem
```

## Use

```ts
import { CashinvizClient } from "@cashinviz/sdk";
import { sepolia } from "viem/chains";

const client = new CashinvizClient({ chainId: sepolia.id });

// Deposit 1 ETH into the Sepolia pool
const { note, txHash } = await client.deposit({
  amount: "1.0",
  token: "ETH",
});

// (Save `note` somewhere safe — losing it is losing the funds.)

// Later, from a fresh wallet:
await client.withdraw({
  note,
  recipient: "0x...",
});
```

## Status

| Method | Available |
|---|---|
| `new CashinvizClient(config)` | ✅ — config validation |
| `client.deposit(opts)` | ⏸ v0.1 |
| `client.withdraw(opts)` | ⏸ v0.1 |
| `client.transfer(opts)` | ⏸ v0.1 |
| `client.getPoolStats(pool)` | ⏸ v0.1 |
| Type contracts (`Note`, `DepositOptions`, etc.) | ✅ |

The reason types ship before implementations: dApp authors who want
to integrate Cashinviz can structure their code against the public
API today, then `npm install` once the audit lands.

## License

MIT — same as the protocol repo.
