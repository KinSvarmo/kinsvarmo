"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
// Real SDK import to be used once installed:
import { Blob as ZgBlob, Indexer } from "@0gfoundation/0g-ts-sdk";
import { BrowserProvider } from "ethers";
import { getWalletClient } from "@wagmi/core";
import { wagmiConfig } from "@/lib/wagmi";

export function use0GStorage() {
  const { address, isConnected } = useAccount();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /**
   * Uploads a File to 0G Storage using the user's connected wallet.
   * No private key is required, as the SDK will request a signature via MetaMask.
   */
  const uploadFile = async (file: File): Promise<string | null> => {
    if (!isConnected || !address) {
      setUploadError("Wallet not connected");
      return null;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // ────────────────────────────────────────────────────────────────────────
      // REAL IMPLEMENTATION (Uncomment when @0gfoundation/0g-ts-sdk & ethers are installed)
      // ────────────────────────────────────────────────────────────────────────

      // 1. Get the EIP-1193 provider from wagmi
      const walletClient = await getWalletClient(wagmiConfig);
      if (!walletClient) throw new Error("Wallet client not found");

      // 2. Initialize ethers BrowserProvider and Signer
      const provider = new BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();

      // 3. Initialize 0G SDK objects
      const RPC_URL = 'https://evmrpc-testnet.0g.ai';
      // Use local Next.js proxy to bypass CORS
      const INDEXER_RPC = '/0g-indexer';
      const indexer = new Indexer(INDEXER_RPC);

      // 4. Wrap the browser File object into ZgBlob and build the Merkle Tree
      const zgBlob = new ZgBlob(file);
      const [tree, treeErr] = await zgBlob.merkleTree();
      if (treeErr !== null) throw new Error(`Merkle tree error: ${treeErr}`);

      // 5. Upload to 0G Storage
      const [tx, uploadErr] = await indexer.upload(zgBlob, RPC_URL, signer);
      if (uploadErr !== null) throw new Error(`Upload error: ${uploadErr}`);

      // The root hash might be nested depending on the file size
      const rootHash = 'rootHash' in tx ? tx.rootHash : tx.rootHashes[0];
      return `0g://dataset/${rootHash}`;


      // ────────────────────────────────────────────────────────────────────────
      // SIMULATED IMPLEMENTATION (For UI development)
      // ────────────────────────────────────────────────────────────────────────
      console.log("Simulating 0G Storage upload for:", file.name);
      console.log("Using Wallet:", address);

      // Simulate network delay for upload
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Generate a fake root hash for UI demo
      const fakeRootHash = "0x" + Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');

      return `0g://dataset/${fakeRootHash}`;

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
