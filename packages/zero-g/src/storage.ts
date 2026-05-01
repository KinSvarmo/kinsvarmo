import {
  Blob as ZgBlob,
  EncryptionHeader,
  Indexer,
  StorageNode,
  tryDecrypt,
} from "@0gfoundation/0g-ts-sdk";
import type { EncryptionOption, UploadOption } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";

const DEFAULT_CHUNK_SIZE = 256;
const DEFAULT_SEGMENT_MAX_CHUNKS = 1024;
const ROOT_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;

export interface ZeroGNetworkConfig {
  rpcUrl: string;
  indexerRpc: string;
}

export type EncryptionInput =
  | { type: "aes256"; key: Uint8Array }
  | { type: "ecies"; recipientPubKey: Uint8Array | string };

export interface DecryptionInput {
  symmetricKey?: Uint8Array | string;
  privateKey?: Uint8Array | string;
}

export interface UploadResult {
  rootHash: string;
  txHash: string;
}

export interface ServerUploadInput {
  bytes: Uint8Array;
  filename: string;
  contentType?: string;
  network: ZeroGNetworkConfig;
  privateKey: string;
  onStatus?: (message: string) => void;
  encryption?: EncryptionInput;
  resourceLabel?: string;
}

export interface DownloadResult {
  blob: Blob;
  filename: string;
  size: number;
}

function toSdkEncryption(input: EncryptionInput): EncryptionOption {
  return input.type === "aes256"
    ? { type: "aes256", key: input.key }
    : { type: "ecies", recipientPubKey: input.recipientPubKey };
}

export function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;

  if (normalized.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(normalized)) {
    throw new Error(`Invalid hex string: "${hex}"`);
  }

  const output = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
}

