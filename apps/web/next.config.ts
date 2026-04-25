import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@kingsvarmo/shared"],
  serverExternalPackages: ["wagmi", "viem", "@wagmi/core", "@wagmi/connectors"],
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };

    // Resolve viem's internal #accounts package.json imports field
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      accounts: false,
    };

    if (!isServer) {
      config.resolve.conditionNames = [
        "browser",
        "module",
        "require",
        "default",
      ];
    }

    return config;
  },
};

export default nextConfig;
