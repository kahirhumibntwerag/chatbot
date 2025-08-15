// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // Allow production builds to succeed even if there are ESLint errors.
    ignoreDuringBuilds: true,
  },
  // If you also see TypeScript errors stopping builds, you can temporarily:
  // typescript: { ignoreBuildErrors: true }, // not recommended long-term
};

export default nextConfig;
