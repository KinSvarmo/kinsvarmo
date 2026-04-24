export type AgentStatus = "draft" | "published" | "paused";

export type JobStatus =
  | "created"
  | "authorized"
  | "planning"
  | "analyzing"
  | "reviewing"
  | "reporting"
  | "completed"
  | "failed";

export type ModuleStatus = "pending" | "running" | "completed" | "failed";

export type AxLMessageType =
  | "job.created"
  | "plan.generated"
  | "analysis.started"
  | "analysis.completed"
  | "critic.reviewed"
  | "report.generated"
  | "job.failed";

export interface AgentListing {
  id: string;
  onchainTokenId?: string;
  contractAddress?: string;
  name: string;
  slug: string;
  creatorName: string;
  creatorWallet: string;
  description: string;
  supportedFormats: string[];
  priceIn0G: string;
  runtimeEstimateSeconds: number;
  status: AgentStatus;
  previewOutput: string;
  intelligenceReference?: string;
  storageReference?: string;
  createdAt: string;
}

export interface AnalysisJob {
  id: string;
  agentId: string;
  userWallet: string;
  filename: string;
  uploadReference?: string;
  inputMetadata: Record<string, unknown>;
  status: JobStatus;
  paymentStatus: "pending" | "authorized" | "settled" | "failed";
  plannerStatus: ModuleStatus;
  analyzerStatus: ModuleStatus;
  criticStatus: ModuleStatus;
  reporterStatus: ModuleStatus;
  keeperhubRunId?: string;
  resultId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisResult {
  id: string;
  jobId: string;
  summary: string;
  confidence: number;
  keyFindings: string[];
  structuredJson: Record<string, unknown>;
  provenanceId: string;
  downloadUrl?: string;
  completedAt: string;
}

export interface AxLMessage {
  id: string;
  jobId: string;
  sender: "planner" | "analyzer" | "critic" | "reporter" | "api";
  receiver: "planner" | "analyzer" | "critic" | "reporter" | "api";
  type: AxLMessageType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export const seededAgents: AgentListing[] = [
  {
    id: "agent_alkaloid_predictor_v2",
    name: "Alkaloid Predictor v2",
    slug: "alkaloid-predictor-v2",
    creatorName: "Dr. Mira Solenne",
    creatorWallet: "0x0000000000000000000000000000000000000000",
    description:
      "A deterministic phytochemistry analysis agent for small alkaloid screening datasets.",
    supportedFormats: ["csv", "json"],
    priceIn0G: "0.25",
    runtimeEstimateSeconds: 90,
    status: "published",
    previewOutput: "Predicted alkaloid-like compound families with confidence notes.",
    intelligenceReference: "0g://placeholder/intelligence/alkaloid-v2",
    storageReference: "0g://placeholder/metadata/alkaloid-v2",
    createdAt: "2026-04-24T00:00:00.000Z"
  }
];
