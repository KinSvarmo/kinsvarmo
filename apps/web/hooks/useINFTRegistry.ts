"use client";

import { useEffect, useState } from "react";
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { INFTRegistryABI, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { ogTestnet } from "@/lib/chain";
import { downloadBrowserFile } from "@kingsvarmo/zero-g";
import { numberToHex, type Address } from "viem";
import { getBrowserZeroGIndexerRpc } from "@/lib/zero-g-storage";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const ZERO_G_STORAGE = {
  rpcUrl: "https://evmrpc-testnet.0g.ai",
  indexerRpc: getBrowserZeroGIndexerRpc(),
} as const;

type TokenMetadataJSON = {
  name?: string;
  description?: string;
  domain?: string;
  creatorName?: string;
  previewOutput?: string;
  intelligenceReference?: string;
  storageReference?: string;
  metadataURI?: string;
  promptTemplate?: string;
  priceIn0G?: string;
  runtimeSeconds?: string;
  formats?: string[];
};

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

function parse0GUri(uri: string): { rootHash: string; symmetricKey?: string } | null {
  const match = uri.match(/^0g:\/\/[^/]+\/(0x[0-9a-fA-F]{64})(?:\?key=(0x[0-9a-fA-F]+))?$/);
  if (!match) return null;
  return match[2]
    ? { rootHash: match[1]!, symmetricKey: match[2] }
    : { rootHash: match[1]! };
}

export function useGetEncryptedURI(tokenId: bigint | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.INFTRegistry,
    abi: INFTRegistryABI,
    functionName: "getEncryptedURI",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined },
  });
}

export function useOwnerOf(tokenId: bigint | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.INFTRegistry,
    abi: INFTRegistryABI,
    functionName: "ownerOf",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined },
  });
}

export function useINFTToken(tokenId: bigint | undefined) {
  const enabled = tokenId !== undefined && CONTRACT_ADDRESSES.INFTRegistry !== ZERO_ADDRESS;

  const owner = useReadContract({
    address: CONTRACT_ADDRESSES.INFTRegistry,
    abi: INFTRegistryABI,
    functionName: "ownerOf",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled },
  });

  const encryptedURI = useReadContract({
    address: CONTRACT_ADDRESSES.INFTRegistry,
    abi: INFTRegistryABI,
    functionName: "getEncryptedURI",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled },
  });

  const agentMetadata = useReadContract({
    address: CONTRACT_ADDRESSES.INFTRegistry,
    abi: INFTRegistryABI,
    functionName: "getAgentMetadata",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled },
  });

  const metadataHash = useReadContract({
    address: CONTRACT_ADDRESSES.INFTRegistry,
    abi: INFTRegistryABI,
    functionName: "getMetadataHash",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled },
  });

  const oracle = useReadContract({
    address: CONTRACT_ADDRESSES.INFTRegistry,
    abi: INFTRegistryABI,
    functionName: "oracle",
    query: { enabled },
  });

  return {
    owner,
    encryptedURI,
    agentMetadata,
    metadataHash,
    oracle,
    usageFee: useReadContract({
      address: CONTRACT_ADDRESSES.INFTRegistry,
      abi: INFTRegistryABI,
      functionName: "USAGE_FEE",
      query: { enabled },
    }),
    tokenURI: useReadContract({
      address: CONTRACT_ADDRESSES.INFTRegistry,
      abi: INFTRegistryABI,
      functionName: "tokenURI",
      args: tokenId !== undefined ? [tokenId] : undefined,
      query: { enabled },
    }),
    contractAddress: CONTRACT_ADDRESSES.INFTRegistry,
    tokenId,
  };
}

export function useTokenMetadata(tokenURI: string | undefined) {
  const [data, setData] = useState<TokenMetadataJSON | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!tokenURI) {
        setData(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      const parsed = parse0GUri(tokenURI);
      if (!parsed) {
        setData(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await downloadBrowserFile(
          parsed.rootHash,
          ZERO_G_STORAGE,
          undefined,
          parsed.symmetricKey ? { symmetricKey: parsed.symmetricKey } : undefined,
        );
        const text = await result.blob.text();
        const json = JSON.parse(text) as TokenMetadataJSON;
        if (!cancelled) {
          setData(json);
        }
      } catch (caught) {
        if (!cancelled) {
          setData(null);
          setError(caught instanceof Error ? caught.message : "Failed to load token metadata");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [tokenURI]);

  return { data, isLoading, error };
}

export function useMintINFT() {
  const { writeContractAsync, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  async function mint(
    to: Address,
    encryptedURI: string,
    metadataHash: `0x${string}`,
    metadata: {
      name: string;
      description: string;
      domain: string;
      creatorName: string;
      previewOutput: string;
      intelligenceReference: string;
      storageReference: string;
      metadataURI: string;
    },
  ) {
    if (CONTRACT_ADDRESSES.INFTRegistry === ZERO_ADDRESS) {
      throw new Error("INFT registry address is not configured. Set NEXT_PUBLIC_INFT_REGISTRY_ADDRESS.");
    }

    await ensure0GWalletChain();

    return writeContractAsync({
      address: CONTRACT_ADDRESSES.INFTRegistry,
      abi: INFTRegistryABI,
      functionName: "mint",
      args: [to, encryptedURI, metadataHash, metadata],
      chainId: ogTestnet.id,
    });
  }

  return { mint, txHash, isPending, isConfirming, isSuccess, error };
}

export function usePurchaseUsage() {
  const { writeContractAsync, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  async function purchaseUsage(
    tokenId: bigint,
    permissions: `0x${string}`,
    value: bigint,
  ) {
    if (CONTRACT_ADDRESSES.INFTRegistry === ZERO_ADDRESS) {
      throw new Error("INFT registry address is not configured. Set NEXT_PUBLIC_INFT_REGISTRY_ADDRESS.");
    }

    await ensure0GWalletChain();

    return writeContractAsync({
      address: CONTRACT_ADDRESSES.INFTRegistry,
      abi: INFTRegistryABI,
      functionName: "purchaseUsage",
      args: [tokenId, permissions],
      value,
      chainId: ogTestnet.id,
    });
  }

  return { purchaseUsage, txHash, isPending, isConfirming, isSuccess, error };
}

async function ensure0GWalletChain(): Promise<void> {
  const provider = getInjectedProvider();
  const targetChainId = numberToHex(ogTestnet.id);
  const currentChainId = await provider.request({ method: "eth_chainId" });

  if (currentChainId === targetChainId) {
    return;
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainId }],
    });
  } catch (caught) {
    if (!isUnknownChainError(caught)) {
      throw caught;
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: targetChainId,
          chainName: ogTestnet.name,
          nativeCurrency: ogTestnet.nativeCurrency,
          rpcUrls: ogTestnet.rpcUrls.default.http,
          blockExplorerUrls: [ogTestnet.blockExplorers.default.url],
        },
      ],
    });
  }

  await waitForChain(provider, targetChainId);
}

function getInjectedProvider(): EthereumProvider {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected wallet was found");
  }

  return window.ethereum as EthereumProvider;
}

async function waitForChain(provider: EthereumProvider, targetChainId: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const currentChainId = await provider.request({ method: "eth_chainId" });

    if (currentChainId === targetChainId) {
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }

  throw new Error("MetaMask did not switch to 0G Galileo testnet. Please switch networks manually and try again.");
}

function isUnknownChainError(caught: unknown): boolean {
  return (
    typeof caught === "object" &&
    caught !== null &&
    "code" in caught &&
    (caught as { code?: unknown }).code === 4902
  );
}
