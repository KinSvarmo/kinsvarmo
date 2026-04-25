import { createConfig, http } from "wagmi";
import { ogTestnet } from "./chain";
import { browserInjected } from "./injectedConnector";

export const injectedConnector = browserInjected();

export const wagmiConfig = createConfig({
  chains: [ogTestnet],
  connectors: [injectedConnector],
  transports: {
    [ogTestnet.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
