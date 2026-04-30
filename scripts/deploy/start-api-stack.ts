import { spawn, type ChildProcess } from "node:child_process";

const rootDir = process.cwd();
const children: ChildProcess[] = [];
let shuttingDown = false;

const shouldStartLocalAxlNodes =
  process.env.AXL_TRANSPORT !== "real" &&
  process.env.AXL_START_LOCAL_NODES !== "0";
const shouldStartWorkers = process.env.AXL_START_WORKERS !== "0";

console.log("Starting KinSvarmo production API stack");
console.log(`Mode: ${process.env.NODE_ENV ?? "production"}`);
console.log(`AXL transport: ${process.env.AXL_TRANSPORT ?? "local"}`);
console.log(`Start local AXL nodes: ${shouldStartLocalAxlNodes ? "yes" : "no"}`);
console.log(`Start agent workers: ${shouldStartWorkers ? "yes" : "no"}`);
console.log(`API port: ${process.env.PORT ?? "4000"}`);

if (shouldStartLocalAxlNodes) {
  start("axl:nodes", ["pnpm", "axl:nodes"]);
}

if (shouldStartWorkers) {
  start("axl:workers", ["pnpm", "axl:workers"]);
}

start("api", ["pnpm", "--filter", "@kingsvarmo/api", "start:prod"]);

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

function start(label: string, command: [string, ...string[]]): void {
  const [bin, ...args] = command;
  const child = spawn(bin, args, {
    cwd: rootDir,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? "production"
    },
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

  setTimeout(() => process.exit(code), 750).unref();
}

function prefixLines(label: string, text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => (line.length > 0 ? `[${label}] ${line}` : line))
    .join("\n");
}
