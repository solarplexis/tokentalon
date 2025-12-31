import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark server-only packages
  serverExternalPackages: [
    'pino',
    'thread-stream',
    'pino-pretty',
    'ethers',
    'openai',
    'pinata',
  ],
  // Empty turbopack config to silence warning about webpack config
  turbopack: {},
};

export default nextConfig;
