import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createAxlNodeMapFromEnv, type AxlNodeMap, type AxlParticipant } from "@kingsvarmo/axl-client";
import { localAxlParticipants } from "./local-network";

export interface RealAxlNode {
  participant: AxlParticipant;
  apiPort: number;
  tcpPort: number;
  keyPath: string;
  configPath: string;
  listen: string[];
  peers: string[];
}

export interface RealAxlPaths {
  axlDir: string;
  nodeBinaryPath: string;
  keyDir: string;
  configDir: string;
}

export function getRealAxlPaths(
  axlDir = process.env.AXL_REAL_DIR ?? "/tmp/axl"
): RealAxlPaths {
  return {
    axlDir,
    nodeBinaryPath: join(axlDir, "node"),
    keyDir: join(axlDir, "kingsvarmo-keys"),
    configDir: join(axlDir, "kingsvarmo-configs")
  };
}

export function getRealAxlNodes(
  paths = getRealAxlPaths(),
  portOffset = parseRealPortOffset()
): RealAxlNode[] {
  const hubPeer = `tls://127.0.0.1:${9101 + portOffset}`;

  return [
    {
      participant: "api",
      apiPort: 9002 + portOffset,
      tcpPort: 7000 + portOffset,
      keyPath: join(paths.keyDir, "api.pem"),
      configPath: join(paths.configDir, "api.json"),
      listen: [hubPeer],
      peers: []
    },
    {
      participant: "planner",
      apiPort: 9012 + portOffset,
      tcpPort: 7000 + portOffset,
      keyPath: join(paths.keyDir, "planner.pem"),
      configPath: join(paths.configDir, "planner.json"),
      listen: [],
      peers: [hubPeer]
    },
    {
      participant: "analyzer",
      apiPort: 9022 + portOffset,
      tcpPort: 7000 + portOffset,
      keyPath: join(paths.keyDir, "analyzer.pem"),
      configPath: join(paths.configDir, "analyzer.json"),
      listen: [],
      peers: [hubPeer]
    },
    {
      participant: "critic",
      apiPort: 9032 + portOffset,
      tcpPort: 7000 + portOffset,
      keyPath: join(paths.keyDir, "critic.pem"),
      configPath: join(paths.configDir, "critic.json"),
      listen: [],
      peers: [hubPeer]
    },
    {
      participant: "reporter",
      apiPort: 9042 + portOffset,
      tcpPort: 7000 + portOffset,
      keyPath: join(paths.keyDir, "reporter.pem"),
      configPath: join(paths.configDir, "reporter.json"),
      listen: [],
      peers: [hubPeer]
    }
  ];
}

export function prepareRealAxlFiles(
  paths = getRealAxlPaths(),
  portOffset = parseRealPortOffset()
): RealAxlNode[] {
  if (!existsSync(paths.nodeBinaryPath)) {
    throw new Error(
      `Real AXL node binary not found at ${paths.nodeBinaryPath}. Run: cd ${paths.axlDir} && make build`
    );
  }

  mkdirSync(paths.keyDir, {
    recursive: true
  });
  mkdirSync(paths.configDir, {
    recursive: true
  });

  const nodes = getRealAxlNodes(paths, portOffset);

  for (const node of nodes) {
    ensureKey(node.keyPath);
    writeFileSync(node.configPath, `${JSON.stringify(createConfig(node), null, 2)}\n`);
  }

  return nodes;
}

export function buildRealAxlEnv(
  peerIds: Partial<Record<AxlParticipant, string>>,
  paths = getRealAxlPaths(),
  portOffset = parseRealPortOffset()
): Record<string, string> {
  const env: Record<string, string> = {
    AXL_TRANSPORT: "real",
    AXL_REQUEST_TIMEOUT_MS: "3000",
    AXL_REAL_PORT_OFFSET: String(portOffset)
  };

  for (const node of getRealAxlNodes(paths, portOffset)) {
    const prefix = `AXL_NODE_${node.participant.toUpperCase()}`;
    env[`${prefix}_URL`] = `http://127.0.0.1:${node.apiPort}`;

    const peerId = peerIds[node.participant];

    if (peerId) {
      env[`${prefix}_PEER_ID`] = peerId;
    }
  }

  return env;
}

