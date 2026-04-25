import type { AxlClient } from "@kingsvarmo/axl-client";
import type { AnalysisJob, AnalysisResult, AxlMessage } from "@kingsvarmo/shared";
import { seededAgents } from "@kingsvarmo/shared";
import {
  createInitialStartPatch,
  createJobPatchFromAxlMessage,
  type JobStore
} from "../state/store";

const activeWorkflows = new Set<string>();

export async function startAxlJobWorkflow(input: {
  job: AnalysisJob;
  axlClient: AxlClient;
  store: JobStore;
}): Promise<void> {
  const { job, axlClient, store } = input;

  if (activeWorkflows.has(job.id)) {
    return;
  }

  activeWorkflows.add(job.id);
  store.updateJob(job.id, createInitialStartPatch());

  const message = createJobCreatedMessage(job);
  store.appendMessage(message);
  await axlClient.send(message, {
    via: "api"
  });

  void consumeAxlMessagesForJob({
    jobId: job.id,
    axlClient,
    store
  }).finally(() => {
    activeWorkflows.delete(job.id);
  });
}

export async function consumeAxlMessagesForJob(input: {
  jobId: string;
  axlClient: AxlClient;
  store: JobStore;
  timeoutMs?: number;
}): Promise<void> {
  const { jobId, axlClient, store, timeoutMs = 30_000 } = input;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const inbound = await axlClient.receive("api");

    if (!inbound) {
      await sleep(250);
      continue;
    }

    const { message } = inbound;

    if (message.jobId !== jobId) {
      continue;
    }

    store.appendMessage(message);
    store.updateJob(jobId, createJobPatchFromAxlMessage(message));

    if (message.type === "report.generated") {
      const result = createResultFromReportMessage(message);
      store.createResult(result);
      store.updateJob(jobId, {
        resultId: result.id
      });
      return;
    }

    if (message.type === "job.failed") {
      return;
    }
  }

  store.updateJob(jobId, {
    status: "failed"
  });
}

export function createJobCreatedMessage(job: AnalysisJob): AxlMessage {
  const agent = seededAgents.find((candidate) => candidate.id === job.agentId);

  return {
    id: `msg_${job.id}_created`,
    jobId: job.id,
    sender: "api",
    receiver: "planner",
    type: "job.created",
    payload: {
      job,
      agent
    },
    timestamp: new Date().toISOString()
  };
}

export function createResultFromReportMessage(message: AxlMessage): AnalysisResult {
  return {
    id: `result_${message.jobId}`,
    jobId: message.jobId,
    summary:
      typeof message.payload.summary === "string"
        ? message.payload.summary
        : "Analysis report generated.",
    confidence: typeof message.payload.confidence === "number" ? message.payload.confidence : 0.82,
    keyFindings: Array.isArray(message.payload.keyFindings)
      ? message.payload.keyFindings.filter((finding): finding is string => typeof finding === "string")
      : [],
    structuredJson: message.payload,
    explanation:
      "This result was produced from AXL-delivered reporter output and stored by the API workflow consumer.",
    provenanceId:
      typeof message.payload.provenanceId === "string"
        ? message.payload.provenanceId
        : `prov_${message.jobId}`,
    downloadUrl: `/api/jobs/${message.jobId}/result`,
    completedAt: message.timestamp
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
