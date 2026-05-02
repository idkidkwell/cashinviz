"use client";

import { useEffect, useRef, useState } from "react";

const JS_CODE = `import { Cashinviz } from '@cashinviz/sdk';

const mixer = new Cashinviz({
  rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
  chainId: 1,
});

// Deposit 1 ETH
const note = await mixer.deposit({
  token: 'ETH',
  amount: '1.0',
  mode: 'standard', // standard | coinjoin | monero | complete
});

// Withdraw to a new address
await mixer.withdraw({
  note,
  recipient: '0xNewAddress...',
  relayer: 'auto',
});`;

const PYTHON_CODE = `from cashinviz import Cashinviz

mixer = Cashinviz(
    rpc_url="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
    chain_id=1,
)

note = mixer.deposit(token="ETH", amount="1.0", mode="standard")
mixer.withdraw(note=note, recipient="0xNew...", relayer="auto")`;

const SOLIDITY_CODE = `import {ICashinviz} from "@cashinviz/contracts/ICashinviz.sol";

contract MyDApp {
    ICashinviz public mixer;

    function privatePayment(
        bytes32 commitment,
        uint256 denomination
    ) external payable {
        mixer.deposit{value: msg.value}(commitment, denomination);
    }
}`;

type CodeTab = "javascript" | "python" | "solidity";

const API_METHODS = [
  { name: "deposit",          signature: "deposit(opts: DepositOptions): Promise<Note>",         description: "Create shielded deposit into the mixer pool",      returnType: "Promise<Note>" },
  { name: "withdraw",         signature: "withdraw(opts: WithdrawOptions): Promise<TxReceipt>",  description: "Withdraw with ZK proof to a recipient address",    returnType: "Promise<TxReceipt>" },
  { name: "transfer",         signature: "transfer(opts: TransferOptions): Promise<Note>",       description: "Shielded pool-to-pool transfer without exiting",   returnType: "Promise<Note>" },
  { name: "getAnonymitySet",  signature: "getAnonymitySet(pool: string): Promise<PoolStats>",    description: "Query anonymity set size and pool statistics",     returnType: "Promise<PoolStats>" },
  { name: "generateProof",    signature: "generateProof(note: Note): Promise<ZKProof>",          description: "Generate client-side ZK-SNARK proof for withdrawal", returnType: "Promise<ZKProof>" },
  { name: "getRelayers",      signature: "getRelayers(chainId: number): Promise<Relayer[]>",     description: "List active relayers with fees and reputation",    returnType: "Promise<Relayer[]>" },
];

const CHAINS = [
  { name: "Ethereum",    chainId: 1,      contract: "0x1a2B…9a0B", status: "Live" },
  { name: "Arbitrum",    chainId: 42161,  contract: "0x2b3C…0b1C", status: "Live" },
  { name: "Optimism",    chainId: 10,     contract: "0x3c4D…1c2D", status: "Live" },
  { name: "Polygon",     chainId: 137,    contract: "0x4d5E…2d3E", status: "Live" },
  { name: "BSC",         chainId: 56,     contract: "0x5e6F…3e4F", status: "Live" },
  { name: "Avalanche",   chainId: 43114,  contract: "0x6f7A…4f5A", status: "Live" },
  { name: "Base",        chainId: 8453,   contract: "0x7a8B…5a6B", status: "Live" },
  { name: "zkSync Era",  chainId: 324,    contract: "0x8b9C…6b7C", status: "Beta" },
  { name: "Linea",       chainId: 59144,  contract: "0x9c0D…7c8D", status: "Beta" },
  { name: "Scroll",      chainId: 534352, contract: "0xa0B1…8a9B", status: "Beta" },
  { name: "Mantle",      chainId: 5000,   contract: "0xb1C2…9c0C", status: "Beta" },
  { name: "Blast",       chainId: 81457,  contract: "—",            status: "Coming" },
  { name: "Monad",       chainId: 99999,  contract: "—",            status: "Coming" },
  { name: "Starknet",    chainId: 0,      contract: "—",            status: "Coming" },
  { name: "Solana",      chainId: 0,      contract: "—",            status: "Coming" },
];

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    calls: "100 API calls/day",
    features: {
      "Mainnet access": true,
      "Basic SDK methods": true,
      "Community support": true,
      "Testnet relayers": true,
      "Custom relayer config": false,
      "Priority proof gen": false,
      "Dedicated support": false,
      "SLA guarantee": false,
    },
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    calls: "10,000 API calls/day",
    features: {
      "Mainnet access": true,
      "Basic SDK methods": true,
      "Community support": true,
      "Testnet relayers": true,
      "Custom relayer config": true,
      "Priority proof gen": true,
      "Dedicated support": false,
      "SLA guarantee": false,
    },
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    calls: "Unlimited",
    features: {
      "Mainnet access": true,
      "Basic SDK methods": true,
      "Community support": true,
      "Testnet relayers": true,
      "Custom relayer config": true,
      "Priority proof gen": true,
      "Dedicated support": true,
      "SLA guarantee": true,
    },
  },
];

