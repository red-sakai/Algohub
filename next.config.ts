import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
