export type KeeperHubRunState =
  | "queued"
  | "running"
  | "retrying"
  | "completed"
  | "failed";

export interface KeeperHubRun {
  id: string;
  jobId: string;
  state: KeeperHubRunState;
  logs: string[];
}

export interface KeeperHubClient {
  createRun(jobId: string): Promise<KeeperHubRun>;
  getRun(runId: string): Promise<KeeperHubRun>;
  retryRun(runId: string): Promise<KeeperHubRun>;
}
