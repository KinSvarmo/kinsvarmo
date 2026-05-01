import type { NextConfig } from "next";
import { getZeroGIndexerDestination } from "./lib/zero-g-storage";

const zeroGIndexerDestination = getZeroGIndexerDestination();

const nextConfig: NextConfig = {
  transpilePackages: ["@kingsvarmo/shared", "@0glabs/0g-serving-broker"],
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
        destination: `${zeroGIndexerDestination}/:path*`,
      },
      {
        source: "/0g-indexer",
        destination: zeroGIndexerDestination,
      }
    ];
  },
};

export default nextConfig;
