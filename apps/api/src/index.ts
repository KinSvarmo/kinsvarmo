import { buildApiServer } from "./server";

const server = await buildApiServer();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? process.env.HTTP_PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

await server.listen({ port, host });
