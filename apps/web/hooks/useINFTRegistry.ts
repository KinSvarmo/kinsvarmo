"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { INFTRegistryABI, CONTRACT_ADDRESSES } from "@/lib/contracts";
import type { Address } from "viem";

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
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function mint(to: Address, encryptedURI: string, metadataHash: `0x${string}`) {
    writeContract({
      address: CONTRACT_ADDRESSES.INFTRegistry,
      abi: INFTRegistryABI,
      functionName: "mint",
      args: [to, encryptedURI, metadataHash],
    });
  }

  return { mint, txHash, isPending, isConfirming, isSuccess, error };
}
