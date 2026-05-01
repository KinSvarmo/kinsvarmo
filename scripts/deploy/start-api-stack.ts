import { spawn, type ChildProcess } from "node:child_process";
import { createServer, request, type Server } from "node:http";
import { buildLocalAxlEnv } from "../axl/local-network";
import {
  buildRealAxlEnv,
  getRealAxlNodes,
  readRealAxlPeerIds
} from "../axl/real-network";

const rootDir = process.cwd();
const children: ChildProcess[] = [];
let shuttingDown = false;
let gatewayServer: Server | undefined;

const shouldStartRealAxlNodes =
  process.env.AXL_TRANSPORT === "real" &&
  process.env.AXL_START_REAL_NODES !== "0";
const shouldStartLocalAxlNodes =
  process.env.AXL_TRANSPORT !== "real" &&
  process.env.AXL_START_LOCAL_NODES !== "0";
const shouldStartWorkers = process.env.AXL_START_WORKERS !== "0";
const apiPort = process.env.API_PORT ?? process.env.HTTP_PORT ?? "8080";
const gatewayPort =
  process.env.API_GATEWAY_PORT ??
  process.env.RAILWAY_HEALTH_PORT ??
  (apiPort !== "8080" ? "8080" : undefined);
const localAxlEnv =
  shouldStartLocalAxlNodes || process.env.AXL_TRANSPORT !== "real"
    ? buildLocalAxlEnv(Number(process.env.AXL_LOCAL_PORT_OFFSET ?? "0"))
    : {};
let childEnv = {
  ...process.env,
  ...localAxlEnv,
  NODE_ENV: process.env.NODE_ENV ?? "production",
  API_PORT: apiPort,
  PORT: apiPort
};

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

void main().catch((caught) => {
  console.error(caught instanceof Error ? caught.message : caught);
  stopAll(1);
});

async function main(): Promise<void> {
  console.log("Starting KinSvarmo production API stack");
  console.log(`Mode: ${process.env.NODE_ENV ?? "production"}`);
  console.log(`AXL transport: ${process.env.AXL_TRANSPORT ?? "local"}`);
  console.log(`Start real AXL nodes: ${shouldStartRealAxlNodes ? "yes" : "no"}`);
  console.log(`Start local AXL nodes: ${shouldStartLocalAxlNodes ? "yes" : "no"}`);
  console.log(`Start agent workers: ${shouldStartWorkers ? "yes" : "no"}`);
  console.log(`API port: ${apiPort}`);
  startGatewayIfNeeded();

  if (shouldStartRealAxlNodes) {
    start("axl:real:nodes", ["pnpm", "exec", "tsx", "scripts/axl/start-real-axl-network.ts"]);
    const peerIds = await waitForRealAxlPeerIds();
    childEnv = {
      ...childEnv,
      ...buildRealAxlEnv(peerIds)
    };
    console.log(
      JSON.stringify({
        event: "real-axl.env.ready",
        participants: Object.keys(peerIds)
      })
    );
  }

  if (shouldStartLocalAxlNodes) {
    start("axl:nodes", ["pnpm", "axl:nodes"]);
  }

  if (shouldStartWorkers) {
    start("axl:workers", ["pnpm", "axl:workers"]);
  }

  start("api", ["pnpm", "--filter", "@kingsvarmo/api", "start:prod"]);
}

function startGatewayIfNeeded(): void {
  if (!gatewayPort || gatewayPort === apiPort) {
    return;
  }

  const port = Number(gatewayPort);
  if (!Number.isFinite(port) || port <= 0) {
    console.warn(`Skipping API gateway: invalid port ${gatewayPort}`);
    return;
  }

  gatewayServer = createServer((incoming, outgoing) => {
    if (incoming.url?.startsWith("/health")) {
      outgoing.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      outgoing.end(
        JSON.stringify({
          ok: true,
          service: "kingsvarmo-api-gateway",
          apiPort,
          gatewayPort
        })
      );
      return;
    }

    const upstream = request(
      {
        hostname: "127.0.0.1",
        port: apiPort,
        path: incoming.url,
        method: incoming.method,
        headers: incoming.headers
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      }
    );

    upstream.on("error", (caught) => {
      outgoing.writeHead(502, { "content-type": "application/json; charset=utf-8" });
      outgoing.end(
        JSON.stringify({
          error: "api_upstream_unavailable",
          message: caught instanceof Error ? caught.message : "Unknown upstream error"
        })
      );
    });

    incoming.pipe(upstream);
  });

  gatewayServer.listen(port, "0.0.0.0", () => {
    console.log(`API gateway listening at http://0.0.0.0:${port} -> http://127.0.0.1:${apiPort}`);
  });
}

function start(label: string, command: [string, ...string[]]): void {
  const [bin, ...args] = command;
  const child = spawn(bin, args, {
    cwd: rootDir,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"]
  });

  children.push(child);

  child.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(prefixLines(label, chunk.toString()));
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(prefixLines(`${label}:err`, chunk.toString()));
  });
  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`[${label}] exited with code ${code ?? "unknown"}`);
      stopAll(1);
    }
  });
}

async function waitForRealAxlPeerIds(): Promise<Awaited<ReturnType<typeof readRealAxlPeerIds>>> {
  const deadline = Date.now() + Number(process.env.AXL_REAL_START_TIMEOUT_MS ?? "30000");
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      return await readRealAxlPeerIds(getRealAxlNodes());
    } catch (caught) {
      lastError = caught;
      await sleep(750);
    }
  }

  throw new Error(
    `Real AXL nodes did not become ready: ${
      lastError instanceof Error ? lastError.message : "unknown startup error"
    }`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopAll(code = 0): void {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log("\nStopping KinSvarmo production API stack...");

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  gatewayServer?.close();

  setTimeout(() => process.exit(code), 750).unref();
}

function prefixLines(label: string, text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => (line.length > 0 ? `[${label}] ${line}` : line))
    .join("\n");
}
