import {
  createAxlNodeMapFromEnv,
  createHttpAxlClient,
  type AxlParticipant
} from "@kingsvarmo/axl-client";
import {
  createGenericDemoPlan,
  createGenericDemoReport,
  runGenericDemoAnalysis,
  reviewGenericDemoAnalysis
} from "@kingsvarmo/agents";
import { runInference } from "@kingsvarmo/zero-g";
import type {
  GenericDemoAnalysisOutput,
  GenericDemoCriticOutput,
  GenericDemoPlanOutput
} from "@kingsvarmo/agents";
import type { AgentListing, AnalysisJob } from "@kingsvarmo/shared";
import type { AxlMessage } from "@kingsvarmo/shared";
import { seededAgents } from "@kingsvarmo/shared";
import {
  createLocalAxlNodeMap,
  isAxlParticipant,
  parsePortOffset
} from "./local-network";
import { isRealTransport } from "./real-network";

type WorkerParticipant = Exclude<AxlParticipant, "api">;

const participant = parseWorkerParticipant();
const portOffset = parsePortOffset();
const client = createHttpAxlClient({
  nodes: isRealTransport()
    ? createAxlNodeMapFromEnv(process.env)
    : createLocalAxlNodeMap(portOffset),
  requestTimeoutMs: parseRequestTimeout()
});

let stopped = false;

process.on("SIGTERM", () => {
  stopped = true;
});
process.on("SIGINT", () => {
  stopped = true;
});

void main();

async function main(): Promise<void> {
  console.log(
    JSON.stringify({
      event: "agent-worker.started",
      participant
    })
  );

  while (!stopped) {
    const inbound = await client.receive(participant);

    if (!inbound) {
      await sleep(250);
      continue;
    }

    console.log(
      JSON.stringify({
        event: "agent-worker.received",
        participant,
        messageId: inbound.message.id,
        messageType: inbound.message.type
      })
    );

    const outgoing = await handleMessage(participant, inbound.message);

    if (!outgoing) {
      continue;
    }

    await client.send(outgoing, {
      via: participant
    });

    if (outgoing.receiver !== "api" && shouldAuditToApi()) {
      await client.send(
        {
          ...outgoing,
          id: `${outgoing.id}_audit`,
          receiver: "api",
          payload: {
            ...outgoing.payload,
            audit: true,
            originalReceiver: outgoing.receiver
          }
        },
        {
          via: participant
        }
      );
    }

    console.log(
      JSON.stringify({
        event: "agent-worker.sent",
        participant,
        messageId: outgoing.id,
        messageType: outgoing.type,
        receiver: outgoing.receiver
      })
    );
  }
}

function parseWorkerParticipant(): WorkerParticipant {
  const candidate = process.argv.find(
    (arg, index) => index > 1 && !arg.startsWith("--")
  );

  if (
    !candidate ||
    !isAxlParticipant(candidate) ||
    candidate === "api"
  ) {
    throw new Error("Expected worker participant: planner, analyzer, critic, reporter");
  }

  return candidate;
}

async function handleMessage(
  worker: WorkerParticipant,
  message: AxlMessage
): Promise<AxlMessage | null> {
  if (worker === "planner" && message.type === "job.created") {
    const job = extractJob(message);
    const plan = createGenericDemoPlan({
      job,
      agent: extractAgent(message, job.agentId)
    });

    return createMessage(message, {
      sender: "planner",
      receiver: "analyzer",
      type: "plan.generated",
      payload: {
        ...plan,
        sourceMessageId: message.id
      }
    });
  }

  if (worker === "analyzer" && message.type === "plan.generated") {
    const analysis = runGenericDemoAnalysis(extractPlan(message));
    const zeroGCompute = await runZeroGComputeIfConfigured(extractPlan(message));

    return createMessage(message, {
      sender: "analyzer",
      receiver: "critic",
      type: "analysis.completed",
      payload: {
        ...analysis,
        zeroGCompute,
        sourceMessageId: message.id
      }
    });
  }

  if (worker === "critic" && message.type === "analysis.completed") {
    const analysis = extractAnalysis(message);
    const review = reviewGenericDemoAnalysis(analysis);

    return createMessage(message, {
      sender: "critic",
      receiver: "reporter",
      type: "critic.reviewed",
      payload: {
        ...review,
        zeroGCompute: extractZeroGCompute(message),
        sourceMessageId: message.id
      }
    });
  }

  if (worker === "reporter" && message.type === "critic.reviewed") {
    const report = createGenericDemoReport(extractReview(message));
    const zeroGCompute = extractZeroGCompute(message);
    const isRealZeroGCompute = isRealZeroGComputeResult(zeroGCompute);

    return createMessage(message, {
      sender: "reporter",
      receiver: "api",
      type: "report.generated",
      payload: {
        ...report,
        summary: isRealZeroGCompute && typeof zeroGCompute.summary === "string"
          ? zeroGCompute.summary
          : report.summary,
        keyFindings: isRealZeroGCompute
          ? [
              "0G Compute inference completed through the configured provider",
              ...report.keyFindings
            ]
          : report.keyFindings,
        structuredJson: {
          ...report.structuredJson,
          zeroGCompute
        },
        provenanceId: isRealZeroGCompute && typeof zeroGCompute.chatId === "string"
          ? `0g_compute_${zeroGCompute.chatId}`
          : report.provenanceId,
        sourceMessageId: message.id
      }
    });
  }

  return null;
}

