import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildRealAxlEnv,
  getRealAxlPaths,
  getRealAxlNodes,
  parseRealPortOffset,
  readRealAxlPeerIds
} from "./real-network";

const apiPeerId = process.env.AXL_NODE_API_PEER_ID ?? process.env.AXL_REMOTE_API_PEER_ID;

if (!apiPeerId) {
  throw new Error(
    "Missing AXL_REMOTE_API_PEER_ID. Get it with: curl -s https://kingsvarmoapi-production.up.railway.app/api/axl/topology"
  );
}

process.env.AXL_REAL_NODE_PARTICIPANTS = "reporter";

const paths = getRealAxlPaths();
const portOffset = parseRealPortOffset();
const nodes = getRealAxlNodes(paths, portOffset, ["reporter"]);
const peerIds = await readRealAxlPeerIds(nodes);
const reporterPeerId = peerIds.reporter;

if (!reporterPeerId) {
  throw new Error("Could not read remote reporter peer ID.");
}

const env = {
  ...buildRealAxlEnv(peerIds, paths, portOffset),
  AXL_NODE_API_PEER_ID: apiPeerId
};
const envPath = join(paths.configDir, "kinsvarmo-remote-reporter.env");

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
console.log("Set this Railway variable for @kingsvarmo/api:");
console.log(`AXL_NODE_REPORTER_PEER_ID=${reporterPeerId}`);
console.log("");
console.log("Run this before starting the reporter worker:");
console.log(`set -a; source ${envPath}; set +a`);
console.log("pnpm axl:remote:reporter:worker");
