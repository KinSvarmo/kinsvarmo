import cors from "@fastify/cors";
import Fastify from "fastify";
import { z } from "zod";
import type { AxlClient } from "@kingsvarmo/axl-client";
import type { KeeperHubClient } from "@kingsvarmo/keeperhub";
import { seededAgents, type JobCreateInput } from "@kingsvarmo/shared";
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

  await server.register(cors, {
    origin: true
  });

  server.get("/health", async () => ({
    ok: true,
    service: "kingsvarmo-api",
    axl: await axlClient.health(),
    keeperHub: await keeperHubClient.health()
  }));

  server.get("/api/agents", async () => ({
    agents: seededAgents
  }));

  server.get("/api/agents/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const agent = seededAgents.find(
      (candidate) => candidate.id === id || candidate.slug === id
    );

    if (!agent) {
      return reply.code(404).send({
        error: "agent_not_found"
      });
    }

    return {
      agent
    };
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

    await startAxlJobWorkflow({
      job,
      axlClient,
      keeperHubClient,
      store
    });

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

    const run = await keeperHubClient.getRun(job.keeperhubRunId);
    const logs = await keeperHubClient.getRunLogs(job.keeperhubRunId);

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

    const run = await keeperHubClient.retryRun(job.keeperhubRunId);

    return {
      run
    };
  });

  return server;
}
