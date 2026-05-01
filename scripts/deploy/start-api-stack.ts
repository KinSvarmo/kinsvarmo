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

/**
 * Railway sends traffic to process.env.PORT.
 * The gateway must own that public port immediately.
 * The real API runs on an internal port behind the gateway.
 */
const publicPort = resolvePublicPort();
const apiPort = resolveInternalApiPort(publicPort);
const gatewayPort = publicPort;

const localAxlEnv =
  shouldStartLocalAxlNodes || process.env.AXL_TRANSPORT !== "real"
    ? buildLocalAxlEnv(Number(process.env.AXL_LOCAL_PORT_OFFSET ?? "0"))
    : {};

let childEnv = {
  ...process.env,
  ...localAxlEnv,
  NODE_ENV: process.env.NODE_ENV ?? "production",

  /**
   * Force the API child process to use the internal port.
   * Do not let it bind to Railway's public PORT.
   */
  API_PORT: apiPort,
  PORT: apiPort
};

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

process.on("uncaughtException", (caught) => {
  console.error(
    JSON.stringify({
      event: "api-stack.uncaught_exception",
      error: caught instanceof Error ? caught.message : String(caught),
      stack: caught instanceof Error ? caught.stack : undefined
    })
  );

  stopAll(1);
});

process.on("unhandledRejection", (caught) => {
  console.error(
    JSON.stringify({
      event: "api-stack.unhandled_rejection",
      error: caught instanceof Error ? caught.message : String(caught),
      stack: caught instanceof Error ? caught.stack : undefined
    })
  );

  stopAll(1);
});

void main().catch((caught) => {
  console.error(
    JSON.stringify({
      event: "api-stack.startup_failed",
      error: caught instanceof Error ? caught.message : String(caught),
      stack: caught instanceof Error ? caught.stack : undefined
    })
  );

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
      publicPort,
      apiPort,
      gatewayPort,
      PORT: process.env.PORT ?? null,
      INTERNAL_API_PORT: process.env.INTERNAL_API_PORT ?? null,
      API_PORT: process.env.API_PORT ?? null,
      HTTP_PORT: process.env.HTTP_PORT ?? null,
      API_GATEWAY_PORT: process.env.API_GATEWAY_PORT ?? null,
      RAILWAY_HEALTH_PORT: process.env.RAILWAY_HEALTH_PORT ?? null,
      DISABLE_API_GATEWAY: process.env.DISABLE_API_GATEWAY ?? null,
      AXL_REAL_DIR: process.env.AXL_REAL_DIR ?? null
    })
  );

  /**
   * Start this before AXL and API.
   * Railway healthcheck must get a response immediately.
   */
  console.log("[startup] Starting API gateway before AXL/API");
  startGateway();

  if (shouldStartRealAxlNodes) {
    console.log("[startup] Starting real AXL nodes");

    start("axl:real:nodes", [
      "pnpm",
      "exec",
      "tsx",
      "scripts/axl/start-real-axl-network.ts"
    ]);

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

  console.log("[startup] Starting API");

  start("api", ["pnpm", "--filter", "@kingsvarmo/api", "start:prod"]);

  probeApiHealthSoon();
}

