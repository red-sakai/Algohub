import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://playcanvas.com https://*.playcanvas.com;",
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
