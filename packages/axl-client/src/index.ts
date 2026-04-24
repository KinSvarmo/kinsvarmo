import type { AxLMessage } from "@kingsvarmo/shared";

export interface AxlNodeConfig {
  plannerUrl: string;
  analyzerUrl: string;
  criticUrl: string;
  reporterUrl: string;
}

export interface AxlClient {
  send(message: AxLMessage): Promise<void>;
  listMessages(jobId: string): Promise<AxLMessage[]>;
  health(): Promise<Record<string, boolean>>;
}

export function createPlaceholderAxlClient(): AxlClient {
  const messages: AxLMessage[] = [];

  return {
    async send(message) {
      messages.push(message);
    },
    async listMessages(jobId) {
      return messages.filter((message) => message.jobId === jobId);
    },
    async health() {
      return {
        planner: true,
        analyzer: true,
        critic: true,
        reporter: true
      };
    }
  };
}
