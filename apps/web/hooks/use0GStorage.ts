"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

type StorageUploadResponse = {
  uri?: string;
  error?: string;
  hint?: string;
};

export function use0GStorage() {
  const { address, isConnected } = useAccount();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = async (file: File, label: string = "file"): Promise<string | null> => {
    if (!isConnected || !address) {
      setUploadError("Wallet not connected");
      return null;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("label", label);

      const response = await fetch("/api/0g/storage/upload", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as StorageUploadResponse;

      if (!response.ok || !body.uri) {
        const detail = [body.error, body.hint].filter(Boolean).join(" ");
        throw new Error(detail || "Failed to upload file to 0G Storage");
      }

      return body.uri;
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
