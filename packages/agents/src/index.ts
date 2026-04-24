import type { AnalysisJob } from "@kingsvarmo/shared";

export type AgentModuleName = "planner" | "analyzer" | "critic" | "reporter";

export interface AgentModule<Input, Output> {
  name: AgentModuleName;
  run(input: Input): Promise<Output>;
}

export interface PlanOutput {
  jobId: string;
  route: "phytochemistry-demo";
  steps: string[];
}

export interface AnalysisOutput {
  jobId: string;
  observations: string[];
  metrics: Record<string, number>;
}

export interface CriticOutput {
  jobId: string;
  confidence: number;
  warnings: string[];
}

export interface ReportOutput {
  jobId: string;
  summary: string;
  keyFindings: string[];
}

export type PlannerModule = AgentModule<AnalysisJob, PlanOutput>;
export type AnalyzerModule = AgentModule<PlanOutput, AnalysisOutput>;
export type CriticModule = AgentModule<AnalysisOutput, CriticOutput>;
export type ReporterModule = AgentModule<CriticOutput, ReportOutput>;
