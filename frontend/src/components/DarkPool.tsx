"use client";

import { useState, useEffect, useCallback } from "react";

type Side = "BUY" | "SELL";
type Token = "ETH" | "USDC" | "USDT" | "WBTC" | "DAI";
type Expiry = "1h" | "6h" | "24h" | "48h" | "7d";

interface Order {
  id: string;
  anonId: string;
  side: Side;
  token: Token;
  amount: number;
  price: number;
  premium: number;
  timePosted: string;
}

interface Trade {
  date: string;
  type: Side;
  amount: string;
  price: string;
  status: "Completed" | "Pending" | "Cancelled";
  counterparty: string;
}

interface ExecutionStep {
  label: string;
  done: boolean;
  waiting: boolean;
}

const TOKENS: Token[] = ["ETH", "USDC", "USDT", "WBTC", "DAI"];
const EXPIRIES: Expiry[] = ["1h", "6h", "24h", "48h", "7d"];

const MOCK_BUY_ORDERS: Order[] = [
  { id: "b1", anonId: "Anon-7f3a", side: "BUY", token: "ETH", amount: 25.0, price: 3842.5, premium: 0.2, timePosted: "2m" },
  { id: "b2", anonId: "Anon-2c8b", side: "BUY", token: "ETH", amount: 50.0, price: 3838.0, premium: -0.1, timePosted: "5m" },
  { id: "b3", anonId: "Anon-9e1d", side: "BUY", token: "ETH", amount: 10.5, price: 3835.0, premium: -0.2, timePosted: "8m" },
  { id: "b4", anonId: "Anon-4a7f", side: "BUY", token: "ETH", amount: 100.0, price: 3830.0, premium: -0.4, timePosted: "12m" },
  { id: "b5", anonId: "Anon-6b2e", side: "BUY", token: "ETH", amount: 15.0, price: 3825.0, premium: -0.5, timePosted: "18m" },
  { id: "b6", anonId: "Anon-1d4c", side: "BUY", token: "ETH", amount: 75.0, price: 3820.0, premium: -0.7, timePosted: "22m" },
];

const MOCK_SELL_ORDERS: Order[] = [
  { id: "s1", anonId: "Anon-3f8a", side: "SELL", token: "ETH", amount: 30.0, price: 3850.0, premium: 0.4, timePosted: "1m" },
  { id: "s2", anonId: "Anon-8d2c", side: "SELL", token: "ETH", amount: 20.0, price: 3855.0, premium: 0.5, timePosted: "4m" },
  { id: "s3", anonId: "Anon-5e9a", side: "SELL", token: "ETH", amount: 45.0, price: 3860.0, premium: 0.7, timePosted: "7m" },
  { id: "s4", anonId: "Anon-0b7d", side: "SELL", token: "ETH", amount: 12.0, price: 3870.0, premium: 0.9, timePosted: "11m" },
  { id: "s5", anonId: "Anon-a1f3", side: "SELL", token: "ETH", amount: 60.0, price: 3880.0, premium: 1.2, timePosted: "15m" },
  { id: "s6", anonId: "Anon-c4e8", side: "SELL", token: "ETH", amount: 8.5, price: 3890.0, premium: 1.4, timePosted: "20m" },
];

const MOCK_TRADES: Trade[] = [
  { date: "2026-04-11 09:14", type: "BUY", amount: "18.5 ETH", price: "$3,841.20", status: "Completed", counterparty: "Anon-7f3a" },
  { date: "2026-04-10 22:08", type: "SELL", amount: "42.0 ETH", price: "$3,856.00", status: "Completed", counterparty: "Anon-5e9a" },
  { date: "2026-04-10 14:32", type: "BUY", amount: "5.0 WBTC", price: "$67,420.00", status: "Completed", counterparty: "Anon-2c8b" },
];

const INITIAL_EXECUTION_STEPS: ExecutionStep[] = [
  { label: "ZK proof generated — funds verified", done: false, waiting: false },
  { label: "Escrow smart contract locked", done: false, waiting: false },
  { label: "Counterparty confirmed", done: false, waiting: false },
  { label: "Trade settled — funds delivered to stealth address", done: false, waiting: false },
];

/**
 * Dark Pool — Private OTC Trading
 * Trade large size anonymously with ZK-proven funds + escrowed settlement.
 */
