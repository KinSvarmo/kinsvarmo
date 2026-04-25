import {
  createAxlNodeMapFromEnv,
  createHttpAxlClient,
  type AxlParticipant
} from "@kingsvarmo/axl-client";
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
    return createMessage(message, {
      sender: "planner",
      receiver: "analyzer",
      type: "plan.generated",
      payload: {
        route: "phytochemistry-demo",
        steps: ["validate input", "run deterministic screen", "review", "report"],
        sourceMessageId: message.id
      }
    });
  }

  if (worker === "analyzer" && message.type === "plan.generated") {
    return createMessage(message, {
      sender: "analyzer",
      receiver: "critic",
      type: "analysis.completed",
      payload: {
        observations: [
          "Stable alkaloid-like screening cluster",
          "No severe missing-value warning in demo metadata"
        ],
        metrics: {
          candidateSignals: 4,
          normalizedConfidence: 0.82
        },
        sourceMessageId: message.id
      }
    });
  }

  if (worker === "critic" && message.type === "analysis.completed") {
    return createMessage(message, {
      sender: "critic",
      receiver: "reporter",
      type: "critic.reviewed",
      payload: {
        confidence: 0.82,
        warnings: ["Demo result is deterministic and not a clinical claim"],
        sourceMessageId: message.id
      }
    });
  }

  if (worker === "reporter" && message.type === "critic.reviewed") {
    return createMessage(message, {
      sender: "reporter",
      receiver: "api",
      type: "report.generated",
      payload: {
        summary: "Demo sample shows modest alkaloid-like screening signals.",
        keyFindings: [
          "Candidate alkaloid-like families detected",
          "Confidence is suitable for demo workflow validation"
        ],
        provenanceId: `prov_${message.jobId}`,
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
