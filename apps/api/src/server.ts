import cors from "@fastify/cors";
import Fastify from "fastify";
import { z } from "zod";
import type { AxlClient } from "@kingsvarmo/axl-client";
import type { KeeperHubClient } from "@kingsvarmo/keeperhub";
import { supportedInputFormats, type AgentListing, type ClassroomAssignment, type JobCreateInput } from "@kingsvarmo/shared";
import { getZeroGIntegrationStatus } from "@kingsvarmo/zero-g";
import { createBackendAxlClient } from "./integrations/axl";
import { createBackendKeeperHubClient } from "./integrations/keeperhub";
import { createInMemoryJobStore, type JobStore } from "./state/store";
import { startAxlJobWorkflow } from "./workflows/axl-job-workflow";

const createJobSchema = z.object({
  agentId: z.string().min(1),
  userWallet: z.string().min(1),
  filename: z.string().min(1),
  uploadReference: z.string().optional(),
  inputMetadata: z.record(z.unknown()).optional()
});

const createAgentSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  creatorName: z.string().min(1),
  creatorWallet: z.string().min(1).default("local-demo-creator"),
  description: z.string().min(1),
  longDescription: z.string().optional(),
  domain: z.string().min(1),
  supportedFormats: z.array(z.enum(supportedInputFormats)).min(1),
  priceIn0G: z.string().min(1),
  runtimeEstimateSeconds: z.number().int().positive().default(90),
  previewOutput: z.string().min(1),
  expectedOutput: z.string().optional(),
  promptTemplate: z.string().optional(),
  privacyNotes: z.string().optional(),
  intelligenceReference: z.string().optional(),
  storageReference: z.string().optional()
});

const createAssignmentSchema = z.object({
  title: z.string().min(1),
  className: z.string().min(1),
  agentId: z.string().min(1),
  instructions: z.string().optional().default(""),
  dueDate: z.string().optional(),
  teacherWallet: z.string().optional().default("")
});

const createSubmissionSchema = z.object({
  studentName: z.string().min(1),
  studentWallet: z.string().optional(),
  filename: z.string().min(1),
  csvText: z.string().optional().default("")
});

export interface BuildApiServerOptions {
  axlClient?: AxlClient;
  keeperHubClient?: KeeperHubClient;
  store?: JobStore;
}