/* ─── syntax highlighting ─── */
function highlightJS(code: string): React.ReactNode[] {
  return code.split("\n").map((line, i) => {
    const highlighted = line
      .replace(/(\/\/.*)/g, '<span class="text-[var(--text-muted)]">$1</span>')
      .replace(/\b(import|from|const|await|new)\b/g, '<span class="text-[#818cf8]">$1</span>')
      .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="text-emerald-400">$1</span>')
      .replace(
        /\b(deposit|withdraw|Cashinviz)\b(?=\s*[({])/g,
        '<span class="text-amber-300">$1</span>'
      );
    return <div key={i} dangerouslySetInnerHTML={{ __html: highlighted || "&nbsp;" }} />;
  });
}

function highlightPython(code: string): React.ReactNode[] {
  return code.split("\n").map((line, i) => {
    const highlighted = line
      .replace(/(#.*)/g, '<span class="text-[var(--text-muted)]">$1</span>')
      .replace(/\b(from|import)\b/g, '<span class="text-[#818cf8]">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-emerald-400">$1</span>')
      .replace(
        /\b(Cashinviz|deposit|withdraw)\b(?=\s*[(])/g,
        '<span class="text-amber-300">$1</span>'
      );
    return <div key={i} dangerouslySetInnerHTML={{ __html: highlighted || "&nbsp;" }} />;
  });
}

function highlightSolidity(code: string): React.ReactNode[] {
  return code.split("\n").map((line, i) => {
    const highlighted = line
      .replace(/(\/\/.*)/g, '<span class="text-[var(--text-muted)]">$1</span>')
      .replace(
        /\b(import|contract|function|external|payable|public)\b/g,
        '<span class="text-[#818cf8]">$1</span>'
      )
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-emerald-400">$1</span>')
      .replace(
        /\b(bytes32|uint256|ICashinviz)\b/g,
        '<span class="text-[#c4b5fd]">$1</span>'
      )
      .replace(
        /\b(deposit|privatePayment)\b(?=\s*[{(])/g,
        '<span class="text-amber-300">$1</span>'
      );
    return <div key={i} dangerouslySetInnerHTML={{ __html: highlighted || "&nbsp;" }} />;
  });
}

/* ─── Copy button with timer cleanup ─── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCopied(false);
      timerRef.current = null;
    }, 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-1 text-[10px] uppercase tracking-[0.06em] rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#6366f1]/40 transition"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/* ─── Code block ─── */
function CodeBlock({
  code,
  highlighted,
}: {
  code: string;
  highlighted: React.ReactNode[];
}) {
  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <CopyButton text={code} />
      </div>
      <pre className="bg-[#0b0c10] border border-[var(--border-subtle)] rounded-lg p-3 overflow-x-auto text-[11px] font-mono leading-relaxed text-[var(--text-primary)]">
        <code>{highlighted}</code>
      </pre>
    </div>
  );
}

/* ================================================================
   DEVELOPER SDK PANEL
   ================================================================ */
export function DeveloperSDKPanel() {
  const [activeTab, setActiveTab] = useState<CodeTab>("javascript");
  const [npmCopied, setNpmCopied] = useState(false);
  const npmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (npmTimerRef.current) clearTimeout(npmTimerRef.current);
    },
    []
  );

  function handleNpmCopy() {
    navigator.clipboard.writeText("npm install @cashinviz/sdk");
    setNpmCopied(true);
    if (npmTimerRef.current) clearTimeout(npmTimerRef.current);
    npmTimerRef.current = setTimeout(() => {
      setNpmCopied(false);
      npmTimerRef.current = null;
    }, 2000);
  }

  const codeMap: Record<CodeTab, { code: string; highlighted: React.ReactNode[] }> = {
    javascript: { code: JS_CODE, highlighted: highlightJS(JS_CODE) },
    python: { code: PYTHON_CODE, highlighted: highlightPython(PYTHON_CODE) },
    solidity: { code: SOLIDITY_CODE, highlighted: highlightSolidity(SOLIDITY_CODE) },
  };

  return (
    <div className="max-w-[820px] mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-[13px] text-[var(--text-primary)] font-medium">
          @cashinviz/sdk
        </p>
        <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/30">
          v2.1.0
        </span>
      </div>
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-4 max-w-[560px]">
        Integrate private transactions into your dApp in minutes. Full support for deposits,
        withdrawals, shielded transfers, and client-side ZK proof generation.
      </p>

      {/* ── Install ───────────────────────────── */}
      <div className="bg-[#0b0c10] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 mb-5 flex items-center gap-2 font-mono text-[12px]">
        <span className="text-[var(--text-muted)] shrink-0">$</span>
        <span className="text-emerald-400 flex-1 truncate">
          npm install @cashinviz/sdk
        </span>
        <button
          onClick={handleNpmCopy}
          className="shrink-0 px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#6366f1]/40 transition"
        >
          {npmCopied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* ── Quick start ───────────────────────── */}
      <div className="mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
          Quick start
        </p>
        <div className="flex gap-1 mb-2">
          {(["javascript", "python", "solidity"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition ${
                activeTab === tab
                  ? "bg-[#6366f1] text-white"
                  : "bg-[var(--card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab === "javascript"
                ? "JavaScript"
                : tab === "python"
                  ? "Python"
                  : "Solidity"}
            </button>
          ))}
        </div>
        <CodeBlock
          code={codeMap[activeTab].code}
          highlighted={codeMap[activeTab].highlighted}
        />
      </div>

      {/* ── API reference ─────────────────────── */}
      <div className="mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
          API reference
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {API_METHODS.map((m) => (
            <div
              key={m.name}
              className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3"
            >
              <p className="text-amber-300 font-mono text-[13px] font-semibold mb-1">
                {m.name}()
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-1.5">
                {m.description}
              </p>
              <code className="text-[10px] text-[var(--text-muted)] font-mono block break-all leading-tight">
                {m.signature}
              </code>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-[10px] text-[var(--text-muted)]">→</span>
                <span className="text-[10px] text-[#c4b5fd] font-mono">{m.returnType}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Supported chains ──────────────────── */}
      <div className="mb-5">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
          Supported chains
        </p>
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  <th className="px-3 py-2 font-medium">Chain</th>
                  <th className="px-3 py-2 font-medium">ID</th>
                  <th className="px-3 py-2 font-medium">Contract</th>
                  <th className="px-3 py-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {CHAINS.map((c) => (
                  <tr
                    key={c.name}
                    className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[#6366f1]/5 transition"
                  >
                    <td className="px-3 py-2 text-[var(--text-primary)] font-medium">
                      {c.name}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)] font-mono tabular-nums">
                      {c.chainId === 0 ? "—" : c.chainId}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)] font-mono tabular-nums truncate max-w-[140px]">
                      {c.contract}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-[0.06em] font-semibold ${
                          c.status === "Live"
                            ? "bg-emerald-400/10 text-emerald-400"
                            : c.status === "Beta"
                              ? "bg-amber-400/10 text-amber-400"
                              : "bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)]"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Pricing ───────────────────────────── */}
      <div>
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-2">
          Rate limits & pricing
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-[var(--card)] border rounded-xl p-4 ${
                tier.name === "Pro"
                  ? "border-[#6366f1]/40"
                  : "border-[var(--border-subtle)]"
              }`}
            >
              {tier.name === "Pro" && (
                <span className="absolute -top-2 right-3 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] font-semibold rounded-full bg-[#6366f1] text-white">
                  Popular
                </span>
              )}
              <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
                {tier.name}
              </p>
              <div className="flex items-baseline gap-0.5 mt-1 mb-1">
                <span className="text-[22px] font-semibold text-[var(--text-primary)] tabular-nums">
                  {tier.price}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">{tier.period}</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mb-3 tabular-nums">
                {tier.calls}
              </p>
              <div className="space-y-1">
                {Object.entries(tier.features).map(([feature, enabled]) => (
                  <div key={feature} className="flex items-center gap-1.5 text-[11px]">
                    {enabled ? (
                      <span className="text-emerald-400 w-3 text-center">✓</span>
                    ) : (
                      <span className="text-[var(--text-muted)] w-3 text-center">·</span>
                    )}
                    <span
                      className={
                        enabled
                          ? "text-[var(--text-secondary)]"
                          : "text-[var(--text-muted)] line-through"
                      }
                    >
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
