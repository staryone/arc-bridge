import type { NextConfig } from "next";

/**
 * Security headers — closes F-001 (missing CSP/XFO/XCTO/Referrer/Permissions).
 * CSP is intentionally slightly loose for wallet injectors + Circle/WC websockets.
 * Tighten further on mainnet once domain is fixed.
 */
const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  // Wallet libs + Next often need inline/eval in practice; avoid breaking connect
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  // Circle iris/API, public RPCs, WalletConnect relay, explorers
  "connect-src 'self' https: wss: http://127.0.0.1:* http://localhost:*",
  "frame-src 'self' https://verify.walletconnect.com https://verify.walletconnect.org https://*.walletconnect.com https://*.walletconnect.org",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // HSTS only meaningful on HTTPS prod hosts (Vercel/custom domain)
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // F-002: never ship browser source maps on public preview
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["pino", "thread-stream"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
