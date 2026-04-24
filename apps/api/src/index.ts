import cors from "@fastify/cors";
import Fastify from "fastify";
import { seededAgents } from "@kingsvarmo/shared";

const server = Fastify({
  logger: true
});

await server.register(cors, {
  origin: true
});

server.get("/health", async () => ({
  ok: true,
  service: "kingsvarmo-api"
}));

server.get("/api/agents", async () => ({
  agents: seededAgents
}));

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

await server.listen({ port, host });
