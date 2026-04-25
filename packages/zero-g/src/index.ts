export interface ZeroGAgentRecord {
  contractAddress: string;
  tokenId: string;
  explorerUrl: string;
  intelligenceReference: string;
  storageReference: string;
}

export interface ZeroGClient {
  publishAgent(input: {
    creatorWallet: string;
    metadataReference: string;
    intelligenceReference: string;
    priceIn0G: string;
  }): Promise<ZeroGAgentRecord>;
  buildExplorerUrl(contractAddress: string, tokenId?: string): string;
}

export {
  bytesToHex,
  downloadBrowserFile,
  generateAes256Key,
  hexToBytes,
  peekEncryptionHeader,
  saveBlobAsFile,
  uploadBrowserFile,
} from "./storage";

export type {
  DecryptionInput,
  DownloadResult,
  EncryptionInput,
  UploadResult,
  ZeroGNetworkConfig,
} from "./storage";
