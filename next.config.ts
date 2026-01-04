import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Note: Next.js uses some inline scripts for hydration (__NEXT_DATA__), so a
// nonce-based CSP is the ideal long-term approach. This config adds a CSP header
// at the server level with a minimal set of allowances to avoid breaking runtime.
const ContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy,
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ejmsuhxbwctiseruvass.supabase.co',
        pathname: '/storage/v1/object/public/license-photos/**',
      },
      {
        protocol: 'https',
        hostname: 'ejmsuhxbwctiseruvass.supabase.co',
        pathname: '/storage/v1/object/sign/license-photos/**',
      },
      {
        protocol: 'https',
        hostname: 'ejmsuhxbwctiseruvass.supabase.co',
        pathname: '/storage/v1/object/public/avatars/**',
      },
    ],
  },
};

export default nextConfig;
