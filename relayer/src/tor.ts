/**
 * Tor integration — optional SOCKS5 proxy for every outbound RPC.
 *
 * When `TOR_ENABLED=true`, every viem transport routes through the
 * local Tor SOCKS5 port. The operator's egress IP becomes an exit-node
 * IP. Combined with hosting the relayer itself as a hidden service,
 * this severs the link between the submitter and the on-chain tx.
 *
 * We export a fetch-shaped function so viem's `http` transport can
 * use it directly (viem lets us pass `fetch: ourCustomFetch`).
 *
 * Node's built-in `fetch` (undici) doesn't speak SOCKS5, so we fall
 * back to `node:https`/`node:http` with the SocksProxyAgent attached.
 * That loses HTTP/2 and connection pooling, but Tor exits don't
 * speak HTTP/2 anyway, and the pool-of-one is correct over Tor
 * because circuit rotation benefits from fresh connections.
 */

import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import { SocksProxyAgent } from "socks-proxy-agent";
import { log } from "./logger";

const TOR_ENABLED = process.env.TOR_ENABLED === "true";
const TOR_HOST = process.env.TOR_SOCKS_HOST || "127.0.0.1";
const TOR_PORT = parseInt(process.env.TOR_SOCKS_PORT || "9050");

let cachedAgent: SocksProxyAgent | null = null;

function getAgent(): SocksProxyAgent {
  if (!cachedAgent) {
    // `socks5h` resolves DNS through the proxy — required so the
    // exit node (not the relayer host) sees the RPC hostname.
    const proxyUrl = `socks5h://${TOR_HOST}:${TOR_PORT}`;
    cachedAgent = new SocksProxyAgent(proxyUrl);
    log.info("tor transport enabled", { proxy: `${TOR_HOST}:${TOR_PORT}` });
  }
  return cachedAgent;
}

/**
 * Fetch-shaped function backed by node:https over a SOCKS5 proxy.
 * Returns a real `Response` object so viem's http transport is happy.
 */
function torFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? new URL(input) : new URL(input.toString());
  const lib = url.protocol === "https:" ? https : http;
  const method = init?.method ?? "GET";
  const body = typeof init?.body === "string" ? init.body : undefined;

  // Normalize headers into a plain object.
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
    } else if (Array.isArray(init.headers)) {
      for (const [k, v] of init.headers) headers[k.toLowerCase()] = v;
    } else {
      for (const [k, v] of Object.entries(init.headers)) headers[k.toLowerCase()] = String(v);
    }
  }
  if (body) headers["content-length"] = Buffer.byteLength(body).toString();

  return new Promise<Response>((resolve, reject) => {
    const req = lib.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
        agent: getAgent(),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const responseHeaders = new Headers();
          for (const [k, v] of Object.entries(res.headers)) {
            if (Array.isArray(v)) v.forEach((vv) => responseHeaders.append(k, vv));
            else if (v !== undefined) responseHeaders.set(k, v);
          }
          resolve(new Response(text, { status: res.statusCode ?? 502, headers: responseHeaders }));
        });
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    // 30s hard timeout — Tor circuits can be slow, but an RPC call
    // hanging longer than this is almost always a dead exit.
    req.setTimeout(30_000, () => {
      req.destroy(new Error("tor request timeout"));
    });
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Returns the fetch implementation to pass to viem's http transport.
 * When Tor is disabled, this is undefined → viem uses the native
 * fetch and we skip all the proxy overhead.
 */
export function getTorFetch(): typeof fetch | undefined {
  if (!TOR_ENABLED) return undefined;
  return torFetch as unknown as typeof fetch;
}

export function isTorEnabled(): boolean {
  return TOR_ENABLED;
}

export const ONION_SETUP_GUIDE = `
# /etc/tor/torrc additions for relayer operators:
#
#   HiddenServiceDir /var/lib/tor/mixer-relayer/
#   HiddenServicePort 80 127.0.0.1:4000
#
# After 'sudo systemctl restart tor', your .onion address is at:
#   cat /var/lib/tor/mixer-relayer/hostname
#
# Combined with TOR_ENABLED=true for outbound RPC, both halves of
# the relay (ingress + egress) are over Tor.
`;
