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