export async function buildApiServer(options: BuildApiServerOptions = {}) {
  const server = Fastify({
    logger: true
  });
  const axlClient = options.axlClient ?? createBackendAxlClient();
  const keeperHubClient = options.keeperHubClient ?? createBackendKeeperHubClient();
  const store = options.store ?? createInMemoryJobStore();

  const allowedOrigins = parseAllowedOrigins();

  await server.register(cors, {
    origin: allowedOrigins.length > 0 ? allowedOrigins : true
  });

  server.get("/health", async () => ({
    ok: true,
    service: "kingsvarmo-api",
    axl: await axlClient.health(),
    keeperHub: await keeperHubClient.health(),
    zeroG: getZeroGIntegrationStatus()
  }));

  server.get("/api/0g/status", async () => ({
    zeroG: getZeroGIntegrationStatus()
  }));

  server.get("/api/agents", async () => ({
    agents: store.listAgents()
  }));

  server.get("/api/agents/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const agent = store.getAgent(id);

    if (!agent) {
      return reply.code(404).send({
        error: "agent_not_found"
      });
    }

    return {
      agent
    };
  });

  server.post("/api/agents", async (request, reply) => {
    const parsed = createAgentSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_agent_input",
        issues: parsed.error.issues
      });
    }

    const slug = parsed.data.slug ?? slugify(parsed.data.name);
    const agentInput: Omit<AgentListing, "id" | "createdAt" | "status"> = {
      name: parsed.data.name,
      slug,
      creatorName: parsed.data.creatorName,
      creatorWallet: parsed.data.creatorWallet,
      description: parsed.data.description,
      longDescription: parsed.data.longDescription ?? parsed.data.description,
      domain: normalizeDomain(parsed.data.domain),
      supportedFormats: parsed.data.supportedFormats,
      priceIn0G: parsed.data.priceIn0G,
      runtimeEstimateSeconds: parsed.data.runtimeEstimateSeconds,
      previewOutput: parsed.data.previewOutput,
      expectedOutput:
        parsed.data.expectedOutput ??
        "A deterministic local report with confidence, findings, and provenance.",
      ...(parsed.data.promptTemplate ? { promptTemplate: parsed.data.promptTemplate } : {}),
      privacyNotes:
        parsed.data.privacyNotes ??
        "Local demo jobs keep inputs scoped to the API process memory.",
      intelligenceReference:
        parsed.data.intelligenceReference ?? `local://intelligence/${slug}`,
      storageReference:
        parsed.data.storageReference ?? `local://metadata/${slug}`
    };
    const agent = store.createAgent(agentInput);

    return reply.code(201).send({
      agent
    });
  });

  server.post("/api/jobs", async (request, reply) => {
    const parsed = createJobSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_job_input",
        issues: parsed.error.issues
      });
    }

    const jobInput: JobCreateInput = {
      agentId: parsed.data.agentId,
      userWallet: parsed.data.userWallet,
      filename: parsed.data.filename,
      ...(parsed.data.uploadReference
        ? { uploadReference: parsed.data.uploadReference }
        : {}),
      ...(parsed.data.inputMetadata ? { inputMetadata: parsed.data.inputMetadata } : {})
    };
    const job = store.createJob(jobInput);

    return reply.code(201).send({
      job
    });
  });

  server.post("/api/jobs/:id/start", async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = store.getJob(id);

    if (!job) {
      return reply.code(404).send({
        error: "job_not_found"
      });
    }

    try {
      await startAxlJobWorkflow({
        job,
        axlClient,
        keeperHubClient,
        store
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Workflow start failed";
      const isKeeperHubError = message.toLowerCase().includes("keeperhub");

      store.updateJob(id, {
        status: "failed",
        plannerStatus: "failed"
      });

      return reply.code(isKeeperHubError ? 502 : 500).send({
        error: isKeeperHubError ? "keeperhub_workflow_unavailable" : "workflow_start_failed",
        message,
        hint: isKeeperHubError
          ? "Check that KEEPERHUB_API_KEY, KEEPERHUB_WEBHOOK_KEY, and KEEPERHUB_WORKFLOW_ID are current, and that the KeeperHub workflow is enabled. Run pnpm keeperhub:test before retrying from the UI."
          : "Check the API logs, AXL node configuration, and worker processes before retrying."
      });
    }

    return {
      job: store.getJob(id)
    };
  });

  server.get("/api/jobs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = store.getJob(id);

    if (!job) {
      return reply.code(404).send({
        error: "job_not_found"
      });
    }

    return {
      job
    };
  });

  server.get("/api/jobs/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!store.getJob(id)) {
      return reply.code(404).send({
        error: "job_not_found"
      });
    }

    return {
      messages: store.listMessages(id)
    };
  });

  server.get("/api/jobs/:id/result", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = store.getResultByJobId(id);

    if (!result) {
      return reply.code(404).send({
        error: "result_not_found"
      });
    }

    return {
      result
    };
  });

  server.get("/api/results/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = store.getResult(id);

    if (!result) {
      return reply.code(404).send({
        error: "result_not_found"
      });
    }

    return {
      result
    };
  });

  server.get("/api/results/:id/download", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = store.getResult(id);

    if (!result) {
      return reply.code(404).send({
        error: "result_not_found"
      });
    }

    const report = [
      `KinSvarmo Result Report`,
      ``,
      `Result ID: ${result.id}`,
      `Job ID: ${result.jobId}`,
      `Confidence: ${Math.round(result.confidence * 100)}%`,
      `Provenance: ${result.provenanceId}`,
      `Completed: ${result.completedAt}`,
      ``,
      `Summary`,
      result.summary,
      ``,
      `Key Findings`,
      ...result.keyFindings.map((finding) => `- ${finding}`),
      ``,
      `Structured JSON`,
      JSON.stringify(result.structuredJson, null, 2)
    ].join("\n");

    return reply
      .header("Content-Type", "text/plain; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${result.id}.txt"`)
      .send(report);
  });

  server.get("/api/jobs/:id/keeperhub", async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = store.getJob(id);

    if (!job) {
      return reply.code(404).send({
        error: "job_not_found"
      });
    }

    if (!job.keeperhubRunId) {
      return reply.code(404).send({
        error: "keeperhub_run_not_found"
      });
    }

    let run;
    let logs;

    try {
      run = await keeperHubClient.getRun(job.keeperhubRunId);
      logs = await keeperHubClient.getRunLogs(job.keeperhubRunId);
    } catch (caught) {
      return reply.code(502).send({
        error: "keeperhub_status_unavailable",
        message: caught instanceof Error ? caught.message : "Unable to fetch KeeperHub status",
        hint: "Run pnpm keeperhub:test to verify the configured KeeperHub workflow and keys."
      });
    }

    return {
      run: {
        ...run,
        logs
      }
    };
  });

  server.post("/api/jobs/:id/keeperhub/retry", async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = store.getJob(id);

    if (!job) {
      return reply.code(404).send({
        error: "job_not_found"
      });
    }

    if (!job.keeperhubRunId) {
      return reply.code(404).send({
        error: "keeperhub_run_not_found"
      });
    }

    let run;

    try {
      run = await keeperHubClient.retryRun(job.keeperhubRunId);
    } catch (caught) {
      return reply.code(502).send({
        error: "keeperhub_retry_failed",
        message: caught instanceof Error ? caught.message : "Unable to retry KeeperHub run",
        hint: "Check the KeeperHub execution in the KeeperHub app, then run pnpm keeperhub:test."
      });
    }

    return {
      run
    };
  });

  server.get("/api/workplace/assignments", async () => ({
    assignments: store.listAssignments()
  }));

  server.post("/api/workplace/assignments", async (request, reply) => {
    const parsed = createAssignmentSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_assignment_input",
        issues: parsed.error.issues
      });
    }

    if (!store.getAgent(parsed.data.agentId)) {
      return reply.code(404).send({
        error: "agent_not_found"
      });
    }

    const assignmentInput: Omit<ClassroomAssignment, "id" | "submissionIds" | "createdAt"> = {
      teacherWallet: parsed.data.teacherWallet,
      title: parsed.data.title,
      className: parsed.data.className,
      agentId: parsed.data.agentId,
      instructions: parsed.data.instructions,
      ...(parsed.data.dueDate ? { dueDate: parsed.data.dueDate } : {})
    };
    const assignment = store.createAssignment(assignmentInput);

    return reply.code(201).send({
      assignment
    });
  });

  server.get("/api/workplace/assignments/:assignmentId", async (request, reply) => {
    const { assignmentId } = request.params as { assignmentId: string };
    const assignment = store.getAssignment(assignmentId);

    if (!assignment) {
      return reply.code(404).send({
        error: "assignment_not_found"
      });
    }

    return {
      assignment
    };
  });

  server.get("/api/workplace/assignments/:assignmentId/submissions", async (request, reply) => {
    const { assignmentId } = request.params as { assignmentId: string };

    if (!store.getAssignment(assignmentId)) {
      return reply.code(404).send({
        error: "assignment_not_found"
      });
    }

    return {
      submissions: store.listSubmissions(assignmentId)
    };
  });

  server.post("/api/workplace/assignments/:assignmentId/submissions", async (request, reply) => {
    const { assignmentId } = request.params as { assignmentId: string };
    const assignment = store.getAssignment(assignmentId);

    if (!assignment) {
      return reply.code(404).send({
        error: "assignment_not_found"
      });
    }

    const parsed = createSubmissionSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_submission_input",
        issues: parsed.error.issues
      });
    }

    const job = store.createJob({
      agentId: assignment.agentId,
      userWallet: parsed.data.studentWallet ?? "",
      filename: parsed.data.filename,
      inputMetadata: {
        csvText: parsed.data.csvText,
        participantName: parsed.data.studentName,
        assignmentId
      }
    });
    const submission = store.createSubmission({
      assignmentId,
      studentName: parsed.data.studentName,
      ...(parsed.data.studentWallet ? { studentWallet: parsed.data.studentWallet } : {}),
      filename: parsed.data.filename,
      jobId: job.id,
      status: "submitted"
    });

    store.updateAssignment(assignmentId, {
      submissionIds: [...assignment.submissionIds, submission.id]
    });

    return reply.code(201).send({
      submission,
      jobId: job.id
    });
  });

  return server;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeDomain(value: string): string {
  return slugify(value) || "research-ops";
}

function parseAllowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS ?? process.env.WEB_ORIGIN ?? "";
  return raw
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}
