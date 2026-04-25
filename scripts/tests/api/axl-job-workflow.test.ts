import assert from "node:assert/strict";
import test from "node:test";
import type {
  AxlClient,
  AxlClientHealth,
  AxlInboundMessage,
  AxlParticipant,
  AxlSendOptions,
  AxlSendReceipt,
  AxlTopology
} from "@kingsvarmo/axl-client";
import type { AxlMessage } from "@kingsvarmo/shared";
import { buildApiServer } from "../../../apps/api/src/server";

test("API job workflow is driven by AXL messages", async () => {
  const axlClient = createScriptedAxlClient([
    createAxlMessage("plan.generated", "planner", "api", {
      audit: true,
      route: "phytochemistry-demo"
    }),
    createAxlMessage("analysis.completed", "analyzer", "api", {
      audit: true,
      observations: ["Stable screening cluster"]
    }),
    createAxlMessage("critic.reviewed", "critic", "api", {
      audit: true,
      confidence: 0.82
    }),
    createAxlMessage("report.generated", "reporter", "api", {
      summary: "Demo sample shows modest alkaloid-like screening signals.",
      keyFindings: ["Candidate alkaloid-like families detected"],
      confidence: 0.82,
      provenanceId: "prov_job_api_workflow"
    })
  ]);
  const server = await buildApiServer({
    axlClient
  });

  try {
    const createResponse = await server.inject({
      method: "POST",
      url: "/api/jobs",
      payload: {
        agentId: "agent_alkaloid_predictor_v2",
        userWallet: "0x0000000000000000000000000000000000000001",
        filename: "alkaloid-sample.csv",
        inputMetadata: {
          sampleName: "Golden sample"
        }
      }
    });
    assert.equal(createResponse.statusCode, 201);

    const createdBody = createResponse.json<{
      job: {
        id: string;
      };
    }>();
    const jobId = createdBody.job.id;

    axlClient.rewriteQueuedJobId(jobId);

    const startResponse = await server.inject({
      method: "POST",
      url: `/api/jobs/${jobId}/start`
    });
    assert.equal(startResponse.statusCode, 200);
    assert.equal(axlClient.sentMessages[0]?.type, "job.created");
    assert.equal(axlClient.sentMessages[0]?.receiver, "planner");

    const completedJob = await waitForCompletedJob(server, jobId);
    assert.equal(completedJob.status, "completed");
    assert.equal(completedJob.plannerStatus, "completed");
    assert.equal(completedJob.analyzerStatus, "completed");
    assert.equal(completedJob.criticStatus, "completed");
    assert.equal(completedJob.reporterStatus, "completed");
    assert.equal(completedJob.resultId, `result_${jobId}`);

    const messagesResponse = await server.inject({
      method: "GET",
      url: `/api/jobs/${jobId}/messages`
    });
    assert.equal(messagesResponse.statusCode, 200);
    assert.deepEqual(
      messagesResponse.json<{ messages: AxlMessage[] }>().messages.map((message) => message.type),
      [
        "job.created",
        "plan.generated",
        "analysis.completed",
        "critic.reviewed",
        "report.generated"
      ]
    );

    const resultResponse = await server.inject({
      method: "GET",
      url: `/api/jobs/${jobId}/result`
    });
    assert.equal(resultResponse.statusCode, 200);
    assert.equal(
      resultResponse.json<{ result: { provenanceId: string } }>().result.provenanceId,
      "prov_job_api_workflow"
    );
  } finally {
    await server.close();
  }
});

interface ScriptedAxlClient extends AxlClient {
  sentMessages: AxlMessage[];
  rewriteQueuedJobId(jobId: string): void;
}

function createScriptedAxlClient(initialQueue: AxlMessage[]): ScriptedAxlClient {
  let receiveQueue = [...initialQueue];
  const sentMessages: AxlMessage[] = [];

  return {
    sentMessages,
    rewriteQueuedJobId(jobId) {
      receiveQueue = receiveQueue.map((message) => ({
        ...message,
        jobId,
        id: `${jobId}_${message.type}`
      }));
    },
    async send(message: AxlMessage, _options?: AxlSendOptions): Promise<AxlSendReceipt> {
      sentMessages.push(message);

      return {
        messageId: message.id,
        via: message.sender,
        nodeUrl: "scripted://axl",
        destinationPeerId: `scripted://${message.receiver}`,
        sentBytes: JSON.stringify(message).length
      };
    },
    async receive(participant: AxlParticipant): Promise<AxlInboundMessage | null> {
      if (participant !== "api") {
        return null;
      }

      const message = receiveQueue.shift();

      if (!message) {
        return null;
      }

      return {
        message,
        fromPeerId: `scripted://${message.sender}`,
        receivedVia: participant
      };
    },
    async listMessages(jobId: string): Promise<AxlMessage[]> {
      return sentMessages.filter((message) => message.jobId === jobId);
    },
    async topology(): Promise<AxlTopology> {
      return {
        peers: [],
        tree: [],
        raw: {
          mode: "scripted"
        }
      };
    },
    async health(): Promise<AxlClientHealth> {
      return {
        configured: ["api", "planner", "analyzer", "critic", "reporter"],
        nodes: {
          api: true,
          planner: true,
          analyzer: true,
          critic: true,
          reporter: true
        },
        healthy: true
      };
    }
  };
}

function createAxlMessage(
  type: AxlMessage["type"],
  sender: AxlMessage["sender"],
  receiver: AxlMessage["receiver"],
  payload: Record<string, unknown>
): AxlMessage {
  return {
    id: `placeholder_${type}`,
    jobId: "placeholder_job",
    sender,
    receiver,
    type,
    payload,
    timestamp: new Date().toISOString()
  };
}

async function waitForCompletedJob(
  server: Awaited<ReturnType<typeof buildApiServer>>,
  jobId: string
) {
  const deadline = Date.now() + 2_000;

  while (Date.now() < deadline) {
    const response = await server.inject({
      method: "GET",
      url: `/api/jobs/${jobId}`
    });
    const body = response.json<{
      job: {
        status: string;
        plannerStatus: string;
        analyzerStatus: string;
        criticStatus: string;
        reporterStatus: string;
        resultId?: string;
      };
    }>();

    if (body.job.status === "completed") {
      return body.job;
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error("Timed out waiting for completed job");
}
