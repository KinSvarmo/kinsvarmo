import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync } from "node:fs";
import {
  getRealAxlPaths,
  parseRealPortOffset,
  prepareRealAxlFiles
} from "./real-network";

const seedPeer = process.env.AXL_REMOTE_SEED_PEER;

if (!seedPeer) {
  throw new Error(
    "Missing AXL_REMOTE_SEED_PEER. Example: AXL_REMOTE_SEED_PEER=tls://your-railway-tcp-host:12345"
  );
}

const paths = getRealAxlPaths();
const portOffset = parseRealPortOffset();
process.env.AXL_REAL_NODE_PARTICIPANTS = "reporter";
const [reporter] = prepareRealAxlFiles(paths, portOffset);

if (!reporter) {
  throw new Error("Could not prepare reporter AXL node.");
}

reporter.peers = [seedPeer];
reporter.listen = [];

writeFileSync(reporter.configPath, `${JSON.stringify({
    PrivateKeyPath: reporter.keyPath,
    Peers: reporter.peers,
    Listen: reporter.listen,
    api_port: reporter.apiPort,
    bridge_addr: "127.0.0.1",
    tcp_port: reporter.tcpPort
  }, null, 2)}\n`);

const child: ChildProcess = spawn(paths.nodeBinaryPath, ["-config", reporter.configPath], {
  cwd: paths.axlDir,
  stdio: ["ignore", "pipe", "pipe"]
});

child.stdout?.on("data", (data) => {
  process.stdout.write(`[remote-reporter-axl] ${data}`);
});
child.stderr?.on("data", (data) => {
  process.stderr.write(`[remote-reporter-axl:err] ${data}`);
});

child.on("exit", (code) => {
  if (code && code !== 0) {
    process.stderr.write(`[remote-reporter-axl:err] exited with code ${code}\n`);
  }
});

console.log(
  JSON.stringify({
    event: "remote-reporter-axl.starting",
    seedPeer,
    api: `http://127.0.0.1:${reporter.apiPort}`,
    configPath: reporter.configPath
  })
);

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function shutdown(): void {
  child.kill("SIGTERM");
  setTimeout(() => process.exit(0), 300).unref();
}
