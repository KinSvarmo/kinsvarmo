import { createHttpAxlClient } from "@kingsvarmo/axl-client";
import {
  assertRealAxlEnv,
  buildRealAxlEnv,
  getRealAxlNodes,
  parseRealPortOffset,
  parseEnvFile,
  readRealAxlPeerIds
} from "./real-network";

void main();

async function main(): Promise<void> {
  const portOffset = parseRealPortOffset();
  const nodes = getRealAxlNodes(undefined, portOffset);
  const envPath = "/tmp/axl/kingsvarmo-configs/kingsvarmo-real-axl.env";
  const envFromFile = parseEnvFile(envPath);
  const env =
    Object.keys(envFromFile).length > 0
      ? envFromFile
      : buildRealAxlEnv(await readRealAxlPeerIds(nodes), undefined, portOffset);

  assertRealAxlEnv(env);

  const client = createHttpAxlClient({
    nodes: Object.fromEntries(
      nodes.map((node) => {
        const prefix = `AXL_NODE_${node.participant.toUpperCase()}`;
        return [
          node.participant,
          {
            baseUrl: env[`${prefix}_URL`],
            peerId: env[`${prefix}_PEER_ID`]
          }
        ];
      })
    ),
    requestTimeoutMs: 3_000
  });

  const health = await client.health();
  console.log(JSON.stringify(health, null, 2));

  if (!health.healthy) {
    process.exit(1);
  }
}
