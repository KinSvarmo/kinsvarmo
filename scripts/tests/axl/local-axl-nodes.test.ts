import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createHttpAxlClient } from "@kingsvarmo/axl-client";
import type { AxlMessage } from "@kingsvarmo/shared";
import {
  createLocalAxlNodeMap,
  getLocalAxlNodes,
  type LocalAxlNode
} from "../../axl/local-network";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(currentDir, "../../..");
const axlScriptsDir = join(repoRoot, "scripts/axl");
const localNodeScript = join(axlScriptsDir, "local-axl-node.ts");
const workerScript = join(axlScriptsDir, "agent-worker.ts");

test("local AXL nodes move messages through separate node processes", async () => {
  const portOffset = createPortOffset();
  const nodes = await startLocalAxlNodes(portOffset);

  try {
    const client = createHttpAxlClient({
      nodes: createLocalAxlNodeMap(portOffset),
      requestTimeoutMs: 2_000
    });
    const message: AxlMessage = {
      id: "msg_local_node_001",
      jobId: "job_local_node_001",
      sender: "api",
      receiver: "planner",
      type: "job.created",
      payload: {
        agentId: "agent_alkaloid_predictor_v2"
      },
      timestamp: "2026-04-24T00:00:00.000Z"
    };

    const health = await client.health();
    assert.equal(health.healthy, true);
    assert.equal(health.configured.length, 5);

    await client.send(message, {
      via: "api"
    });

    const inbound = await pollForMessage(client, "planner", message.id);
    assert.ok(inbound);
    assert.deepEqual(inbound.message, message);
  } finally {
    await stopProcesses(nodes);
  }
});

test("local agent workers complete the AXL message chain", async () => {
  const portOffset = createPortOffset();
  const nodes = await startLocalAxlNodes(portOffset);
  let workers: StartedProcess[] = [];

  try {
    workers = await startAgentWorkers(portOffset);
    const client = createHttpAxlClient({
      nodes: createLocalAxlNodeMap(portOffset),
      requestTimeoutMs: 2_000
    });
    const jobId = `job_worker_chain_${Date.now()}`;
    const message: AxlMessage = {
      id: `${jobId}_created`,
      jobId,
      sender: "api",
      receiver: "planner",
      type: "job.created",
      payload: {
        agentId: "agent_alkaloid_predictor_v2"
      },
      timestamp: new Date().toISOString()
    };

    await client.send(message, {
      via: "api"
    });

    const report = await pollForMessage(
      client,
      "api",
      undefined,
      jobId,
      "report.generated"
    );
    assert.ok(report);
    assert.equal(report.message.type, "report.generated");
    assert.equal(report.message.sender, "reporter");
    assert.equal(report.message.receiver, "api");
    assert.equal(report.message.payload.provenanceId, `prov_${jobId}`);
    assert.equal(
      typeof getRecord(report.message.payload.structuredJson)?.zeroGCompute,
      "object",
      "report should preserve 0G Compute proof metadata"
    );
  } finally {
    await stopProcesses([...workers, ...nodes]);
  }
});

interface StartedProcess {
  label: string;
  process: ChildProcess;
  output: string[];
}

async function startLocalAxlNodes(portOffset: number): Promise<StartedProcess[]> {
  const started: StartedProcess[] = [];

  for (const node of getLocalAxlNodes(portOffset)) {
    const child = spawnTsx(localNodeScript, [
      node.participant,
      `--port-offset=${portOffset}`
    ]);
    const processInfo = trackProcess(`axl:${node.participant}`, child);
    started.push(processInfo);
    await waitForHealth(node);
  }

  return started;
}

async function startAgentWorkers(portOffset: number): Promise<StartedProcess[]> {
  const started: StartedProcess[] = [];

  for (const worker of ["planner", "analyzer", "critic", "reporter"]) {
    const child = spawnTsx(workerScript, [worker, `--port-offset=${portOffset}`]);
    const processInfo = trackProcess(`worker:${worker}`, child);
    started.push(processInfo);
    await waitForOutput(processInfo, "agent-worker.started");
  }

  return started;
}

function spawnTsx(script: string, args: string[]): ChildProcess {
  return spawn(process.execPath, ["--import", "tsx", script, ...args], {
    cwd: repoRoot,
    env: createLocalTestEnv(),
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function createLocalTestEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env
  };

  for (const key of Object.keys(env)) {
    if (
      key === "AXL_TRANSPORT" ||
      key === "AXL_REAL_PORT_OFFSET" ||
      key.startsWith("AXL_NODE_")
    ) {
      delete env[key];
    }
  }

  return env;
}

function trackProcess(label: string, child: ChildProcess): StartedProcess {
  const output: string[] = [];

  child.stdout?.on("data", (data) => {
    output.push(data.toString());
  });
  child.stderr?.on("data", (data) => {
    output.push(data.toString());
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      output.push(`${label} exited with code ${code}`);
    }
  });

  return {
    label,
    process: child,
    output
  };
}

async function waitForHealth(node: LocalAxlNode): Promise<void> {
  const url = `http://127.0.0.1:${node.basePort}/health`;
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      await sleep(100);
    }
  }

  throw new Error(`Timed out waiting for ${node.participant} health at ${url}`);
}

async function waitForOutput(
  processInfo: StartedProcess,
  marker: string
): Promise<void> {
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    if (processInfo.output.some((entry) => entry.includes(marker))) {
      return;
    }

    await sleep(100);
  }

  throw new Error(
    `Timed out waiting for ${marker} from ${processInfo.label}:\n${processInfo.output.join(
      ""
    )}`
  );
}

async function pollForMessage(
  client: ReturnType<typeof createHttpAxlClient>,
  participant: "api" | "planner",
  messageId?: string,
  jobId?: string,
  messageType?: AxlMessage["type"]
) {
  const deadline = Date.now() + 8_000;

  while (Date.now() < deadline) {
    const inbound = await client.receive(participant);

    if (!inbound) {
      await sleep(150);
      continue;
    }

    if (messageId && inbound.message.id !== messageId) {
      continue;
    }

    if (jobId && inbound.message.jobId !== jobId) {
      continue;
    }

    if (messageType && inbound.message.type !== messageType) {
      continue;
    }

    return inbound;
  }

  return null;
}

async function stopProcesses(processes: StartedProcess[]): Promise<void> {
  await Promise.all(
    processes.map(async (processInfo) => {
      if (processInfo.process.exitCode !== null) {
        return;
      }

      processInfo.process.kill("SIGTERM");
      await Promise.race([
        once(processInfo.process, "exit"),
        sleep(1_000).then(() => {
          processInfo.process.kill("SIGKILL");
        })
      ]);
    })
  );
}

function createPortOffset(): number {
  return 20_000 + Math.floor(Math.random() * 10_000);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
