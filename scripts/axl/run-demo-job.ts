import { createAxlNodeMapFromEnv, createHttpAxlClient } from "@kingsvarmo/axl-client";
import type { AxlMessage } from "@kingsvarmo/shared";
import { createLocalAxlNodeMap, parsePortOffset } from "./local-network";
import { isRealTransport } from "./real-network";

const portOffset = parsePortOffset();
const client = createHttpAxlClient({
  nodes: isRealTransport()
    ? createAxlNodeMapFromEnv(process.env)
    : createLocalAxlNodeMap(portOffset),
  requestTimeoutMs: parseRequestTimeout()
});

void main();

async function main(): Promise<void> {
  const jobId = `job_demo_${Date.now()}`;
  const initialMessage: AxlMessage = {
    id: `msg_${jobId}_created`,
    jobId,
    sender: "api",
    receiver: "planner",
    type: "job.created",
    payload: {
      agentId: "agent_alkaloid_predictor_v2",
      filename: "alkaloid-sample.csv",
      userWallet: "0x0000000000000000000000000000000000000001"
    },
    timestamp: new Date().toISOString()
  };

  await client.send(initialMessage, {
    via: "api"
  });

  console.log(
    JSON.stringify({
      event: "demo-job.sent",
      jobId,
      message: initialMessage
    })
  );

  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    const inbound = await client.receive("api");

    if (!inbound) {
      await sleep(250);
      continue;
    }

    console.log(
      JSON.stringify({
        event: "demo-job.received",
        fromPeerId: inbound.fromPeerId,
        message: inbound.message
      })
    );

    if (
      inbound.message.jobId === jobId &&
      inbound.message.type === "report.generated"
    ) {
      console.log(
        JSON.stringify({
          event: "demo-job.completed",
          jobId,
          result: inbound.message.payload
        })
      );
      process.exit(0);
    }
  }

  console.error(
    JSON.stringify({
      event: "demo-job.timeout",
      jobId
    })
  );
  process.exit(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRequestTimeout(): number {
  const parsed = Number(process.env.AXL_REQUEST_TIMEOUT_MS ?? "2000");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2_000;
}
