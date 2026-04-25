import type { AxlMessage, MessageParticipant } from "@kingsvarmo/shared";

export type AxlParticipant = MessageParticipant;

export interface AxlNodeEndpoint {
  baseUrl: string;
  peerId?: string;
}

export type AxlNodeMap = Partial<Record<AxlParticipant, AxlNodeEndpoint>>;

export interface AxlClientConfig {
  nodes: AxlNodeMap;
  requestTimeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface AxlSendOptions {
  via?: AxlParticipant;
}

export interface AxlSendReceipt {
  messageId: string;
  via: AxlParticipant;
  nodeUrl: string;
  destinationPeerId: string;
  sentBytes: number;
}

export interface AxlInboundMessage {
  message: AxlMessage;
  fromPeerId: string | null;
  receivedVia: AxlParticipant;
}

export interface AxlTopology {
  ourIpv6?: string;
  ourPublicKey?: string;
  peers: unknown[];
  tree: unknown[];
  raw: unknown;
}

export interface AxlClientHealth {
  configured: AxlParticipant[];
  nodes: Partial<Record<AxlParticipant, boolean>>;
  healthy: boolean;
}

export interface AxlClient {
  send(message: AxlMessage, options?: AxlSendOptions): Promise<AxlSendReceipt>;
  receive(participant: AxlParticipant): Promise<AxlInboundMessage | null>;
  listMessages(jobId: string): Promise<AxlMessage[]>;
  topology(participant: AxlParticipant): Promise<AxlTopology>;
  health(): Promise<AxlClientHealth>;
}

const participantEnvMap = {
  api: ["AXL_NODE_API_URL", "AXL_NODE_API_PEER_ID"],
  planner: ["AXL_NODE_PLANNER_URL", "AXL_NODE_PLANNER_PEER_ID"],
  analyzer: ["AXL_NODE_ANALYZER_URL", "AXL_NODE_ANALYZER_PEER_ID"],
  critic: ["AXL_NODE_CRITIC_URL", "AXL_NODE_CRITIC_PEER_ID"],
  reporter: ["AXL_NODE_REPORTER_URL", "AXL_NODE_REPORTER_PEER_ID"]
} as const satisfies Record<AxlParticipant, readonly [string, string]>;

export function createAxlNodeMapFromEnv(
  env: Record<string, string | undefined>
): AxlNodeMap {
  const nodes: AxlNodeMap = {};

  for (const [participant, [urlEnv, peerEnv]] of Object.entries(participantEnvMap)) {
    const baseUrl = env[urlEnv];
    const peerId = env[peerEnv];

    if (!baseUrl) {
      continue;
    }

    nodes[participant as AxlParticipant] = peerId
      ? { baseUrl, peerId }
      : { baseUrl };
  }

  return nodes;
}

export function createInMemoryAxlClient(): AxlClient {
  const messages: AxlMessage[] = [];

  return {
    async send(message) {
      messages.push(message);

      return {
        messageId: message.id,
        via: message.sender,
        nodeUrl: "memory://axl",
        destinationPeerId: `memory://${message.receiver}`,
        sentBytes: byteLength(JSON.stringify(message))
      };
    },
    async receive() {
      return null;
    },
    async listMessages(jobId) {
      return messages.filter((message) => message.jobId === jobId);
    },
    async topology() {
      return {
        peers: [],
        tree: [],
        raw: {
          mode: "memory"
        }
      };
    },
    async health() {
      return {
        configured: ["api", "planner", "analyzer", "critic", "reporter"],
        nodes: {
          api: true,
          planner: true,
          analyzer: true,
          critic: true,
          reporter: true
        },
        healthy: true
      };
    }
  };
}

export const createPlaceholderAxlClient = createInMemoryAxlClient;

export function createHttpAxlClient(config: AxlClientConfig): AxlClient {
  const messages: AxlMessage[] = [];
  const requestTimeoutMs = config.requestTimeoutMs ?? 5_000;
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async send(message, options) {
      const via = options?.via ?? message.sender;
      const source = requireNode(config.nodes, via);
      const destination = requireNode(config.nodes, message.receiver);
      const destinationPeerId = requirePeerId(message.receiver, destination);
      const body = JSON.stringify(message);
      const response = await fetchWithTimeout(
        fetchImpl,
        `${normalizeBaseUrl(source.baseUrl)}/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Destination-Peer-Id": destinationPeerId
          },
          body
        },
        requestTimeoutMs
      );

      if (!response.ok) {
        throw new Error(
          `AXL send failed through ${via}: ${response.status} ${response.statusText}`
        );
      }

      messages.push(message);

      return {
        messageId: message.id,
        via,
        nodeUrl: normalizeBaseUrl(source.baseUrl),
        destinationPeerId,
        sentBytes: parseSentBytes(response, body)
      };
    },
    async receive(participant) {
      const node = requireNode(config.nodes, participant);
      const response = await fetchWithTimeout(
        fetchImpl,
        `${normalizeBaseUrl(node.baseUrl)}/recv`,
        {
          method: "GET"
        },
        requestTimeoutMs
      );

      if (response.status === 204) {
        return null;
      }

      if (!response.ok) {
        throw new Error(
          `AXL receive failed for ${participant}: ${response.status} ${response.statusText}`
        );
      }

      const text = await response.text();
      const message = parseAxlMessage(text);
      messages.push(message);

      return {
        message,
        fromPeerId: response.headers.get("X-From-Peer-Id"),
        receivedVia: participant
      };
    },
    async listMessages(jobId) {
      return messages.filter((message) => message.jobId === jobId);
    },
    async topology(participant) {
      const node = requireNode(config.nodes, participant);
      const response = await fetchWithTimeout(
        fetchImpl,
        `${normalizeBaseUrl(node.baseUrl)}/topology`,
        {
          method: "GET"
        },
        requestTimeoutMs
      );

      if (!response.ok) {
        throw new Error(
          `AXL topology failed for ${participant}: ${response.status} ${response.statusText}`
        );
      }

      return normalizeTopology(await response.json());
    },
    async health() {
      const configured = Object.keys(config.nodes) as AxlParticipant[];
      const nodes: Partial<Record<AxlParticipant, boolean>> = {};

      await Promise.all(
        configured.map(async (participant) => {
          try {
            await this.topology(participant);
            nodes[participant] = true;
          } catch {
            nodes[participant] = false;
          }
        })
      );

      return {
        configured,
        nodes,
        healthy: configured.length > 0 && configured.every((name) => nodes[name])
      };
    }
  };
}

function requireNode(nodes: AxlNodeMap, participant: AxlParticipant): AxlNodeEndpoint {
  const node = nodes[participant];

  if (!node) {
    throw new Error(`AXL node is not configured for participant: ${participant}`);
  }

  return node;
}

function requirePeerId(participant: AxlParticipant, node: AxlNodeEndpoint): string {
  if (!node.peerId) {
    throw new Error(`AXL peer ID is not configured for participant: ${participant}`);
  }

  if (!/^[a-fA-F0-9]{64}$/.test(node.peerId)) {
    throw new Error(
      `AXL peer ID for ${participant} must be a 64-character hex ed25519 public key`
    );
  }

  return node.peerId;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseSentBytes(response: Response, body: string): number {
  const sentBytes = response.headers.get("X-Sent-Bytes");

  if (!sentBytes) {
    return byteLength(body);
  }

  const parsed = Number(sentBytes);
  return Number.isFinite(parsed) ? parsed : byteLength(body);
}

function parseAxlMessage(text: string): AxlMessage {
  const parsed = JSON.parse(text) as AxlMessage;

  if (!parsed.id || !parsed.jobId || !parsed.sender || !parsed.receiver || !parsed.type) {
    throw new Error("Inbound AXL payload is not a KinSvarmo AxlMessage");
  }

  return parsed;
}

function normalizeTopology(raw: unknown): AxlTopology {
  const record = isRecord(raw) ? raw : {};
  const ourIpv6 = typeof record.our_ipv6 === "string" ? record.our_ipv6 : undefined;
  const ourPublicKey =
    typeof record.our_public_key === "string" ? record.our_public_key : undefined;

  const topology: AxlTopology = {
    peers: Array.isArray(record.peers) ? record.peers : [],
    tree: Array.isArray(record.tree) ? record.tree : [],
    raw
  };

  if (ourIpv6) {
    topology.ourIpv6 = ourIpv6;
  }

  if (ourPublicKey) {
    topology.ourPublicKey = ourPublicKey;
  }

  return topology;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
