import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getLocalAxlNodes, parsePortOffset } from "./local-network";

const currentDir = dirname(fileURLToPath(import.meta.url));
const nodeScript = join(currentDir, "local-axl-node.ts");
const portOffset = parsePortOffset();
const children: ChildProcess[] = [];

for (const node of getLocalAxlNodes(portOffset)) {
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      nodeScript,
      node.participant,
      `--port-offset=${portOffset}`
    ],
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
    process.stdout.write(`[axl:${node.participant}] ${data}`);
  });
  child.stderr?.on("data", (data) => {
    process.stderr.write(`[axl:${node.participant}:err] ${data}`);
  });

  children.push(child);
}

console.log(
  JSON.stringify({
    event: "local-axl-network.started",
    participants: getLocalAxlNodes(portOffset).map((node) => ({
      participant: node.participant,
      url: `http://127.0.0.1:${node.basePort}`,
      peerId: node.peerId
    }))
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