export function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function generateAes256Key(): Uint8Array {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

function getSplitNum(total: number, unit: number): number {
  return Math.floor((total - 1) / unit + 1);
}

export async function uploadBrowserFile(
  file: File,
  network: ZeroGNetworkConfig,
  signer: ethers.Signer,
  onStatus?: (message: string) => void,
  encryption?: EncryptionInput,
  resourceLabel: string = "file",
): Promise<UploadResult> {
  onStatus?.(
    encryption
      ? `Preparing ${resourceLabel} (${encryption.type} encrypt)...`
      : `Preparing ${resourceLabel}...`,
  );

  const blob = new ZgBlob(file);
  const indexer = new Indexer(network.indexerRpc);

  const [, treeErr] = await blob.merkleTree();
  if (treeErr !== null) {
    throw new Error(`Merkle tree generation failed: ${treeErr}`);
  }

  onStatus?.(`Uploading ${resourceLabel} to 0G Storage...`);

  const uploadOptions: UploadOption | undefined = encryption
    ? { encryption: toSdkEncryption(encryption) }
    : undefined;

  const [tx, uploadErr] = await indexer.upload(blob, network.rpcUrl, signer, uploadOptions);

  if (uploadErr !== null) {
    throw new Error(`Upload failed: ${uploadErr}`);
  }

  if ("rootHash" in tx) {
    return { rootHash: tx.rootHash, txHash: tx.txHash };
  }

  return { rootHash: tx.rootHashes[0] ?? "", txHash: tx.txHashes[0] ?? "" };
}

export async function uploadServerBytes(input: ServerUploadInput): Promise<UploadResult> {
  const provider = new ethers.JsonRpcProvider(input.network.rpcUrl);
  const privateKey = input.privateKey.startsWith("0x")
    ? input.privateKey
    : `0x${input.privateKey}`;
  const signer = new ethers.Wallet(privateKey, provider);
  const file = new File([input.bytes as BlobPart], input.filename, {
    type: input.contentType ?? "application/octet-stream",
  });

  return uploadBrowserFile(
    file,
    input.network,
    signer,
    input.onStatus,
    input.encryption,
    input.resourceLabel,
  );
}

export async function downloadBrowserFile(
  rootHash: string,
  network: ZeroGNetworkConfig,
  onStatus?: (message: string, percent?: number) => void,
  decryption?: DecryptionInput,
): Promise<DownloadResult> {
  if (!ROOT_HASH_REGEX.test(rootHash)) {
    throw new Error("Invalid root hash format. Expected 0x followed by 64 hex characters.");
  }

  onStatus?.("Finding file locations...");

  const indexer = new Indexer(network.indexerRpc);
  const locations = await indexer.getFileLocations(rootHash);

  if (!locations || locations.length === 0) {
    throw new Error("File not found on any storage node");
  }

  const nodes = locations.map((location) => new StorageNode(location.url));

  type FileInfoShape = {
    tx: { size: number; seq: number; startEntryIndex: number };
    finalized: boolean;
  };

  let fileInfo: FileInfoShape | null = null;

  for (const node of nodes) {
    try {
      const info = await node.getFileInfo(rootHash, true);
      if (info) {
        fileInfo = info as unknown as FileInfoShape;
        break;
      }
    } catch {
      continue;
    }
  }

  if (fileInfo === null) {
    throw new Error("Could not retrieve file info from any storage node");
  }

  const fileSize = Number(fileInfo.tx.size);
  const txSeq = Number(fileInfo.tx.seq);
  const numChunks = getSplitNum(fileSize, DEFAULT_CHUNK_SIZE);
  const startSegmentIndex = Math.floor(
    Number(fileInfo.tx.startEntryIndex) / DEFAULT_SEGMENT_MAX_CHUNKS,
  );
  const endSegmentIndex = Math.floor(
    (Number(fileInfo.tx.startEntryIndex) + numChunks - 1) / DEFAULT_SEGMENT_MAX_CHUNKS,
  );
  const numTasks = endSegmentIndex - startSegmentIndex + 1;

  onStatus?.("Downloading segments...", 0);

  const segments: Uint8Array[] = [];

  for (let taskIndex = 0; taskIndex < numTasks; taskIndex += 1) {
    const segmentIndex = taskIndex;
    const startIndex = segmentIndex * DEFAULT_SEGMENT_MAX_CHUNKS;
    let endIndex = startIndex + DEFAULT_SEGMENT_MAX_CHUNKS;

    if (endIndex > numChunks) {
      endIndex = numChunks;
    }

    let segmentBytes: Uint8Array | null = null;

    for (let nodeOffset = 0; nodeOffset < nodes.length; nodeOffset += 1) {
      const node = nodes[(taskIndex + nodeOffset) % nodes.length];
      if (!node) {
        continue;
      }

      try {
        const segment = await node.downloadSegmentByTxSeq(txSeq, startIndex, endIndex);
        if (segment === null) {
          continue;
        }

        segmentBytes = ethers.decodeBase64(segment as string);

        if (startSegmentIndex + segmentIndex === endSegmentIndex) {
          const lastChunkSize = fileSize % DEFAULT_CHUNK_SIZE;
          if (lastChunkSize > 0) {
            const paddings = DEFAULT_CHUNK_SIZE - lastChunkSize;
            segmentBytes = segmentBytes.slice(0, segmentBytes.length - paddings);
          }
        }

        break;
      } catch {
        continue;
      }
    }

    if (!segmentBytes) {
      throw new Error(`Failed to download segment ${segmentIndex} from any node`);
    }

    segments.push(segmentBytes);

    const percent = Math.round(((taskIndex + 1) / numTasks) * 100);
    onStatus?.(`Downloading segments... ${percent}%`, percent);
  }

  onStatus?.("Download complete!", 100);

  let outputBlob = new Blob(segments as BlobPart[]);
  let outputSize = fileSize;

  if (decryption) {
    onStatus?.("Decrypting...", 100);

    const cipher = new Uint8Array(await outputBlob.arrayBuffer());
    const symmetricKey =
      typeof decryption.symmetricKey === "string"
        ? hexToBytes(decryption.symmetricKey)
        : decryption.symmetricKey;
    const privateKey =
      typeof decryption.privateKey === "string" && decryption.privateKey.startsWith("0x")
        ? decryption.privateKey.slice(2)
        : decryption.privateKey;

    const decryptOptions: { symmetricKey?: Uint8Array; privateKey?: string | Uint8Array } = {};
    if (symmetricKey) {
      decryptOptions.symmetricKey = symmetricKey;
    }
    if (privateKey) {
      decryptOptions.privateKey = privateKey;
    }

    const { bytes, decrypted } = tryDecrypt(cipher, decryptOptions);
    if (!decrypted) {
      throw new Error(
        "Decryption failed. Check that the supplied key matches the file's encryption mode.",
      );
    }

    outputBlob = new Blob([bytes as BlobPart]);
    outputSize = bytes.length;
    onStatus?.("Decrypted.", 100);
  }

  return {
    blob: outputBlob,
    filename: rootHash,
    size: outputSize,
  };
}

export async function peekEncryptionHeader(
  rootHash: string,
  network: ZeroGNetworkConfig,
): Promise<EncryptionHeader | null> {
  if (!ROOT_HASH_REGEX.test(rootHash)) {
    throw new Error("Invalid root hash format. Expected 0x followed by 64 hex characters.");
  }

  const indexer = new Indexer(network.indexerRpc);
  const [header, err] = await indexer.peekHeader(rootHash);

  if (err !== null) {
    throw err;
  }

  return header;
}

export function saveBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
