import type { AxlClient } from "@kingsvarmo/axl-client";
import type { AnalysisJob, AnalysisResult, AxlMessage } from "@kingsvarmo/shared";
import { seededAgents } from "@kingsvarmo/shared";
import {
  createDl50Plan,
  createDl50Report,
  reviewDl50Analysis,
  runDl50Analysis
} from "@kingsvarmo/agents";
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
  void axlClient.send(message, {
    via: "api"
  }).catch(() => undefined);

  const csvText = typeof job.inputMetadata.csvText === "string" ? job.inputMetadata.csvText : "";

  if (csvText.trim().length > 0) {
    try {
      const plan = createDl50Plan({ job, datasetText: csvText });
      const analysis = runDl50Analysis(plan);
      const review = reviewDl50Analysis(analysis);
      const report = createDl50Report(review);

      const planMessage = createAxlMessage(job.id, "planner", "analyzer", "plan.generated", {
        plan
      });
      const analysisMessage = createAxlMessage(job.id, "analyzer", "critic", "analysis.completed", {
        analysis
      });
      const criticMessage = createAxlMessage(job.id, "critic", "reporter", "critic.reviewed", {
        review
      });
      const reportMessage = createAxlMessage(job.id, "reporter", "api", "report.generated", {
        ...report,
        route: "phytochemistry-dl50"
      });

      for (const workflowMessage of [planMessage, analysisMessage, criticMessage, reportMessage]) {
        store.appendMessage(workflowMessage);
        store.updateJob(job.id, createJobPatchFromAxlMessage(workflowMessage));
      }

      const result = createResultFromReportMessage(reportMessage);
      store.createResult(result);
      store.updateJob(job.id, {
        resultId: result.id
      });
      activeWorkflows.delete(job.id);
      return;
    } catch (caught) {
      const errorMessage = createAxlMessage(job.id, "analyzer", "api", "job.failed", {
        error: caught instanceof Error ? caught.message : "LD50 analysis failed"
      });
      store.appendMessage(errorMessage);
      store.updateJob(job.id, createJobPatchFromAxlMessage(errorMessage));
      activeWorkflows.delete(job.id);
      return;
    }
  }

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

function createAxlMessage(
  jobId: string,
  sender: "planner" | "analyzer" | "critic" | "reporter",
  receiver: "planner" | "analyzer" | "critic" | "reporter" | "api",
  type: AxlMessage["type"],
  payload: Record<string, unknown>
): AxlMessage {
  return {
    id: `msg_${jobId}_${type}_${sender}`,
    jobId,
    sender,
    receiver,
    type,
    payload,
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
