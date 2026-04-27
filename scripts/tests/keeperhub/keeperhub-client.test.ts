import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import test from "node:test";
import {
  createHttpKeeperHubClient,
  createInMemoryKeeperHubClient,
  createKeeperHubClientFromEnv,
  normalizeLogs,
  normalizeRun
} from "@kingsvarmo/keeperhub";

test("in-memory KeeperHub client creates, fetches, retries, and returns logs", async () => {
  const client = createInMemoryKeeperHubClient();
  const run = await client.createRun({
    jobId: "job_demo_001",
    metadata: {
      agentId: "agent_alkaloid_predictor_v2"
    }
  });

  assert.equal(run.id, "kh_run_job_demo_001");
  assert.equal(run.jobId, "job_demo_001");
  assert.equal(run.state, "queued");
  assert.equal(run.logs.length, 1);

  const fetched = await client.getRun(run.id);
  assert.equal(fetched.id, run.id);

  const retry = await client.retryRun(run.id);
  assert.equal(retry.state, "retrying");
  assert.equal(retry.logs.length, 2);

  const logs = await client.getRunLogs(run.id);
  assert.deepEqual(logs, retry.logs);

  const health = await client.health();
  assert.deepEqual(health, {
    configured: false,
    mode: "memory",
    healthy: true
  });
});

test("environment helper uses memory mode when KeeperHub is not configured", async () => {
  const client = createKeeperHubClientFromEnv({});
  const health = await client.health();

  assert.equal(health.mode, "memory");
  assert.equal(health.configured, false);
  assert.equal(health.healthy, true);
});

test("HTTP KeeperHub client sends authenticated requests and normalizes responses", async () => {
  const server = await startMockKeeperHubServer();
  const client = createHttpKeeperHubClient({
    baseUrl: server.baseUrl,
    apiKey: "keeperhub_test_key",
    workflowId: "workflow_demo",
    requestTimeoutMs: 1_000
  });

  try {
    const run = await client.createRun({
      jobId: "job_demo_002",
      metadata: {
        route: "axl-demo"
      }
    });

    assert.equal(run.id, "remote_run_001");
    assert.equal(run.jobId, "job_demo_002");
    assert.equal(run.workflowId, "workflow_demo");
    assert.equal(run.state, "running");
    assert.equal(run.logs[0]?.message, "Remote workflow started");

    assert.equal(server.requests[0]?.method, "POST");
    assert.equal(server.requests[0]?.url, "/api/runs");
    assert.equal(server.requests[0]?.authorization, "Bearer keeperhub_test_key");
    assert.deepEqual(JSON.parse(server.requests[0]?.body ?? "{}"), {
      jobId: "job_demo_002",
      workflowId: "workflow_demo",
      metadata: {
        route: "axl-demo"
      }
    });

    const fetched = await client.getRun(run.id);
    assert.equal(fetched.state, "completed");

    const logs = await client.getRunLogs(run.id);
    assert.deepEqual(
      logs.map((entry) => entry.message),
      ["Remote workflow started", "Remote workflow completed"]
    );

    const retried = await client.retryRun(run.id);
    assert.equal(retried.state, "retrying");

    const health = await client.health();
    assert.deepEqual(health, {
      configured: true,
      mode: "http",
      healthy: true
    });
  } finally {
    await server.close();
  }
});

