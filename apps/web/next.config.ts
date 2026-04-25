import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@kingsvarmo/shared"],
  serverExternalPackages: ["wagmi", "viem", "@wagmi/core", "@wagmi/connectors"],
  webpack: (config, { isServer, webpack }) => {
    config.resolve.fallback = { 
      fs: false, 
      net: false, 
      tls: false,
      crypto: false,
      "node:crypto": false,
    };

    // Resolve viem's internal #accounts package.json imports field
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      accounts: false,
      "crypto": false,
      "fs": false,
      "fs/promises": false,
      "path": false,
    };

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^node:/,
        (resource: any) => {
          resource.request = resource.request.replace(/^node:/, "");
        }
      )
    );

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
  async rewrites() {
    return [
      {
        source: "/0g-indexer/:path*",
        destination: "https://indexer-storage-testnet-standard.0g.ai/:path*",
      },
      {
        source: "/0g-indexer",
        destination: "https://indexer-storage-testnet-standard.0g.ai",
      }
    ];
  },
};

export default nextConfig;
