import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildRealAxlEnv,
  getRealAxlPaths,
  getRealAxlNodes,
  parseRealPortOffset,
  readRealAxlPeerIds
} from "./real-network";

void main();

async function main(): Promise<void> {
  const paths = getRealAxlPaths();
  const portOffset = parseRealPortOffset();
  const nodes = getRealAxlNodes(paths, portOffset);
  const peerIds = await readRealAxlPeerIds(nodes);
  const env = buildRealAxlEnv(peerIds, paths, portOffset);
  const envPath = join(paths.configDir, "kingsvarmo-real-axl.env");

  mkdirSync(paths.configDir, {
    recursive: true
  });
  writeFileSync(
    envPath,
    `${Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`
  );

  console.log(`Wrote ${envPath}`);
  console.log("");
  console.log("Run this in each terminal that should use real AXL:");
  console.log(`set -a; source ${envPath}; set +a`);
  console.log("");
  console.log("Then:");
  console.log("pnpm axl:workers");
  console.log("pnpm axl:demo");
}
