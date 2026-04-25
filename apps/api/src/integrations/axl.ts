import {
  createAxlNodeMapFromEnv,
  createHttpAxlClient,
  createInMemoryAxlClient,
  type AxlClient
} from "@kingsvarmo/axl-client";

export function createBackendAxlClient(
  env: Record<string, string | undefined> = process.env
): AxlClient {
  const nodes = createAxlNodeMapFromEnv(env);
  const configuredNodeCount = Object.keys(nodes).length;

  if (configuredNodeCount === 0) {
    return createInMemoryAxlClient();
  }

  return createHttpAxlClient({
    nodes,
    requestTimeoutMs: parseRequestTimeout(env.AXL_REQUEST_TIMEOUT_MS)
  });
}

function parseRequestTimeout(value: string | undefined): number {
  if (!value) {
    return 5_000;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5_000;
}
