"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { BrowserProvider, ethers } from "ethers";
import { bytesToHex, generateAes256Key, uploadBrowserFile } from "@kingsvarmo/zero-g";
import { numberToHex } from "viem";
import { ogTestnet } from "@/lib/chain";
import { getBrowserZeroGIndexerRpc } from "@/lib/zero-g-storage";

const ZERO_G_TESTNET = {
  rpcUrl: "https://evmrpc-testnet.0g.ai",
  indexerRpc: getBrowserZeroGIndexerRpc(),
} as const;

export function use0GStorage() {
  const { address, isConnected } = useAccount();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!isConnected || !address) {
      setUploadError("Wallet not connected");
      return null;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const ethereum = (window as any).ethereum as
        | {
            request(args: { method: string; params?: unknown[] }): Promise<unknown>;
          }
        | undefined;
      if (!ethereum) throw new Error("MetaMask is not installed!");

      const currentChainId = await ethereum.request({ method: "eth_chainId" });
      const targetChainIdHex = numberToHex(ogTestnet.id);

      if (currentChainId !== targetChainIdHex) {
        try {
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: targetChainIdHex }],
          });
        } catch (switchError: any) {
          if (switchError?.code !== 4902) {
            throw new Error("Please switch your wallet to 0G Galileo Testnet before uploading.");
          }

          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: targetChainIdHex,
                chainName: ogTestnet.name,
                nativeCurrency: ogTestnet.nativeCurrency,
                rpcUrls: ogTestnet.rpcUrls.default.http,
                blockExplorerUrls: [ogTestnet.blockExplorers.default.url],
              },
            ],
          });
        }
      }

      const provider = new BrowserProvider(ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      const encryptionKey = generateAes256Key();
      const { rootHash } = await uploadBrowserFile(
        file,
        ZERO_G_TESTNET,
        signer as ethers.Signer,
        undefined,
        { type: "aes256", key: encryptionKey },
        "dataset",
      );
      const hexKey = bytesToHex(encryptionKey);

      return `0g://dataset/${rootHash}?key=${hexKey}`;
    } catch (err: any) {
      console.error("0G Storage upload failed:", err);
      setUploadError(err.message || "Failed to upload file to 0G Storage");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadFile,
    isUploading,
    uploadError,
  };
}
