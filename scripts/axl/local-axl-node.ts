import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  getLocalAxlNode,
  getLocalAxlNodes,
  parseParticipant,
  parsePortOffset
} from "./local-network";

const participant = parseParticipant();
const portOffset = parsePortOffset();
const node = getLocalAxlNode(participant, portOffset);
const allNodes = getLocalAxlNodes(portOffset);

interface QueuedMessage {
  fromPeerId: string;
  body: Buffer;
}

const queue: QueuedMessage[] = [];

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      writeJson(response, {
        ok: true,
        participant,
        peerId: node.peerId
      });
      return;
    }

    if (request.method === "GET" && request.url === "/topology") {
      writeJson(response, {
        our_ipv6: node.ipv6,
        our_public_key: node.peerId,
        peers: allNodes
          .filter((peer) => peer.participant !== participant)
          .map((peer) => ({
            participant: peer.participant,
            pub_key: peer.peerId,
            api: `http://127.0.0.1:${peer.basePort}`
          })),
        tree: allNodes.map((peer) => [participant, peer.participant])
      });
      return;
    }

    if (request.method === "POST" && request.url === "/send") {
      const destinationPeerId =
        request.headers["x-destination-peer-id"]?.toString();
      const destination = allNodes.find((peer) => peer.peerId === destinationPeerId);

      if (!destination) {
        response.statusCode = 404;
        response.end(`Unknown destination peer: ${destinationPeerId ?? "missing"}`);
        return;
      }

      const body = await readBody(request);
      const enqueueResponse = await fetch(
        `http://127.0.0.1:${destination.basePort}/__enqueue`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "X-From-Peer-Id": node.peerId
          },
          body
        }
      );

      if (!enqueueResponse.ok) {
        response.statusCode = 502;
        response.end(`Destination enqueue failed: ${enqueueResponse.status}`);
        return;
      }

      response.statusCode = 200;
      response.setHeader("X-Sent-Bytes", String(body.byteLength));
      response.end("ok");
      return;
    }

    if (request.method === "GET" && request.url === "/recv") {
      const next = queue.shift();

      if (!next) {
        response.statusCode = 204;
        response.end();
        return;
      }

      response.statusCode = 200;
      response.setHeader("Content-Type", "application/octet-stream");
      response.setHeader("X-From-Peer-Id", next.fromPeerId);
      response.end(next.body);
      return;
    }

    if (request.method === "POST" && request.url === "/__enqueue") {
      const fromPeerId = request.headers["x-from-peer-id"]?.toString();

      if (!fromPeerId) {
        response.statusCode = 400;
        response.end("Missing X-From-Peer-Id");
        return;
      }

      queue.push({
        fromPeerId,
        body: await readBody(request)
      });
      response.statusCode = 202;
      response.end("queued");
      return;
    }

    response.statusCode = 404;
    response.end("not found");
  } catch (error) {
    response.statusCode = 500;
    response.end(error instanceof Error ? error.message : "unknown error");
  }
});

server.listen(node.basePort, "127.0.0.1", () => {
  console.log(
    JSON.stringify({
      event: "local-axl-node.started",
      participant,
      url: `http://127.0.0.1:${node.basePort}`,
      peerId: node.peerId
    })
  );
});

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function shutdown(): void {
  server.close(() => {
    process.exit(0);
  });
}

function writeJson(response: ServerResponse, data: unknown): void {
  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(data));
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
