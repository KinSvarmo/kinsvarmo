import type { AgentStatus, SupportedInputFormat } from "./statuses";

export interface AgentListing {
  id: string;
  onchainTokenId?: string;
  contractAddress?: string;
  name: string;
  slug: string;
  creatorName: string;
  creatorWallet: string;
  description: string;
  longDescription?: string;
  domain: string;
  supportedFormats: SupportedInputFormat[];
  priceIn0G: string;
  runtimeEstimateSeconds: number;
  status: AgentStatus;
  previewOutput: string;
  expectedOutput: string;
  privacyNotes: string;
  intelligenceReference?: string;
  storageReference?: string;
  createdAt: string;
}

export interface AgentPublishInput {
  name: string;
  description: string;
  creatorWallet: string;
  priceIn0G: string;
  supportedFormats: SupportedInputFormat[];
  intelligenceReference: string;
}
