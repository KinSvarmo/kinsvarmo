import { createConnector, type CreateConnectorFn } from "wagmi";
import { getAddress, numberToHex, type Address } from "viem";

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function browserInjected(): CreateConnectorFn<EthereumProvider> {
  return createConnector<EthereumProvider>((config) => ({
    id: "injected",
    name: "Injected Wallet",
    type: "injected",
    async connect({ chainId, withCapabilities } = {}) {
      const provider = await this.getProvider();
      const requestedAccounts = await provider.request({
        method: "eth_requestAccounts"
      });
      const accounts = normalizeAccounts(requestedAccounts);

      if (chainId && chainId !== (await this.getChainId())) {
        await this.switchChain?.({ chainId });
      }

      return {
        accounts: (withCapabilities
          ? accounts.map((address) => ({ address, capabilities: {} }))
          : accounts) as never,
        chainId: await this.getChainId()
      };
    },
    async disconnect() {
      config.emitter.emit("disconnect");
    },
    async getAccounts() {
      const provider = await this.getProvider();
      const accounts = await provider.request({ method: "eth_accounts" });
      return normalizeAccounts(accounts);
    },
    async getChainId() {
      const provider = await this.getProvider();
      const chainId = await provider.request({ method: "eth_chainId" });
      return typeof chainId === "string" ? Number(chainId) : config.chains[0].id;
    },
    async getProvider() {
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("No injected wallet was found");
      }

      return window.ethereum;
    },
    async isAuthorized() {
      try {
        return (await this.getAccounts()).length > 0;
      } catch {
        return false;
      }
    },
    async switchChain({ chainId }) {
      const provider = await this.getProvider();
      const chain = config.chains.find((candidate) => candidate.id === chainId);

      if (!chain) {
        throw new Error(`Chain ${chainId} is not configured`);
      }

      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: numberToHex(chainId) }]
      });
      config.emitter.emit("change", { chainId });

      return chain;
    },
    onAccountsChanged(accounts) {
      const normalized = normalizeAccounts(accounts);

      if (normalized.length === 0) {
        config.emitter.emit("disconnect");
        return;
      }

      config.emitter.emit("change", { accounts: normalized });
    },
    onChainChanged(chainId) {
      config.emitter.emit("change", { chainId: Number(chainId) });
    },
    onDisconnect() {
      config.emitter.emit("disconnect");
    }
  }));
}

function normalizeAccounts(accounts: unknown): readonly Address[] {
  if (!Array.isArray(accounts)) {
    return [];
  }

  return accounts
    .filter((account): account is string => typeof account === "string")
    .map((account) => getAddress(account));
}