function startGateway(): void {
  const port = Number(gatewayPort);

  console.log(
    JSON.stringify({
      event: "api-gateway.start_attempt",
      publicPort,
      apiPort,
      gatewayPort
    })
  );

  if (!Number.isFinite(port) || port <= 0) {
    console.error(
      JSON.stringify({
        event: "api-gateway.invalid_port",
        gatewayPort
      })
    );

    stopAll(1);
    return;
  }

  if (gatewayPort === apiPort) {
    console.error(
      JSON.stringify({
        event: "api-gateway.invalid_ports",
        reason: "gatewayPort and apiPort must be different",
        gatewayPort,
        apiPort
      })
    );

    stopAll(1);
    return;
  }

  gatewayServer = createServer((incoming, outgoing) => {
    const url = incoming.url ?? "/";

    /**
     * Railway healthcheck endpoint.
     * This intentionally does not wait for AXL, workers, DB, or API readiness.
     */
    if (url.startsWith("/health")) {
      outgoing.writeHead(200, {
        "content-type": "application/json; charset=utf-8"
      });

      outgoing.end(
        JSON.stringify({
          ok: true,
          service: "kingsvarmo-api-gateway",
          status: "booting-or-ready",
          publicPort,
          apiPort,
          gatewayPort
        })
      );

      return;
    }

    /**
     * Proxy all non-health requests to the real API.
     */
    const upstream = request(
      {
        hostname: "127.0.0.1",
        port: Number(apiPort),
        path: url,
        method: incoming.method,
        headers: incoming.headers
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      }
    );

    upstream.on("error", (caught) => {
      outgoing.writeHead(502, {
        "content-type": "application/json; charset=utf-8"
      });

      outgoing.end(
        JSON.stringify({
          error: "api_upstream_unavailable",
          message: caught instanceof Error ? caught.message : "Unknown upstream error",
          apiPort,
          gatewayPort
        })
      );
    });

    incoming.pipe(upstream);
  });

  gatewayServer.on("error", (caught) => {
    console.error(
      JSON.stringify({
        event: "api-gateway.error",
        error: caught instanceof Error ? caught.message : String(caught),
        stack: caught instanceof Error ? caught.stack : undefined
      })
    );

    stopAll(1);
  });

  gatewayServer.listen(port, "0.0.0.0", () => {
    console.log(
      JSON.stringify({
        event: "api-gateway.listening",
        url: `http://0.0.0.0:${port}`,
        upstream: `http://127.0.0.1:${apiPort}`
      })
    );
  });
}

function resolvePublicPort(): string {
  return process.env.PORT ?? "8080";
}

function resolveInternalApiPort(currentPublicPort: string): string {
  const requestedInternalPort = process.env.INTERNAL_API_PORT;

  if (requestedInternalPort && requestedInternalPort !== currentPublicPort) {
    return requestedInternalPort;
  }

  if (currentPublicPort === "18080") {
    return "18081";
  }

  return "18080";
}

function start(label: string, command: [string, ...string[]]): void {
  const [bin, ...args] = command;

  console.log(
    JSON.stringify({
      event: "child.starting",
      label,
      command: [bin, ...args].join(" "),
      cwd: rootDir
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
    console.error(
      JSON.stringify({
        event: "child.error",
        label,
        error: caught instanceof Error ? caught.message : String(caught),
        stack: caught instanceof Error ? caught.stack : undefined
      })
    );

    if (!shuttingDown) {
      stopAll(1);
    }
  });

  child.on("exit", (code, signal) => {
    console.log(
      JSON.stringify({
        event: "child.exited",
        label,
        code,
        signal
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

  let attempts = 0;
  let lastError: unknown;

  console.log(
    JSON.stringify({
      event: "real-axl.peer-ids.wait.start",
      timeoutMs
    })
  );

  while (Date.now() < deadline) {
    attempts += 1;

    try {
      const peerIds = await readRealAxlPeerIds(getRealAxlNodes());

      console.log(
        JSON.stringify({
          event: "real-axl.peer-ids.wait.success",
          attempts,
          participants: Object.keys(peerIds)
        })
      );

      return peerIds;
    } catch (caught) {
      lastError = caught;

      console.log(
        JSON.stringify({
          event: "real-axl.peer-ids.wait.retry",
          attempts,
          message: caught instanceof Error ? caught.message : String(caught)
        })
      );

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
  const delays = [1500, 5000, 15000, 30000];

  for (const delay of delays) {
    setTimeout(() => {
      probeApiHealth(delay).catch((caught) => {
        console.error(
          JSON.stringify({
            event: "api.health.probe.unhandled_error",
            delayMs: delay,
            error: caught instanceof Error ? caught.message : String(caught)
          })
        );
      });
    }, delay).unref();
  }
}

function probeApiHealth(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    const probe = request(
      {
        hostname: "127.0.0.1",
        port: Number(apiPort),
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
              statusCode: response.statusCode,
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
          error: caught instanceof Error ? caught.message : String(caught),
          apiPort
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

  console.log(
    JSON.stringify({
      event: "api-stack.stopping",
      code,
      childCount: children.length
    })
  );

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