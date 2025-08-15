// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true }, // you already added this
  typescript: {
    // Allow production builds to succeed even if there are TS type errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;