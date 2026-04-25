export interface ZeroGReference {
  contractAddress?: string;
  tokenId?: string;
  explorerUrl?: string;
  intelligenceReference?: string;
  storageReference?: string;
}

export interface KeeperHubExecution {
  runId: string;
  state: "queued" | "running" | "retrying" | "completed" | "failed";
  logs: string[];
  updatedAt: string;
}

export interface SponsorIntegrationSnapshot {
  zeroG: ZeroGReference;
  axl: {
    nodeCount: number;
    messageCount: number;
    healthy: boolean;
  };
  keeperHub: KeeperHubExecution | null;
}