export function DarkPool() {
  const [side, setSide] = useState<Side>("BUY");
  const [token, setToken] = useState<Token>("ETH");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [isMarket, setIsMarket] = useState(false);
  const [premium, setPremium] = useState(0);
  const [expiry, setExpiry] = useState<Expiry>("24h");

  const [view, setView] = useState<"trade" | "book" | "history">("trade");

  const [executionActive, setExecutionActive] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>(INITIAL_EXECUTION_STEPS);
  const [currentStep, setCurrentStep] = useState(-1);

  const runExecution = useCallback(() => {
    setExecutionActive(true);
    setExecutionSteps(INITIAL_EXECUTION_STEPS);
    setCurrentStep(0);
  }, []);

  useEffect(() => {
    if (!executionActive || currentStep < 0) return;
    if (currentStep >= INITIAL_EXECUTION_STEPS.length) return;

    const delay = currentStep === 2 ? 2500 : 1200;

    setExecutionSteps((prev) =>
      prev.map((s, i) =>
        i === currentStep ? { ...s, waiting: true, done: false } : s
      )
    );

    const timer = setTimeout(() => {
      setExecutionSteps((prev) =>
        prev.map((s, i) =>
          i === currentStep ? { ...s, waiting: false, done: true } : s
        )
      );
      setCurrentStep((p) => p + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [executionActive, currentStep]);

  const bestBid = MOCK_BUY_ORDERS[0].price;
  const bestAsk = MOCK_SELL_ORDERS[0].price;
  const spreadAbs = (bestAsk - bestBid).toFixed(2);
  const spreadPct = (((bestAsk - bestBid) / bestBid) * 100).toFixed(2);
  const midPrice = (bestBid + bestAsk) / 2;

  return (
    <div className="max-w-[980px] mx-auto">
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5 max-w-[560px]">
        Trade size anonymously. ZK proofs verify funds without revealing identity, and
        every settlement clears through on-chain escrow.
      </p>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-5 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-1 max-w-[420px]">
        {(
          [
            { k: "trade", l: "Place order" },
            { k: "book", l: "Order book" },
            { k: "history", l: "My trades" },
          ] as const
        ).map((t) => (
          <button
            key={t.k}
            onClick={() => setView(t.k)}
            className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
              view === t.k
                ? "bg-[#6366f1] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {view === "trade" && (
        <div className="grid md:grid-cols-[1fr_280px] gap-5">
          {/* ── LEFT: Create order form ──────────────────── */}
          <div className="space-y-4 min-w-0">
            {/* Buy / Sell toggle */}
            <div className="flex gap-2">
              {(["BUY", "SELL"] as Side[]).map((s) => {
                const active = side === s;
                const activeBg = s === "BUY" ? "bg-emerald-500 border-emerald-500" : "bg-red-500 border-red-500";
                const idleColor = s === "BUY" ? "text-emerald-400" : "text-red-400";
                return (
                  <button
                    key={s}
                    onClick={() => setSide(s)}
                    className={`flex-1 py-2 rounded-lg text-[13px] font-semibold border transition-colors ${
                      active
                        ? `${activeBg} text-white`
                        : `bg-[var(--bg)] border-[var(--border)] ${idleColor} hover:border-[var(--border)]`
                    }`}
                  >
                    {s === "BUY" ? "Buy" : "Sell"}
                  </button>
                );
              })}
            </div>

            {/* Token */}
            <Field label="Token">
              <div className="flex gap-1.5 flex-wrap">
                {TOKENS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setToken(t)}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                      token === t
                        ? "bg-[#6366f1] text-white"
                        : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[#6366f1]/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>

            {/* Amount + Price */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount">
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors"
                />
              </Field>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
                    Price
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMarket}
                      onChange={(e) => setIsMarket(e.target.checked)}
                      className="accent-[#6366f1]"
                    />
                    Market
                  </label>
                </div>
                <input
                  type="number"
                  placeholder={isMarket ? "Market price" : "0.00"}
                  value={isMarket ? midPrice.toFixed(2) : price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isMarket}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#6366f1] focus:outline-none transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            {/* Premium slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
                  Premium / discount
                </label>
                <span
                  className={`text-[13px] font-medium tabular-nums ${
                    premium > 0
                      ? "text-emerald-400"
                      : premium < 0
                      ? "text-red-400"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {premium > 0 ? "+" : ""}
                  {premium.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min={-5}
                max={5}
                step={0.1}
                value={premium}
                onChange={(e) => setPremium(parseFloat(e.target.value))}
                className="w-full accent-[#6366f1]"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                <span>-5%</span>
                <span>0%</span>
                <span>+5%</span>
              </div>
            </div>

            {/* Expiry */}
            <Field label="Expiry">
              <div className="flex gap-1.5 flex-wrap">
                {EXPIRIES.map((e) => (
                  <button
                    key={e}
                    onClick={() => setExpiry(e)}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                      expiry === e
                        ? "bg-[#6366f1] text-white"
                        : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[#6366f1]/50"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </Field>

            <button className="btn-primary w-full py-3 text-[13px] font-semibold">
              Post anonymous order
            </button>
          </div>

          {/* ── RIGHT: Market state + privacy ────────────── */}
          <aside className="md:sticky md:top-4 self-start">
            <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-4">
              <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
                Market
              </p>

              <div className="space-y-2.5">
                <Stat label="Best bid" value={`$${bestBid.toLocaleString()}`} tone="emerald" />
                <Stat label="Best ask" value={`$${bestAsk.toLocaleString()}`} tone="red" />
                <Stat label="Spread" value={`$${spreadAbs} (${spreadPct}%)`} />
                <Stat label="24h volume" value="$4.2M" />
                <Stat label="Active orders" value="47" />
              </div>

              <div className="h-px bg-[var(--border-subtle)]" />

              <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
                Escrow protection
              </p>
              <ul className="space-y-1.5 text-[11px] text-[var(--text-muted)] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                  <span>Funds locked until both parties confirm</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                  <span>ZK proof hides identity, not size</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                  <span>Dispute arbitration if one side stalls</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      {view === "book" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[12px]">
            <p className="text-[var(--text-secondary)]">
              {MOCK_BUY_ORDERS.length + MOCK_SELL_ORDERS.length} live orders
            </p>
            <p className="text-[var(--text-muted)]">
              Spread{" "}
              <span className="text-emerald-400 font-mono tabular-nums">
                ${spreadAbs} ({spreadPct}%)
              </span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <OrderBookSide
              title="Bids"
              orders={MOCK_BUY_ORDERS}
              side="BUY"
              onTake={runExecution}
            />
            <OrderBookSide
              title="Asks"
              orders={MOCK_SELL_ORDERS}
              side="SELL"
              onTake={runExecution}
            />
          </div>

          {executionActive && (
            <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3">
              <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">
                Trade execution
              </p>
              <div className="space-y-2.5">
                {executionSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {step.done ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-400/15 text-emerald-400">
                          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : step.waiting ? (
                        <span className="block w-3.5 h-3.5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="block w-3.5 h-3.5 rounded-full border border-[var(--border)]" />
                      )}
                    </div>
                    <span
                      className={`text-[13px] ${
                        step.done
                          ? "text-emerald-400"
                          : step.waiting
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              {executionSteps.every((s) => s.done) && (
                <div className="pt-2 flex items-center justify-between border-t border-[var(--border-subtle)]">
                  <p className="text-[12px] text-emerald-400 font-medium">
                    Trade settled successfully
                  </p>
                  <button
                    onClick={() => {
                      setExecutionActive(false);
                      setCurrentStep(-1);
                    }}
                    className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {view === "history" && (
        <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-4">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">
            My trades
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.06em] border-b border-[var(--border-subtle)]">
                  <th className="text-left py-2 font-medium">Date</th>
                  <th className="text-left py-2 font-medium">Side</th>
                  <th className="text-right py-2 font-medium">Amount</th>
                  <th className="text-right py-2 font-medium">Price</th>
                  <th className="text-right py-2 font-medium">Status</th>
                  <th className="text-right py-2 font-medium">Counterparty</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_TRADES.map((trade, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--border-subtle)]/50 hover:bg-[var(--bg)]/40"
                  >
                    <td className="py-2.5 text-[11px] text-[var(--text-muted)] font-mono">
                      {trade.date}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`text-[11px] font-semibold ${
                          trade.type === "BUY" ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-[12px] text-[var(--text-primary)] font-mono tabular-nums">
                      {trade.amount}
                    </td>
                    <td className="py-2.5 text-right text-[12px] text-[var(--text-primary)] font-mono tabular-nums">
                      {trade.price}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="inline-block text-[10px] font-medium bg-emerald-400/10 text-emerald-400 rounded-full px-2 py-0.5">
                        {trade.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-[11px] text-[var(--text-muted)] font-mono">
                      {trade.counterparty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tiny helpers ─────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "red";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "red"
      ? "text-red-400"
      : "text-[var(--text-primary)]";
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
      <span className={`text-[13px] font-medium tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function OrderBookSide({
  title,
  orders,
  side,
  onTake,
}: {
  title: string;
  orders: Order[];
  side: Side;
  onTake: () => void;
}) {
  const sideColor = side === "BUY" ? "text-emerald-400" : "text-red-400";
  const takeStyle =
    side === "BUY"
      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
      : "bg-red-500 hover:bg-red-600 text-white";

  return (
    <div className="bg-[var(--card)] border border-[var(--border-subtle)] rounded-xl p-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <p className={`text-[11px] font-medium uppercase tracking-[0.08em] ${sideColor}`}>
          {title}
        </p>
        <p className="text-[10px] text-[var(--text-muted)]">{orders.length} open</p>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[10px] text-[var(--text-muted)] uppercase tracking-[0.06em] px-2 pb-1.5 border-b border-[var(--border-subtle)]">
        <span>Trader</span>
        <span className="text-right">Size</span>
        <span className="text-right">Price</span>
        <span className="text-right">Time</span>
      </div>

      <div className="divide-y divide-[var(--border-subtle)]/40">
        {orders.map((order, i) => (
          <div
            key={order.id}
            className={`group grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-2 py-2 text-[12px] rounded ${
              i === 0 ? (side === "BUY" ? "bg-emerald-500/[0.04]" : "bg-red-500/[0.04]") : ""
            }`}
          >
            <span className="text-[var(--text-muted)] font-mono text-[11px] truncate">
              {order.anonId}
            </span>
            <span className={`text-right font-mono tabular-nums ${sideColor}`}>
              {order.amount}
            </span>
            <span className="text-right text-[var(--text-primary)] font-mono tabular-nums">
              ${order.price.toLocaleString()}
            </span>
            <div className="relative text-right w-12">
              <span className="text-[var(--text-muted)] text-[11px] group-hover:opacity-0 transition-opacity">
                {order.timePosted}
              </span>
              <button
                onClick={onTake}
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 text-[10px] font-medium rounded transition-opacity ${takeStyle}`}
              >
                Take
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
