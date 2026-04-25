import type { JobStatus, ModuleStatus, PaymentStatus } from "./statuses";

export interface AnalysisJob {
  id: string;
  agentId: string;
  userWallet: string;
  filename: string;
  uploadReference?: string;
  inputMetadata: Record<string, unknown>;
  status: JobStatus;
  paymentStatus: PaymentStatus;
  plannerStatus: ModuleStatus;
  analyzerStatus: ModuleStatus;
  criticStatus: ModuleStatus;
  reporterStatus: ModuleStatus;
  keeperhubRunId?: string;
  resultId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobCreateInput {
  agentId: string;
  userWallet: string;
  filename: string;
  uploadReference?: string;
  inputMetadata?: Record<string, unknown>;
}
