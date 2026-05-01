import { buildApiServer } from "./server";

const server = await buildApiServer();
const port = Number(resolveApiPort());
const host = process.env.HOST ?? "0.0.0.0";

await server.listen({ port, host });

function resolveApiPort(): string {
  if (process.env.API_PORT) {
    return process.env.API_PORT;
  }

  if (process.env.HTTP_PORT) {
    return process.env.HTTP_PORT;
  }

  const platformPort = process.env.PORT;
  const axlHubPort = String(9101 + Number(process.env.AXL_REAL_PORT_OFFSET ?? "0"));

  if (platformPort && platformPort !== axlHubPort) {
    return platformPort;
  }

  return "8080";
}
