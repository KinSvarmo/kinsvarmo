export interface AnalysisResult {
  id: string;
  jobId: string;
  summary: string;
  confidence: number;
  keyFindings: string[];
  structuredJson: Record<string, unknown>;
  explanation: string;
  provenanceId: string;
  downloadUrl?: string;
  completedAt: string;
}
