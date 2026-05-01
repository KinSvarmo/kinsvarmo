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
const apiPort = resolveApiPort();
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

process.on("uncaughtException", (caught) => {
  console.error("[fatal] uncaughtException", formatError(caught));
  stopAll(1);
});

process.on("unhandledRejection", (caught) => {
  console.error("[fatal] unhandledRejection", formatError(caught));
  stopAll(1);
});

void main().catch((caught) => {
  console.error("[fatal] API stack failed to start", formatError(caught));
  stopAll(1);
});

async function main(): Promise<void> {
  console.log("[startup] Starting KinSvarmo production API stack");
  console.log(
    JSON.stringify({
      event: "api-stack.config",
      mode: process.env.NODE_ENV ?? "production",
      axlTransport: process.env.AXL_TRANSPORT ?? "local",
      startRealAxlNodes: shouldStartRealAxlNodes,
      startLocalAxlNodes: shouldStartLocalAxlNodes,
      startWorkers: shouldStartWorkers,
      apiPort,
      gatewayPort: gatewayPort ?? null,
      rootDir,
      axlRealDir: process.env.AXL_REAL_DIR ?? null,
      platformPort: process.env.PORT ?? null,
      httpPort: process.env.HTTP_PORT ?? null,
      railwayHealthPort: process.env.RAILWAY_HEALTH_PORT ?? null
    })
  );

  startGatewayIfNeeded();

  if (shouldStartRealAxlNodes) {
    console.log("[startup] Starting real AXL nodes");
    start("axl:real:nodes", ["pnpm", "exec", "tsx", "scripts/axl/start-real-axl-network.ts"]);

    console.log("[startup] Waiting for real AXL peer IDs");
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
    console.log("[startup] Starting local AXL nodes");
    start("axl:nodes", ["pnpm", "axl:nodes"]);
  }

  if (shouldStartWorkers) {
    console.log("[startup] Starting agent workers");
    start("axl:workers", ["pnpm", "axl:workers"]);
  }

  console.log("[startup] Starting API process");
  start("api", ["pnpm", "--filter", "@kingsvarmo/api", "start:prod"]);

  probeApiHealthSoon();
}

