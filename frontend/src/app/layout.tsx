import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cashinviz.com"),
  title: {
    default: "Cashinviz — private crypto transactions",
    template: "%s · Cashinviz",
  },
  description:
    "Send ETH and ERC-20s privately with zero-knowledge proofs. " +
    "No custody, no logs, no chain-analysis trail.",
  applicationName: "Cashinviz",
  openGraph: {
    title: "Cashinviz — private crypto transactions",
    description:
      "Send ETH and ERC-20s privately with zero-knowledge proofs.",
    url: "https://cashinviz.com",
    siteName: "Cashinviz",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cashinviz — private crypto transactions",
    description:
      "Send ETH and ERC-20s privately with zero-knowledge proofs.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Wallet-extension compatibility shim. Loaded as a same-origin
            external script (not inline) so the page CSP can keep
            `script-src 'self'` without `'unsafe-inline'`. The script
            is synchronous and lives in <head>, which means the HTML
            parser blocks until it executes — running before user code
            that touches window.ethereum. See public/wallet-shim.js. */}
        <script src="/wallet-shim.js" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
