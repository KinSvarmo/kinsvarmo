import type {
  AnalysisJob,
  AnalysisResult,
  AxlMessage,
  JobCreateInput,
  JobStatus,
  ModuleStatus,
  PaymentStatus
} from "@kingsvarmo/shared";

export interface JobStore {
  createJob(input: JobCreateInput): AnalysisJob;
  getJob(jobId: string): AnalysisJob | undefined;
  listMessages(jobId: string): AxlMessage[];
  appendMessage(message: AxlMessage): void;
  updateJob(jobId: string, patch: Partial<AnalysisJob>): AnalysisJob;
  createResult(result: AnalysisResult): AnalysisResult;
  getResult(resultId: string): AnalysisResult | undefined;
  getResultByJobId(jobId: string): AnalysisResult | undefined;
}

export function createInMemoryJobStore(): JobStore {
  const jobs = new Map<string, AnalysisJob>();
  const messages = new Map<string, AxlMessage[]>();
  const results = new Map<string, AnalysisResult>();

  return {
    createJob(input) {
      const now = new Date().toISOString();
      const job: AnalysisJob = {
        id: `job_${Date.now()}_${jobs.size + 1}`,
        agentId: input.agentId,
        userWallet: input.userWallet,
        filename: input.filename,
        ...(input.uploadReference ? { uploadReference: input.uploadReference } : {}),
        inputMetadata: input.inputMetadata ?? {},
        status: "created",
        paymentStatus: "authorized",
        plannerStatus: "pending",
        analyzerStatus: "pending",
        criticStatus: "pending",
        reporterStatus: "pending",
        createdAt: now,
        updatedAt: now
      };

      jobs.set(job.id, job);
      messages.set(job.id, []);
      return job;
    },
    getJob(jobId) {
      return jobs.get(jobId);
    },
    listMessages(jobId) {
      return messages.get(jobId) ?? [];
    },
    appendMessage(message) {
      const existing = messages.get(message.jobId) ?? [];

      if (existing.some((candidate) => candidate.id === message.id)) {
        return;
      }

      existing.push(message);
      messages.set(message.jobId, existing);
    },
    updateJob(jobId, patch) {
      const job = jobs.get(jobId);

      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      const updated: AnalysisJob = {
        ...job,
        ...patch,
        updatedAt: new Date().toISOString()
      };

      jobs.set(jobId, updated);
      return updated;
    },
    createResult(result) {
      results.set(result.id, result);
      return result;
    },
    getResult(resultId) {
      return results.get(resultId);
    },
    getResultByJobId(jobId) {
      return [...results.values()].find((result) => result.jobId === jobId);
    }
  };
}

export function createJobPatchFromAxlMessage(
  message: AxlMessage
): Partial<AnalysisJob> {
  if (message.type === "plan.generated") {
    return {
      status: "analyzing",
      plannerStatus: "completed",
      analyzerStatus: "running"
    };
  }

  if (message.type === "analysis.completed") {
    return {
      status: "reviewing",
      analyzerStatus: "completed",
      criticStatus: "running"
    };
  }

  if (message.type === "critic.reviewed") {
    return {
      status: "reporting",
      criticStatus: "completed",
      reporterStatus: "running"
    };
  }

  if (message.type === "report.generated") {
    return {
      status: "completed",
      reporterStatus: "completed"
    };
  }

  if (message.type === "job.failed") {
    return {
      status: "failed",
      plannerStatus: terminalFailureStatus(message, "planner"),
      analyzerStatus: terminalFailureStatus(message, "analyzer"),
      criticStatus: terminalFailureStatus(message, "critic"),
      reporterStatus: terminalFailureStatus(message, "reporter")
    };
  }

  return {};
}

function terminalFailureStatus(
  message: AxlMessage,
  module: "planner" | "analyzer" | "critic" | "reporter"
): ModuleStatus {
  return message.sender === module ? "failed" : "pending";
}

export function createInitialStartPatch(): Partial<AnalysisJob> {
  return {
    status: "planning" satisfies JobStatus,
    paymentStatus: "authorized" satisfies PaymentStatus,
    plannerStatus: "running" satisfies ModuleStatus
  };
}
