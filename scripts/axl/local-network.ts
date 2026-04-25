import {
  createAxlNodeMapFromEnv,
  type AxlNodeMap,
  type AxlParticipant
} from "@kingsvarmo/axl-client";

export const localAxlParticipants = [
  "api",
  "planner",
  "analyzer",
  "critic",
  "reporter"
] as const satisfies readonly AxlParticipant[];

export interface LocalAxlNode {
  participant: AxlParticipant;
  basePort: number;
  peerId: string;
  ipv6: string;
}

const localAxlNodeTemplates: LocalAxlNode[] = [
  {
    participant: "api",
    basePort: 9002,
    peerId: "a".repeat(64),
    ipv6: "200:kingsvarmo::api"
  },
  {
    participant: "planner",
    basePort: 9012,
    peerId: "b".repeat(64),
    ipv6: "200:kingsvarmo::planner"
  },
  {
    participant: "analyzer",
    basePort: 9022,
    peerId: "c".repeat(64),
    ipv6: "200:kingsvarmo::analyzer"
  },
  {
    participant: "critic",
    basePort: 9032,
    peerId: "d".repeat(64),
    ipv6: "200:kingsvarmo::critic"
  },
  {
    participant: "reporter",
    basePort: 9042,
    peerId: "e".repeat(64),
    ipv6: "200:kingsvarmo::reporter"
  }
];

export function getLocalAxlNodes(portOffset = 0): LocalAxlNode[] {
  return localAxlNodeTemplates.map((node) => ({
    ...node,
    basePort: node.basePort + portOffset
  }));
}

export function getLocalAxlNode(
  participant: AxlParticipant,
  portOffset = 0
): LocalAxlNode {
  const node = getLocalAxlNodes(portOffset).find(
    (candidate) => candidate.participant === participant
  );

  if (!node) {
    throw new Error(`Unknown local AXL participant: ${participant}`);
  }

  return node;
}

export function buildLocalAxlEnv(portOffset = 0): Record<string, string> {
  const env: Record<string, string> = {};

  for (const node of getLocalAxlNodes(portOffset)) {
    const prefix = `AXL_NODE_${node.participant.toUpperCase()}`;
    env[`${prefix}_URL`] = `http://127.0.0.1:${node.basePort}`;
    env[`${prefix}_PEER_ID`] = node.peerId;
  }

  env.AXL_REQUEST_TIMEOUT_MS = "2000";
  env.AXL_LOCAL_PORT_OFFSET = String(portOffset);

  return env;
}

export function createLocalAxlNodeMap(portOffset = 0): AxlNodeMap {
  return createAxlNodeMapFromEnv(buildLocalAxlEnv(portOffset));
}

export function parsePortOffset(args = process.argv): number {
  const fromFlag = args.find((arg) => arg.startsWith("--port-offset="));
  const rawValue =
    fromFlag?.split("=")[1] ?? process.env.AXL_LOCAL_PORT_OFFSET ?? "0";
  const parsed = Number(rawValue);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseParticipant(args = process.argv): AxlParticipant {
  const positional = args.find(
    (arg, index) =>
      index > 1 && !arg.startsWith("--") && isAxlParticipant(arg)
  );
  const fromFlag = args.find((arg) => arg.startsWith("--participant="));
  const value = fromFlag?.split("=")[1] ?? positional;

  if (!value || !isAxlParticipant(value)) {
    throw new Error(
      `Expected participant: ${localAxlParticipants.join(", ")}`
    );
  }

  return value;
}

export function isAxlParticipant(value: string): value is AxlParticipant {
  return localAxlParticipants.includes(value as AxlParticipant);
}
