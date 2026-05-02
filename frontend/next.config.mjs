/** @type {import('next').NextConfig} */

// Security headers applied to every HTML response. Notes:
//  - CSP: WASM (Barretenberg) needs `wasm-unsafe-eval`. The wallet shim
//    that used to live inline in layout.tsx now ships as an external
//    `/wallet-shim.js` (same-origin), so `script-src 'self'` is enough
//    — no `'unsafe-inline'` for scripts. Inline styles still need
//    `'unsafe-inline'` because Tailwind / RainbowKit emit inline style
//    attributes; tighten this further with a hash- or nonce-based CSP
//    once we audit those usages.
//  - In DEV mode we also allow `'unsafe-eval'` because Next's
//    `eval-source-map` devtool wraps every module in `eval()`. Without
//    this, webpack loads but no chunk actually executes — the entire
//    page hydration silently dies. We do NOT ship `'unsafe-eval'`
//    in production: the prod build doesn't use eval-source-map, so the
//    tighter CSP holds.
//  - connect-src: explicit allowlist of the RPC endpoints + WalletConnect
//    relay we actually use. Anything else (e.g. an attacker exfil URL
//    injected via XSS) is blocked.
//  - frame-ancestors 'none' + X-Frame-Options DENY: disables clickjacking
//    so a phishing site can't iframe us and trick wallets into signing.
//  - HSTS: long max-age + preload — once a real domain ships, submit it
//    to https://hstspreload.org so first-visit hijack is also covered.
const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = isDev
  ? "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval' 'unsafe-inline'"
  : "script-src 'self' 'wasm-unsafe-eval'";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Same-origin scripts only (the wallet shim is /wallet-shim.js).
      // 'wasm-unsafe-eval' is required by Barretenberg WASM proof generation.
      // Dev gets 'unsafe-eval' + 'unsafe-inline' as well — required by
      // Next.js's dev source-map devtool.
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://cdn.jsdelivr.net",
      "font-src 'self' data:",
      // RPC endpoints + WalletConnect relay. The list mirrors the
      // PRIVACY_RPCS table in lib/wagmi.ts; if you swap a default
      // there, swap it here too or the browser will block the call.
      //
      // ── Privacy-respecting defaults ──
      //  • https://rpc.mevblocker.io       → mainnet (MEV Blocker Full Privacy)
      //  • https://*.publicnode.com        → sepolia + L2s (no-log policy)
      //
      // ── Common operator overrides allowlisted in advance ──
      //  • https://*.lava.build            → Lava gateway (multi-provider)
      //  • https://*.flashbots.net         → Flashbots Protect
      //  • https://eth.llamarpc.com        → llama nodes (read-heavy fallback)
      //
      // ── WalletConnect ──
      //  • https://*.walletconnect.{com,org} + wss equivalents
      //
      // Do NOT broaden this to a blanket `https:` — that would defeat
      // the whole point of the CSP for an XSS-style exfil.
      "connect-src 'self' https://rpc.mevblocker.io https://*.publicnode.com https://*.lava.build https://*.flashbots.net https://eth.llamarpc.com https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org",
      "worker-src 'self' blob:",
      "frame-src 'self' https://verify.walletconnect.com https://verify.walletconnect.org",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  // Defense-in-depth — the CSP frame-ancestors above is the modern way,
  // but X-Frame-Options DENY still matters for ancient browsers / proxies.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak the user's withdraw recipient via Referer when they click
  // an external link from the dApp (chain explorer, docs, etc.).
  { key: "Referrer-Policy", value: "no-referrer" },
  // Lock down browser features the dApp doesn't need.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // 1 year HSTS + subdomains + preload eligibility.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Prevent the page from being treated as XSS-protectable by old IE/Edge —
  // value 0 is the modern recommendation (better than legacy "1; mode=block"
  // which has been linked to its own info leaks).
  { key: "X-XSS-Protection", value: "0" },
];

const nextConfig = {
  reactStrictMode: true,
  // Don't expose the X-Powered-By: Next.js banner to attackers fingerprinting
  // version-specific RCEs.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config) => {
    // Required for Barretenberg WASM to work in the browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    // Optional native-only deps that the wagmi / RainbowKit transitive
    // graph references but never actually loads in a browser build:
    //   - @react-native-async-storage/async-storage (MetaMask SDK,
    //     used only in React Native targets)
    //   - pino-pretty (WalletConnect's pino logger; pino downgrades
    //     to plain JSON output if pretty-printer is absent)
    // Aliasing them to `false` tells webpack "treat as empty module"
    // and silences the noisy "Module not found" warnings that
    // otherwise spam every dev compile.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
    };
    return config;
  },
};

export default nextConfig;
