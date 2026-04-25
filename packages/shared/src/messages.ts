import type { AgentModuleName, AxlMessageType } from "./statuses";

export type MessageParticipant = AgentModuleName | "api";

export interface AxlMessage {
  id: string;
  jobId: string;
  sender: MessageParticipant;
  receiver: MessageParticipant;
  type: AxlMessageType;
  payload: Record<string, unknown>;
  timestamp: string;
}
