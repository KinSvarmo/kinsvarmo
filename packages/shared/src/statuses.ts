export const agentStatuses = ["draft", "published", "paused"] as const;
export type AgentStatus = (typeof agentStatuses)[number];

export const jobStatuses = [
  "created",
  "authorized",
  "planning",
  "analyzing",
  "reviewing",
  "reporting",
  "completed",
  "failed"
] as const;
export type JobStatus = (typeof jobStatuses)[number];

export const moduleStatuses = ["pending", "running", "completed", "failed"] as const;
export type ModuleStatus = (typeof moduleStatuses)[number];

export const paymentStatuses = ["pending", "authorized", "settled", "failed"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const agentModuleNames = ["planner", "analyzer", "critic", "reporter"] as const;
export type AgentModuleName = (typeof agentModuleNames)[number];

export const axlMessageTypes = [
  "job.created",
  "plan.generated",
  "analysis.started",
  "analysis.completed",
  "critic.reviewed",
  "report.generated",
  "job.failed"
] as const;
export type AxlMessageType = (typeof axlMessageTypes)[number];

export const supportedInputFormats = ["csv", "json"] as const;
export type SupportedInputFormat = (typeof supportedInputFormats)[number];
