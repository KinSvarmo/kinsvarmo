"use client";

import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { INFTRegistryABI, CONTRACT_ADDRESSES } from "@/lib/contracts";
import type { Address } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

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

export function useMintINFT() {
  const { writeContractAsync, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  async function mint(to: Address, encryptedURI: string, metadataHash: `0x${string}`) {
    if (CONTRACT_ADDRESSES.INFTRegistry === ZERO_ADDRESS) {
      throw new Error("INFT registry address is not configured. Set NEXT_PUBLIC_INFT_REGISTRY_ADDRESS.");
    }

    return writeContractAsync({
      address: CONTRACT_ADDRESSES.INFTRegistry,
      abi: INFTRegistryABI,
      functionName: "mint",
      args: [to, encryptedURI, metadataHash],
    });
  }

  return { mint, txHash, isPending, isConfirming, isSuccess, error };
}
