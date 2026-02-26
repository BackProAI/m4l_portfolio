import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration for Next.js 16+
  turbopack: {},
  
  // Mark yahoo-finance2 and chromium as external to avoid bundling test files
  serverExternalPackages: ['yahoo-finance2', '@sparticuz/chromium-min'],
  
  // Webpack fallback for when using --webpack flag
  webpack: (config, { isServer }) => {
    // Exclude yahoo-finance2 test files that import Deno dependencies
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    config.module.rules.push({
      test: /node_modules\/yahoo-finance2\/esm\/tests\//,
      use: 'null-loader',
    });

    return config;
  },
};

export default nextConfig;