function startGatewayIfNeeded(): void {
  if (!gatewayPort || gatewayPort === apiPort) {
    console.log(
      JSON.stringify({
        event: "api-gateway.skipped",
        reason: !gatewayPort ? "gateway_port_not_set" : "gateway_port_equals_api_port",
        apiPort,
        gatewayPort: gatewayPort ?? null
      })
    );
    return;
  }

  const port = Number(gatewayPort);
  if (!Number.isFinite(port) || port <= 0) {
    console.warn(`Skipping API gateway: invalid port ${gatewayPort}`);
    return;
  }

  gatewayServer = createServer((incoming, outgoing) => {
    const startedAt = Date.now();
    const path = incoming.url ?? "/";

    if (path.startsWith("/health")) {
      console.log(
        JSON.stringify({
          event: "api-gateway.healthcheck",
          method: incoming.method,
          path,
          statusCode: 200
        })
      );
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
        path,
        method: incoming.method,
        headers: incoming.headers
      },
      (response) => {
        const statusCode = response.statusCode ?? 502;
        console.log(
          JSON.stringify({
            event: "api-gateway.proxy.response",
            method: incoming.method,
            path,
            statusCode,
            durationMs: Date.now() - startedAt
          })
        );
        outgoing.writeHead(statusCode, response.headers);
        response.pipe(outgoing);
      }
    );

    upstream.on("error", (caught) => {
      console.error(
        JSON.stringify({
          event: "api-gateway.proxy.error",
          method: incoming.method,
          path,
          durationMs: Date.now() - startedAt,
          error: caught instanceof Error ? caught.message : "Unknown upstream error"
        })
      );
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

  gatewayServer.on("error", (caught) => {
    console.error("[api-gateway] server error", formatError(caught));
    stopAll(1);
  });

  gatewayServer.listen(port, "0.0.0.0", () => {
    console.log(`API gateway listening at http://0.0.0.0:${port} -> http://127.0.0.1:${apiPort}`);
  });
}

function resolveApiPort(): string {
  if (process.env.API_PORT) {
    return process.env.API_PORT;
  }

  if (process.env.HTTP_PORT) {
    return process.env.HTTP_PORT;
  }

  const platformPort = process.env.PORT;
  const axlHubPort = String(9101 + Number(process.env.AXL_REAL_PORT_OFFSET ?? "0"));

  if (platformPort && platformPort !== axlHubPort) {
    return platformPort;
  }

  return "8080";
}

function start(label: string, command: [string, ...string[]]): void {
  const [bin, ...args] = command;

  console.log(
    JSON.stringify({
      event: "child.starting",
      label,
      command: [bin, ...args].join(" "),
      cwd: rootDir,
      apiPort: childEnv.API_PORT,
      port: childEnv.PORT
    })
  );

  const child = spawn(bin, args, {
    cwd: rootDir,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"]
  });

  children.push(child);

  console.log(
    JSON.stringify({
      event: "child.spawned",
      label,
      pid: child.pid ?? null
    })
  );

  child.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(prefixLines(label, chunk.toString()));
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(prefixLines(`${label}:err`, chunk.toString()));
  });
  child.on("error", (caught) => {
    console.error(`[${label}] failed to spawn`, formatError(caught));
    stopAll(1);
  });
  child.on("exit", (code, signal) => {
    console.log(
      JSON.stringify({
        event: "child.exited",
        label,
        pid: child.pid ?? null,
        code,
        signal,
        shuttingDown
      })
    );

    if (!shuttingDown && code !== 0) {
      console.error(`[${label}] exited with code ${code ?? "unknown"}`);
      stopAll(1);
    }
  });
}

async function waitForRealAxlPeerIds(): Promise<Awaited<ReturnType<typeof readRealAxlPeerIds>>> {
  const timeoutMs = Number(process.env.AXL_REAL_START_TIMEOUT_MS ?? "30000");
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  let attempt = 0;

  console.log(
    JSON.stringify({
      event: "real-axl.wait.start",
      timeoutMs,
      nodes: getRealAxlNodes().map((node) => node.participant)
    })
  );

  while (Date.now() < deadline) {
    attempt += 1;

    try {
      const peerIds = await readRealAxlPeerIds(getRealAxlNodes());
      console.log(
        JSON.stringify({
          event: "real-axl.wait.ready",
          attempt,
          elapsedMs: timeoutMs - Math.max(0, deadline - Date.now()),
          participants: Object.keys(peerIds)
        })
      );
      return peerIds;
    } catch (caught) {
      lastError = caught;

      if (attempt === 1 || attempt % 5 === 0) {
        console.warn(
          JSON.stringify({
            event: "real-axl.wait.retrying",
            attempt,
            remainingMs: Math.max(0, deadline - Date.now()),
            error: caught instanceof Error ? caught.message : "unknown startup error"
          })
        );
      }

      await sleep(750);
    }
  }

  throw new Error(
    `Real AXL nodes did not become ready: ${
      lastError instanceof Error ? lastError.message : "unknown startup error"
    }`
  );
}

function probeApiHealthSoon(): void {
  const delaysMs = [1500, 5000, 15000];

  for (const delayMs of delaysMs) {
    setTimeout(() => {
      void probeApiHealth(delayMs);
    }, delayMs).unref();
  }
}

async function probeApiHealth(delayMs: number): Promise<void> {
  const startedAt = Date.now();

  await new Promise<void>((resolve) => {
    const probe = request(
      {
        hostname: "127.0.0.1",
        port: apiPort,
        path: "/health",
        method: "GET",
        timeout: 5000
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          console.log(
            JSON.stringify({
              event: "api.health.probe",
              delayMs,
              statusCode: response.statusCode ?? null,
              durationMs: Date.now() - startedAt,
              body: body.slice(0, 500)
            })
          );
          resolve();
        });
      }
    );

    probe.on("timeout", () => {
      probe.destroy(new Error("health probe timed out"));
    });

    probe.on("error", (caught) => {
      console.error(
        JSON.stringify({
          event: "api.health.probe.error",
          delayMs,
          durationMs: Date.now() - startedAt,
          error: caught instanceof Error ? caught.message : "unknown health probe error"
        })
      );
      resolve();
    });

    probe.end();
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopAll(code = 0): void {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`\n[shutdown] Stopping KinSvarmo production API stack with exit code ${code}`);

  for (const child of children) {
    if (!child.killed) {
      console.log(
        JSON.stringify({
          event: "child.kill",
          pid: child.pid ?? null,
          signal: "SIGTERM"
        })
      );
      child.kill("SIGTERM");
    }
  }

  if (gatewayServer) {
    console.log("[shutdown] Closing API gateway");
    gatewayServer.close();
  }

  setTimeout(() => process.exit(code), 750).unref();
}

function prefixLines(label: string, text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => (line.length > 0 ? `[${label}] ${line}` : line))
    .join("\n");
}

function formatError(caught: unknown): string {
  if (caught instanceof Error) {
    return caught.stack ?? caught.message;
  }

  return String(caught);
}
