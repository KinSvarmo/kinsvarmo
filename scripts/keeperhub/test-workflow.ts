import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface KeeperHubStatus {
  status?: string;
  nodeStatuses?: Array<{
    nodeId?: string;
    status?: string;
  }>;
  progress?: {
    completedSteps?: number;
    totalSteps?: number;
  };
  errorContext?: unknown;
}

interface KeeperHubLogs {
  execution?: {
    id?: string;
    workflowId?: string;
    status?: string;
    executionTrace?: string[];
    input?: unknown;
    output?: unknown;
    error?: unknown;
  };
  logs?: Array<{
    nodeId?: string;
    nodeName?: string;
    status?: string;
    error?: unknown;
  }>;
}

loadDotEnv(".env", {
  override: true
});

const baseUrl = requireEnv("KEEPERHUB_BASE_URL").replace(/\/$/, "");
const workflowId = requireEnv("KEEPERHUB_WORKFLOW_ID");
const webhookKey = requireEnv("KEEPERHUB_WEBHOOK_KEY");
const apiKey = requireEnv("KEEPERHUB_API_KEY");
const webhookPath = readEnv("KEEPERHUB_WEBHOOK_RUN_PATH")
  .replace(":workflowId", workflowId);
const statusPathTemplate = readEnv(
  "KEEPERHUB_GET_RUN_PATH",
  "/api/workflows/executions/:runId/status"
);
const logsPathTemplate = readEnv(
  "KEEPERHUB_GET_LOGS_PATH",
  "/api/workflows/executions/:runId/logs"
);
const requestTimeoutMs = Number(readEnv("KEEPERHUB_REQUEST_TIMEOUT_MS", "5000"));

async function main(): Promise<void> {
  assertKeyPrefix("KEEPERHUB_WEBHOOK_KEY", webhookKey, "wfb_");
  assertKeyPrefix("KEEPERHUB_API_KEY", apiKey, "kh_");

  const jobId = `job_keeperhub_test_${Date.now()}`;
  const payload = {
    jobId,
    agentId: "agent_alkaloid_predictor_v2",
    filename: "alkaloid-sample.csv",
    uploadReference: "demo://alkaloid-sample.csv"
  };

  console.log("KeeperHub workflow test");
  console.log(`workflowId: ${workflowId}`);
  console.log(`webhook: ${baseUrl}${webhookPath}`);
  console.log(`jobId: ${jobId}`);

  const triggerResponse = await requestJson<Record<string, unknown>>({
    method: "POST",
    url: `${baseUrl}${webhookPath}`,
    token: webhookKey,
    body: payload
  });
  console.log("\ntrigger response:");
  console.log(JSON.stringify(triggerResponse, null, 2));

  const executionId = readString(triggerResponse, ["executionId", "execution_id", "id", "runId", "run_id"]);

  if (!executionId) {
    throw new Error("KeeperHub trigger response did not include an executionId");
  }

  const statusUrl = `${baseUrl}${statusPathTemplate.replace(":runId", encodeURIComponent(executionId))}`;
  const logsUrl = `${baseUrl}${logsPathTemplate.replace(":runId", encodeURIComponent(executionId))}`;
  const status = await pollStatus(statusUrl);

  console.log("\nstatus:");
  console.log(JSON.stringify(status, null, 2));

  const logs = await requestJson<KeeperHubLogs>({
    method: "GET",
    url: logsUrl,
    token: apiKey
  });

  console.log("\nexecution trace:");
  console.log(JSON.stringify(logs.execution?.executionTrace ?? [], null, 2));

  console.log("\nnode logs:");
  console.log(
    JSON.stringify(
      (logs.logs ?? []).map((log) => ({
        nodeId: log.nodeId,
        nodeName: log.nodeName,
        status: log.status,
        error: log.error ?? null
      })),
      null,
      2
    )
  );

  const trace = logs.execution?.executionTrace ?? [];
  if (trace.length <= 1) {
    console.warn(
      "\nWARNING: KeeperHub accepted the webhook, but only the trigger node executed. Reconnect or recreate the action node in the KeeperHub UI."
    );
    process.exitCode = 2;
    return;
  }

  if (status.status !== "success" && logs.execution?.status !== "success") {
    console.warn("\nWARNING: KeeperHub execution did not finish with success.");
    process.exitCode = 1;
    return;
  }

  console.log("\nKeeperHub workflow executed through action nodes successfully.");
}

async function pollStatus(statusUrl: string): Promise<KeeperHubStatus> {
  let latest: KeeperHubStatus = {};

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    latest = await requestJson<KeeperHubStatus>({
      method: "GET",
      url: statusUrl,
      token: apiKey
    });

    if (latest.status && latest.status !== "running" && latest.status !== "queued") {
      return latest;
    }

    await sleep(500);
  }

  return latest;
}

async function requestJson<T>(input: {
  method: string;
  url: string;
  token: string;
  body?: unknown;
}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(input.url, {
      method: input.method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.token}`,
        ...(input.body === undefined ? {} : { "Content-Type": "application/json" })
      },
      ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) })
    });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`${input.method} ${input.url} failed with ${response.status}: ${text}`);
    }

    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function loadDotEnv(path: string, options: { override?: boolean } = {}): void {
  const resolved = join(process.cwd(), path);

  if (!existsSync(resolved)) {
    return;
  }

  for (const line of readFileSync(resolved, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    if (options.override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function readEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function assertKeyPrefix(name: string, value: string, prefix: string): void {
  if (!value.startsWith(prefix)) {
    throw new Error(`${name} must start with ${prefix}`);
  }
}

function readString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
