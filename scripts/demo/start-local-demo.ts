import { existsSync, readFileSync } from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { buildLocalAxlEnv, parsePortOffset } from "../axl/local-network";

const portOffset = parsePortOffset();
const rootDir = process.cwd();
const children: ChildProcess[] = [];
let shuttingDown = false;
const dotEnv = loadDotEnv(".env");

const env = {
  ...process.env,
  ...dotEnv,
  ...buildLocalAxlEnv(portOffset),
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? dotEnv.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
};

console.log("Starting KinSvarmo local demo stack");
console.log(`AXL port offset: ${portOffset}`);
console.log(`API: ${env.NEXT_PUBLIC_API_URL}`);
console.log("\nProcesses:");
console.log("- local AXL nodes");
console.log("- local agent workers");
console.log("- API");
console.log("- web app");
console.log("\nOpen http://localhost:3000/agents/1 after the servers finish booting.\n");

start("axl:nodes", ["pnpm", "axl:nodes"]);
start("axl:workers", ["pnpm", "axl:workers"]);
start("api", ["pnpm", "dev:api"]);
start("web", ["pnpm", "dev:web"]);

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

function start(label: string, command: [string, ...string[]]): void {
  const [bin, ...args] = command;
  const child = spawn(bin, args, {
    cwd: rootDir,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  children.push(child);

  child.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(prefixLines(label, chunk.toString()));
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(prefixLines(label, chunk.toString()));
  });
  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`[${label}] exited with code ${code ?? "unknown"}`);
      stopAll();
    }
  });
}

function stopAll(): void {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log("\nStopping local demo stack...");

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => process.exit(0), 750).unref();
}

function prefixLines(label: string, text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => (line.length > 0 ? `[${label}] ${line}` : line))
    .join("\n");
}

function loadDotEnv(path: string): Record<string, string> {
  const resolved = join(rootDir, path);
  const values: Record<string, string> = {};

  if (!existsSync(resolved)) {
    return values;
  }

  for (const line of readFileSync(resolved, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    values[trimmed.slice(0, separatorIndex)] = trimmed.slice(separatorIndex + 1);
  }

  return values;
}
