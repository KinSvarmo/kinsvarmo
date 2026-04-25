import {
  createAxlNodeMapFromEnv,
  createHttpAxlClient,
  type AxlParticipant
} from "@kingsvarmo/axl-client";
import {
  createDemoPlan,
  createDemoReport,
  runDemoAnalysis,
  reviewDemoAnalysis
} from "@kingsvarmo/agents";
import type {
  DemoAnalysisOutput,
  DemoCriticOutput,
  DemoPlanOutput
} from "@kingsvarmo/agents";
import type { AnalysisJob } from "@kingsvarmo/shared";
import type { AxlMessage } from "@kingsvarmo/shared";
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

    const outgoing = handleMessage(participant, inbound.message);

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

function handleMessage(
  worker: WorkerParticipant,
  message: AxlMessage
): AxlMessage | null {
  if (worker === "planner" && message.type === "job.created") {
    const plan = createDemoPlan({
      job: extractJob(message)
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
    const analysis = runDemoAnalysis(extractPlan(message));

    return createMessage(message, {
      sender: "analyzer",
      receiver: "critic",
      type: "analysis.completed",
      payload: {
        ...analysis,
        sourceMessageId: message.id
      }
    });
  }

  if (worker === "critic" && message.type === "analysis.completed") {
    const review = reviewDemoAnalysis(extractAnalysis(message));

    return createMessage(message, {
      sender: "critic",
      receiver: "reporter",
      type: "critic.reviewed",
      payload: {
        ...review,
        sourceMessageId: message.id
      }
    });
  }

  if (worker === "reporter" && message.type === "critic.reviewed") {
    const report = createDemoReport(extractReview(message));

    return createMessage(message, {
      sender: "reporter",
      receiver: "api",
      type: "report.generated",
      payload: {
        ...report,
        sourceMessageId: message.id
      }
    });
  }

  return null;
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

function extractPlan(message: AxlMessage): DemoPlanOutput {
  return message.payload as unknown as DemoPlanOutput;
}

function extractAnalysis(message: AxlMessage): DemoAnalysisOutput {
  return message.payload as unknown as DemoAnalysisOutput;
}

function extractReview(message: AxlMessage): DemoCriticOutput {
  return message.payload as unknown as DemoCriticOutput;
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
