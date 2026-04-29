import type { AxlClient } from "@kingsvarmo/axl-client";
import type { KeeperHubClient } from "@kingsvarmo/keeperhub";
import type { AnalysisJob, AnalysisResult, AxlMessage } from "@kingsvarmo/shared";
import type { AgentListing } from "@kingsvarmo/shared";
import {
  createInitialStartPatch,
  createJobPatchFromAxlMessage,
  type JobStore
} from "../state/store";

const activeWorkflows = new Set<string>();

export async function startAxlJobWorkflow(input: {
  job: AnalysisJob;
  axlClient: AxlClient;
  keeperHubClient: KeeperHubClient;
  store: JobStore;
}): Promise<void> {
  const { job, axlClient, keeperHubClient, store } = input;

  if (activeWorkflows.has(job.id)) {
    return;
  }

  const keeperHubRun = await keeperHubClient.createRun({
    jobId: job.id,
    metadata: {
      agentId: job.agentId,
      filename: job.filename,
      uploadReference: job.uploadReference ?? null
    }
  });

  activeWorkflows.add(job.id);
  store.updateJob(job.id, createInitialStartPatch());
  store.updateJob(job.id, {
    keeperhubRunId: keeperHubRun.id
  });

  const message = createJobCreatedMessage(job);
  store.appendMessage(message);
  void axlClient.send(message, {
    via: "api"
  }).catch(() => undefined);

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
  const agent = job.inputMetadata.agentSnapshot as AgentListing | undefined;

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
