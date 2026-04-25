import { defineChain } from "viem";

export const ogTestnet = defineChain({
  id: 16602,
  name: "0G-Galileo-Testnet",
  nativeCurrency: {
    name: "0G Token",
    symbol: "OG",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://evmrpc-testnet.0g.ai"] },
    public: { http: ["https://evmrpc-testnet.0g.ai"] },
  },
  blockExplorers: {
    default: {
      name: "0G Chain Scan",
      url: "https://chainscan-galileo.0g.ai",
    },
  },
  testnet: true,
});
