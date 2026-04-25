import { spawn, type ChildProcess } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePortOffset } from "./local-network";

const currentDir = dirname(fileURLToPath(import.meta.url));
const workerScript = join(currentDir, "agent-worker.ts");
const portOffset = parsePortOffset();
const workers = ["planner", "analyzer", "critic", "reporter"];
const children: ChildProcess[] = [];

for (const worker of workers) {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", workerScript, worker, `--port-offset=${portOffset}`],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        AXL_LOCAL_PORT_OFFSET: String(portOffset)
      },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  child.stdout?.on("data", (data) => {
    process.stdout.write(`[worker:${worker}] ${data}`);
  });
  child.stderr?.on("data", (data) => {
    process.stderr.write(`[worker:${worker}:err] ${data}`);
  });

  children.push(child);
}

console.log(
  JSON.stringify({
    event: "agent-workers.started",
    workers
  })
);

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function shutdown(): void {
  for (const child of children) {
    child.kill("SIGTERM");
  }

  setTimeout(() => process.exit(0), 250).unref();
}
