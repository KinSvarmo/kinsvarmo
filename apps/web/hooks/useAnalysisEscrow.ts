"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { AnalysisEscrowABI, CONTRACT_ADDRESSES } from "@/lib/contracts";

export function useCreateJob() {
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  function createJob(agentTokenId: bigint, datasetReference: string, priceIn0G: string) {
    writeContract({
      address: CONTRACT_ADDRESSES.AnalysisEscrow,
      abi: AnalysisEscrowABI,
      functionName: "createJob",
      args: [agentTokenId, datasetReference],
      value: parseEther(priceIn0G),
    });
  }

  return {
    createJob,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
  };
}
