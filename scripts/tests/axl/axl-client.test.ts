import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import test from "node:test";
import {
  createAxlNodeMapFromEnv,
  createHttpAxlClient,
  createInMemoryAxlClient
} from "@kingsvarmo/axl-client";
import type { AxlParticipant } from "@kingsvarmo/axl-client";
import type { AxlMessage } from "@kingsvarmo/shared";

const apiPeerId = "a".repeat(64);
const plannerPeerId = "b".repeat(64);
const analyzerPeerId = "c".repeat(64);

const demoMessage: AxlMessage = {
  id: "msg_axl_demo_001",
  jobId: "job_demo_001",
  sender: "api",
  receiver: "planner",
  type: "job.created",
  payload: {
    agentId: "agent_alkaloid_predictor_v2"
  },
  timestamp: "2026-04-24T00:00:00.000Z"
};

test("in-memory AXL client stores messages by job ID for local development", async () => {
  const client = createInMemoryAxlClient();
  const receipt = await client.send(demoMessage);

  assert.equal(receipt.messageId, demoMessage.id);
  assert.equal(receipt.via, "api");
  assert.equal(receipt.destinationPeerId, "memory://planner");
  assert.ok(receipt.sentBytes > 0);

  const messages = await client.listMessages("job_demo_001");
  assert.deepEqual(messages, [demoMessage]);
});

test("environment helper maps AXL URLs and peer IDs to participant nodes", () => {
  const nodes = createAxlNodeMapFromEnv({
    AXL_NODE_API_URL: "http://127.0.0.1:9002",
    AXL_NODE_API_PEER_ID: apiPeerId,
    AXL_NODE_PLANNER_URL: "http://127.0.0.1:9012",
    AXL_NODE_PLANNER_PEER_ID: plannerPeerId
  });

  assert.deepEqual(nodes, {
    api: {
      baseUrl: "http://127.0.0.1:9002",
      peerId: apiPeerId
    },
    planner: {
      baseUrl: "http://127.0.0.1:9012",
      peerId: plannerPeerId
    }
  });
});

test("HTTP AXL client sends JSON messages through the documented /send endpoint", async () => {
  const mockNode = await startMockAxlNode({
    peerId: apiPeerId
  });

  try {
    const client = createHttpAxlClient({
      nodes: {
        api: {
          baseUrl: mockNode.baseUrl,
          peerId: apiPeerId
        },
        planner: {
          baseUrl: "http://127.0.0.1:9012",
          peerId: plannerPeerId
        }
      },
      requestTimeoutMs: 1_000
    });

    const receipt = await client.send(demoMessage);

    assert.equal(receipt.via, "api");
    assert.equal(receipt.nodeUrl, mockNode.baseUrl);
    assert.equal(receipt.destinationPeerId, plannerPeerId);
    assert.equal(mockNode.requests.send.length, 1);
    assert.equal(mockNode.requests.send[0]?.destinationPeerId, plannerPeerId);
    assert.deepEqual(JSON.parse(mockNode.requests.send[0]?.body ?? ""), demoMessage);

    const messages = await client.listMessages("job_demo_001");
    assert.deepEqual(messages, [demoMessage]);
  } finally {
    await mockNode.close();
  }
});

test("HTTP AXL client receives JSON messages through the documented /recv endpoint", async () => {
  const inboundMessage: AxlMessage = {
    ...demoMessage,
    id: "msg_axl_demo_002",
    sender: "planner",
    receiver: "analyzer",
    type: "plan.generated"
  };

  const mockNode = await startMockAxlNode({
    peerId: plannerPeerId,
    receiveQueue: [
      {
        fromPeerId: plannerPeerId,
        message: inboundMessage
      }
    ]
  });

  try {
    const client = createHttpAxlClient({
      nodes: {
        analyzer: {
          baseUrl: mockNode.baseUrl,
          peerId: analyzerPeerId
        }
      },
      requestTimeoutMs: 1_000
    });

    const inbound = await client.receive("analyzer");

    assert.ok(inbound);
    assert.equal(inbound.fromPeerId, plannerPeerId);
    assert.equal(inbound.receivedVia, "analyzer");
    assert.deepEqual(inbound.message, inboundMessage);

    const messages = await client.listMessages("job_demo_001");
    assert.deepEqual(messages, [inboundMessage]);
  } finally {
    await mockNode.close();
  }
});

test("HTTP AXL client reads node topology and reports health", async () => {
  const mockNode = await startMockAxlNode({
    peerId: apiPeerId
  });

  try {
    const client = createHttpAxlClient({
      nodes: {
        api: {
          baseUrl: mockNode.baseUrl,
          peerId: apiPeerId
        }
      },
      requestTimeoutMs: 1_000
    });

    const topology = await client.topology("api");
    assert.equal(topology.ourPublicKey, apiPeerId);
    assert.equal(topology.peers.length, 1);

    const health = await client.health();
    assert.deepEqual(health, {
      configured: ["api"],
      nodes: {
        api: true
      },
      healthy: true
    });
  } finally {
    await mockNode.close();
  }
});

