import { spawn, type ChildProcess } from "node:child_process";
import {
  prepareRealAxlFiles,
  getRealAxlPaths,
  parseRealPortOffset
} from "./real-network";

const paths = getRealAxlPaths();
const portOffset = parseRealPortOffset();
const nodes = prepareRealAxlFiles(paths, portOffset);
const children: ChildProcess[] = [];

for (const node of nodes) {
  const child = spawn(paths.nodeBinaryPath, ["-config", node.configPath], {
    cwd: paths.axlDir,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout?.on("data", (data) => {
    process.stdout.write(`[real-axl:${node.participant}] ${data}`);
  });
  child.stderr?.on("data", (data) => {
    process.stderr.write(`[real-axl:${node.participant}:err] ${data}`);
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.stderr.write(
        `[real-axl:${node.participant}:err] exited with code ${code}\n`
      );
    }
  });

  children.push(child);
}

console.log(
  JSON.stringify({
    event: "real-axl-network.starting",
    axlDir: paths.axlDir,
    portOffset,
    nodes: nodes.map((node) => ({
      participant: node.participant,
      api: `http://127.0.0.1:${node.apiPort}`,
      configPath: node.configPath
    }))
  })
);

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function shutdown(): void {
  for (const child of children) {
    child.kill("SIGTERM");
  }

  setTimeout(() => process.exit(0), 300).unref();
}