test("HTTP KeeperHub client can create runs through webhook execution", async () => {
  const server = await startMockKeeperHubServer();
  const client = createHttpKeeperHubClient({
    baseUrl: server.baseUrl,
    apiKey: "keeperhub_api_key",
    webhookKey: "keeperhub_webhook_key",
    workflowId: "workflow_demo",
    paths: {
      webhookRun: "/api/workflows/workflow_demo/webhook"
    },
    requestTimeoutMs: 1_000
  });

  try {
    const run = await client.createRun({
      jobId: "job_demo_webhook",
      metadata: {
        agentId: "agent_alkaloid_predictor_v2",
        filename: "alkaloid-sample.csv"
      }
    });

    assert.equal(run.id, "webhook_exec_001");
    assert.equal(run.jobId, "job_demo_webhook");
    assert.equal(run.workflowId, "workflow_demo");
    assert.equal(run.state, "running");

    assert.equal(server.requests[0]?.method, "POST");
    assert.equal(server.requests[0]?.url, "/api/workflows/workflow_demo/webhook");
    assert.equal(server.requests[0]?.authorization, "Bearer keeperhub_webhook_key");
    assert.deepEqual(JSON.parse(server.requests[0]?.body ?? "{}"), {
      jobId: "job_demo_webhook",
      agentId: "agent_alkaloid_predictor_v2",
      filename: "alkaloid-sample.csv",
      metadata: {
        agentId: "agent_alkaloid_predictor_v2",
        filename: "alkaloid-sample.csv"
      }
    });
  } finally {
    await server.close();
  }
});

test("KeeperHub response normalizers accept common REST response shapes", () => {
  const run = normalizeRun({
    data: {
      run_id: "kh_remote_123",
      job_id: "job_remote_123",
      workflow_id: "workflow_remote",
      status: "succeeded",
      events: [
        {
          log_id: "log_remote_1",
          time: "2026-04-27T00:00:00.000Z",
          severity: "warning",
          msg: "Gas price adjusted"
        }
      ]
    }
  });

  assert.equal(run.id, "kh_remote_123");
  assert.equal(run.jobId, "job_remote_123");
  assert.equal(run.workflowId, "workflow_remote");
  assert.equal(run.state, "completed");
  assert.equal(run.logs[0]?.level, "warn");
  assert.equal(run.logs[0]?.message, "Gas price adjusted");

  const logs = normalizeLogs({
    logs: ["submitted", { level: "error", message: "retry failed" }]
  }, "kh_remote_123");

  assert.deepEqual(
    logs.map((entry) => entry.message),
    ["submitted", "retry failed"]
  );
});

interface RecordedRequest {
  method: string;
  url: string;
  authorization?: string;
  body: string;
}

async function startMockKeeperHubServer(): Promise<{
  baseUrl: string;
  requests: RecordedRequest[];
  close(): Promise<void>;
}> {
  const requests: RecordedRequest[] = [];
  const server = createServer(async (request, response) => {
    const body = await readBody(request);
    requests.push({
      method: request.method ?? "GET",
      url: request.url ?? "/",
      ...(request.headers.authorization ? { authorization: request.headers.authorization } : {}),
      body
    });

    if (request.method === "POST" && request.url === "/api/runs") {
      return sendJson(response, {
        run: {
          id: "remote_run_001",
          jobId: JSON.parse(body).jobId,
          workflowId: JSON.parse(body).workflowId,
          state: "running",
          logs: [
            {
              id: "remote_log_001",
              level: "info",
              message: "Remote workflow started"
            }
          ]
        }
      });
    }

    if (request.method === "POST" && request.url === "/api/workflows/workflow_demo/webhook") {
      return sendJson(response, {
        executionId: "webhook_exec_001",
        status: "running"
      });
    }

    if (request.method === "GET" && request.url === "/api/runs/remote_run_001") {
      return sendJson(response, {
        id: "remote_run_001",
        jobId: "job_demo_002",
        workflowId: "workflow_demo",
        status: "succeeded"
      });
    }

    if (request.method === "GET" && request.url === "/api/runs/remote_run_001/logs") {
      return sendJson(response, {
        logs: [
          {
            id: "remote_log_001",
            level: "info",
            message: "Remote workflow started"
          },
          {
            id: "remote_log_002",
            level: "info",
            message: "Remote workflow completed"
          }
        ]
      });
    }

    if (request.method === "POST" && request.url === "/api/runs/remote_run_001/retry") {
      return sendJson(response, {
        id: "remote_run_001",
        jobId: "job_demo_002",
        workflowId: "workflow_demo",
        state: "retrying"
      });
    }

    if (request.method === "GET" && request.url === "/health") {
      return sendJson(response, {
        ok: true
      });
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
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      })
  };
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function sendJson(response: ServerResponse, body: unknown): void {
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(body));
}