async function runZeroGComputeIfConfigured(plan: GenericDemoPlanOutput): Promise<Record<string, unknown>> {
  const providerAddress =
    process.env.ZERO_G_COMPUTE_PROVIDER_ADDRESS ?? process.env.ZERO_G_INFERENCE_PROVIDER;
  const model = process.env.ZERO_G_COMPUTE_MODEL;
  const serviceUrl = process.env.ZERO_G_COMPUTE_SERVICE_URL;
  const hasSecret = Boolean(process.env.ZERO_G_COMPUTE_API_SECRET);

  if (!providerAddress || !model || !serviceUrl || !hasSecret) {
    return {
      mode: "simulated",
      reason: "0G Compute env is incomplete",
      providerAddress: providerAddress ?? null,
      model: model ?? null
    };
  }

  try {
    const result = await runInference({
      providerAddress,
      systemPrompt: buildComputeSystemPrompt(plan),
      userPrompt: [
        `Agent: ${plan.agentName}`,
        `Domain: ${plan.domain}`,
        `Accepted format: ${plan.acceptedFormat}`,
        ...(plan.agentPrompt ? ["", "Agent instructions from iNFT metadata:", plan.agentPrompt] : []),
        "",
        "Dataset:",
        plan.datasetText.slice(0, 6000)
      ].join("\n"),
      maxTokens: 256
    });

    return {
      mode: "real",
      providerAddress,
      model,
      serviceUrl,
      chatId: result.chatId,
      verified: result.verified,
      summary: result.text,
      raw: result.raw
    };
  } catch (caught) {
    return {
      mode: "failed",
      providerAddress,
      model,
      serviceUrl,
      error: caught instanceof Error ? caught.message : "0G Compute inference failed"
    };
  }
}

function buildComputeSystemPrompt(plan: GenericDemoPlanOutput): string {
  const fallback =
    "You are a concise scientific analysis agent. Follow the agent instructions, return a cautious summary of the dataset, and avoid unsupported claims.";

  return plan.agentPrompt?.trim()
    ? `${fallback}\n\nAgent-specific instructions:\n${plan.agentPrompt.trim()}`
    : fallback;
}

function createMessage(
  source: AxlMessage,
  next: Pick<AxlMessage, "sender" | "receiver" | "type" | "payload">
): AxlMessage {
  return {
    id: `${source.jobId}_${next.type}_${Date.now()}`,
    jobId: source.jobId,
    sender: next.sender,
    receiver: next.receiver,
    type: next.type,
    payload: next.payload,
    timestamp: new Date().toISOString()
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRequestTimeout(): number {
  const parsed = Number(process.env.AXL_REQUEST_TIMEOUT_MS ?? "2000");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2_000;
}

function shouldAuditToApi(): boolean {
  return process.env.AXL_AUDIT_TO_API !== "0";
}

function extractJob(message: AxlMessage): AnalysisJob {
  const job = message.payload.job;

  if (isAnalysisJob(job)) {
    return job;
  }

  return {
    id: message.jobId,
    agentId:
      typeof message.payload.agentId === "string"
        ? message.payload.agentId
        : "agent_alkaloid_predictor_v2",
    userWallet:
      typeof message.payload.userWallet === "string"
        ? message.payload.userWallet
        : "0x0000000000000000000000000000000000000001",
    filename:
      typeof message.payload.filename === "string"
        ? message.payload.filename
        : "alkaloid-sample.csv",
    inputMetadata: {},
    status: "planning",
    paymentStatus: "authorized",
    plannerStatus: "running",
    analyzerStatus: "pending",
    criticStatus: "pending",
    reporterStatus: "pending",
    createdAt: message.timestamp,
    updatedAt: message.timestamp
  };
}

function extractPlan(message: AxlMessage): GenericDemoPlanOutput {
  return message.payload as unknown as GenericDemoPlanOutput;
}

function extractAnalysis(message: AxlMessage): GenericDemoAnalysisOutput {
  return message.payload as unknown as GenericDemoAnalysisOutput;
}

function extractReview(message: AxlMessage): GenericDemoCriticOutput & { zeroGCompute?: unknown } {
  return message.payload as unknown as GenericDemoCriticOutput & { zeroGCompute?: unknown };
}

function extractZeroGCompute(message: AxlMessage): Record<string, unknown> {
  const review = extractReview(message);
  return isRecord(review.zeroGCompute) ? review.zeroGCompute : { mode: "simulated" };
}

function isRealZeroGComputeResult(value: Record<string, unknown>): boolean {
  return value.mode === "real";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractAgent(message: AxlMessage, agentId: string): AgentListing | undefined {
  const agent = message.payload.agent;

  if (typeof agent === "object" && agent !== null && "id" in agent) {
    return agent as AgentListing;
  }

  return seededAgents.find((candidate) => candidate.id === agentId);
}

function isAnalysisJob(value: unknown): value is AnalysisJob {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "agentId" in value &&
    "filename" in value
  );
}