test("HTTP AXL client fails clearly when a receiver peer ID is missing", async () => {
  const mockNode = await startMockAxlNode({
    peerId: apiPeerId
  });

  try {
    const client = createHttpAxlClient({
      nodes: {
        api: {
          baseUrl: mockNode.baseUrl,
          peerId: apiPeerId
        },
        planner: {
          baseUrl: "http://127.0.0.1:9012"
        }
      },
      requestTimeoutMs: 1_000
    });

    await assert.rejects(
      () => client.send(demoMessage),
      /AXL peer ID is not configured for participant: planner/
    );
  } finally {
    await mockNode.close();
  }
});

test(
  "live AXL nodes expose topology when KINSVARMO_AXL_LIVE_TESTS=1",
  {
    skip:
      process.env.KINSVARMO_AXL_LIVE_TESTS === "1"
        ? false
        : "Set KINSVARMO_AXL_LIVE_TESTS=1 after starting real AXL nodes"
  },
  async () => {
    const nodes = createAxlNodeMapFromEnv(process.env);
    const configured = Object.keys(nodes) as AxlParticipant[];

    assert.ok(configured.length > 0, "at least one AXL node must be configured");

    const client = createHttpAxlClient({
      nodes,
      requestTimeoutMs: 2_000
    });

    for (const participant of configured) {
      const topology = await client.topology(participant);
      assert.ok(topology.ourPublicKey, `${participant} should expose our_public_key`);
    }
  }
);

test(
  "live AXL nodes can send planner -> api when KINSVARMO_AXL_LIVE_SEND_TESTS=1",
  {
    skip:
      process.env.KINSVARMO_AXL_LIVE_SEND_TESTS === "1"
        ? false
        : "Set KINSVARMO_AXL_LIVE_SEND_TESTS=1 after starting real AXL nodes"
  },
  async () => {
    const nodes = createAxlNodeMapFromEnv(process.env);
    assert.ok(nodes.api, "AXL_NODE_API_URL and AXL_NODE_API_PEER_ID are required");
    assert.ok(
      nodes.planner,
      "AXL_NODE_PLANNER_URL and AXL_NODE_PLANNER_PEER_ID are required"
    );

    const client = createHttpAxlClient({
      nodes,
      requestTimeoutMs: 2_000
    });

    const liveMessage: AxlMessage = {
      ...demoMessage,
      id: `msg_live_${Date.now()}`,
      jobId: `job_live_${Date.now()}`,
      sender: "planner",
      receiver: "api",
      type: "plan.generated",
      payload: {
        route: "live-axl-test"
      }
    };

    await client.send(liveMessage, {
      via: "planner"
    });

    const inbound = await pollForLiveMessage(client, "api", liveMessage.id);

    assert.ok(inbound, "api node should receive the live test message");
    assert.deepEqual(inbound.message, liveMessage);
  }
);

interface MockAxlNodeOptions {
  peerId: string;
  receiveQueue?: Array<{
    fromPeerId: string;
    message: AxlMessage;
  }>;
}

interface MockAxlNode {
  baseUrl: string;
  requests: {
    send: Array<{
      destinationPeerId: string | undefined;
      body: string;
    }>;
  };
  close(): Promise<void>;
}

async function startMockAxlNode(options: MockAxlNodeOptions): Promise<MockAxlNode> {
  const requests: MockAxlNode["requests"] = {
    send: []
  };
  const receiveQueue = [...(options.receiveQueue ?? [])];

  const server = createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/topology") {
      writeJson(response, {
        our_ipv6: "200::1",
        our_public_key: options.peerId,
        peers: [
          {
            pub_key: plannerPeerId
          }
        ],
        tree: []
      });
      return;
    }

    if (request.method === "POST" && request.url === "/send") {
      const body = await readBody(request);
      requests.send.push({
        destinationPeerId: request.headers["x-destination-peer-id"]?.toString(),
        body
      });
      response.statusCode = 200;
      response.setHeader("X-Sent-Bytes", String(Buffer.byteLength(body)));
      response.end("ok");
      return;
    }

    if (request.method === "GET" && request.url === "/recv") {
      const next = receiveQueue.shift();

      if (!next) {
        response.statusCode = 204;
        response.end();
        return;
      }

      response.statusCode = 200;
      response.setHeader("Content-Type", "application/octet-stream");
      response.setHeader("X-From-Peer-Id", next.fromPeerId);
      response.end(JSON.stringify(next.message));
      return;
    }

    response.statusCode = 404;
    response.end("not found");
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      })
  };
}

async function pollForLiveMessage(
  client: ReturnType<typeof createHttpAxlClient>,
  participant: AxlParticipant,
  messageId: string
) {
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    const inbound = await client.receive(participant);

    if (inbound?.message.id === messageId) {
      return inbound;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return null;
}

function writeJson(response: ServerResponse, data: unknown): void {
  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(data));
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}