export async function readRealAxlPeerIds(
  nodes = getRealAxlNodes()
): Promise<Partial<Record<AxlParticipant, string>>> {
  const peerIds: Partial<Record<AxlParticipant, string>> = {};

  for (const node of nodes) {
    const response = await fetch(`http://127.0.0.1:${node.apiPort}/topology`);

    if (!response.ok) {
      throw new Error(
        `Could not read topology for ${node.participant}: ${response.status}`
      );
    }

    const topology = (await response.json()) as {
      our_ipv6?: string;
      our_public_key?: string;
    };

    if (!topology.our_public_key) {
      throw new Error(`Topology for ${node.participant} did not include our_public_key`);
    }

    assertRealAxlTopology(node.participant, topology);

    peerIds[node.participant] = topology.our_public_key;
  }

  return peerIds;
}

export function assertRealAxlEnv(env: Record<string, string | undefined>): void {
  for (const participant of localAxlParticipants) {
    const key = `AXL_NODE_${participant.toUpperCase()}_PEER_ID`;
    const peerId = env[key];

    if (!peerId) {
      throw new Error(`Missing ${key}. Run pnpm axl:real:env after real nodes start.`);
    }

    assertRealAxlPeerId(participant, peerId);
  }
}

export function createRealAxlNodeMapFromCurrentEnv(): AxlNodeMap {
  return createAxlNodeMapFromEnv(process.env);
}

export function parseRealPortOffset(args = process.argv): number {
  const fromFlag = args.find((arg) => arg.startsWith("--real-port-offset="));
  const rawValue =
    fromFlag?.split("=")[1] ?? process.env.AXL_REAL_PORT_OFFSET ?? "0";
  const parsed = Number(rawValue);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function isRealTransport(): boolean {
  return (
    process.env.AXL_TRANSPORT === "real" ||
    localAxlParticipants.some(
      (participant) => process.env[`AXL_NODE_${participant.toUpperCase()}_URL`]
    )
  );
}

export function parseEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};

  if (!existsSync(path)) {
    return env;
  }

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf("=");

    if (index === -1) {
      continue;
    }

    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }

  return env;
}

function createConfig(node: RealAxlNode): Record<string, unknown> {
  return {
    PrivateKeyPath: node.keyPath,
    Peers: node.peers,
    Listen: node.listen,
    api_port: node.apiPort,
    bridge_addr: "127.0.0.1",
    tcp_port: node.tcpPort
  };
}

function ensureKey(path: string): void {
  if (existsSync(path)) {
    return;
  }

  const result = spawnSync("openssl", [
    "genpkey",
    "-algorithm",
    "ed25519",
    "-out",
    path
  ]);

  if (result.status !== 0) {
    throw new Error(
      `Could not generate ed25519 key at ${path}: ${result.stderr.toString()}`
    );
  }
}

function assertRealAxlTopology(
  participant: AxlParticipant,
  topology: {
    our_ipv6?: string;
    our_public_key?: string;
  }
): void {
  if (topology.our_ipv6?.includes("kingsvarmo")) {
    throw new Error(
      `AXL ${participant} topology looks like the local simulator, not real Gensyn AXL. ` +
        "Use AXL_REAL_PORT_OFFSET=1000 if the local simulator is occupying default ports."
    );
  }

  assertRealAxlPeerId(participant, topology.our_public_key ?? "");
}

function assertRealAxlPeerId(participant: AxlParticipant, peerId: string): void {
  if (/^([a-e])\1{63}$/.test(peerId)) {
    throw new Error(
      `AXL ${participant} peer ID ${peerId.slice(
        0,
        8
      )}... is a local simulator peer ID, not a real Gensyn AXL peer ID. ` +
        "Start real nodes with AXL_REAL_PORT_OFFSET=1000 and rerun pnpm axl:real:env."
    );
  }
}
