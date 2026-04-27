export type KeeperHubRunState =
  | "queued"
  | "running"
  | "retrying"
  | "completed"
  | "failed";

export interface KeeperHubLogEntry {
  id: string;
  runId: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  metadata: Record<string, unknown>;
}

export interface KeeperHubRun {
  id: string;
  jobId: string;
  state: KeeperHubRunState;
  workflowId?: string;
  logs: KeeperHubLogEntry[];
  createdAt: string;
  updatedAt: string;
  raw?: unknown;
}

export interface CreateKeeperHubRunInput {
  jobId: string;
  workflowId?: string;
  metadata?: Record<string, unknown>;
}

export interface KeeperHubClientHealth {
  configured: boolean;
  mode: "memory" | "http";
  healthy: boolean;
}

export interface KeeperHubClient {
  createRun(input: CreateKeeperHubRunInput): Promise<KeeperHubRun>;
  getRun(runId: string): Promise<KeeperHubRun>;
  retryRun(runId: string): Promise<KeeperHubRun>;
  getRunLogs(runId: string): Promise<KeeperHubLogEntry[]>;
  health(): Promise<KeeperHubClientHealth>;
}

export interface KeeperHubHttpClientOptions {
  baseUrl: string;
  apiKey?: string;
  webhookKey?: string;
  workflowId?: string;
  requestTimeoutMs?: number;
  paths?: Partial<KeeperHubHttpPaths>;
  headers?: Record<string, string>;
}

export interface KeeperHubHttpPaths {
  createRun: string;
  webhookRun?: string;
  getRun: string;
  retryRun: string;
  getRunLogs: string;
  health: string;
}

const defaultHttpPaths: KeeperHubHttpPaths = {
  createRun: "/api/runs",
  getRun: "/api/runs/:runId",
  retryRun: "/api/runs/:runId/retry",
  getRunLogs: "/api/runs/:runId/logs",
  health: "/health"
};

export function createInMemoryKeeperHubClient(): KeeperHubClient {
  const runs = new Map<string, KeeperHubRun>();

  return {
    async createRun(input) {
      const now = new Date().toISOString();
      const run: KeeperHubRun = {
        id: `kh_run_${input.jobId}`,
        jobId: input.jobId,
        state: "queued",
        ...(input.workflowId ? { workflowId: input.workflowId } : {}),
        logs: [
          createLogEntry(`kh_run_${input.jobId}`, "info", "KeeperHub run queued", {
            jobId: input.jobId,
            mode: "memory",
            ...(input.metadata ? { metadata: input.metadata } : {})
          })
        ],
        createdAt: now,
        updatedAt: now
      };

      runs.set(run.id, run);
      return run;
    },
    async getRun(runId) {
      return requireRun(runs, runId);
    },
    async retryRun(runId) {
      const run = requireRun(runs, runId);
      const updated = appendRunLog(
        {
          ...run,
          state: "retrying",
          updatedAt: new Date().toISOString()
        },
        "warn",
        "KeeperHub retry requested",
        {
          runId
        }
      );

      runs.set(runId, updated);
      return updated;
    },
    async getRunLogs(runId) {
      return requireRun(runs, runId).logs;
    },
    async health() {
      return {
        configured: false,
        mode: "memory",
        healthy: true
      };
    }
  };
}

export function createHttpKeeperHubClient(
  options: KeeperHubHttpClientOptions
): KeeperHubClient {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const paths: KeeperHubHttpPaths = {
    ...defaultHttpPaths,
    ...options.paths
  };
  const requestTimeoutMs = options.requestTimeoutMs ?? 5_000;

  async function requestJson<T>(
    method: string,
    pathTemplate: string,
    pathParams: Record<string, string> = {},
    body?: unknown,
    token = options.apiKey
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    const path = applyPathParams(pathTemplate, pathParams);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers ?? {})
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });

      if (!response.ok) {
        throw new Error(
          `KeeperHub ${method} ${path} failed with ${response.status}: ${await response.text()}`
        );
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async createRun(input) {
      const workflowId = input.workflowId ?? options.workflowId;
      const payload = {
        jobId: input.jobId,
        workflowId,
        metadata: input.metadata ?? {}
      };

      if (paths.webhookRun && options.webhookKey) {
        const raw = await requestJson<unknown>(
          "POST",
          paths.webhookRun,
          {},
          {
            jobId: input.jobId,
            ...(input.metadata ?? {}),
            metadata: input.metadata ?? {}
          },
          options.webhookKey
        );
        return normalizeRun(raw, input.jobId, workflowId);
      }

      const raw = await requestJson<unknown>("POST", paths.createRun, {}, payload);
      return normalizeRun(raw, input.jobId, workflowId);
    },
    async getRun(runId) {
      const raw = await requestJson<unknown>("GET", paths.getRun, { runId });
      return normalizeRun(raw);
    },
    async retryRun(runId) {
      const raw = await requestJson<unknown>("POST", paths.retryRun, { runId });
      return normalizeRun(raw);
    },
    async getRunLogs(runId) {
      const raw = await requestJson<unknown>("GET", paths.getRunLogs, { runId });
      return normalizeLogs(raw, runId);
    },
    async health() {
      try {
        await requestJson<unknown>("GET", paths.health);
        return {
          configured: true,
          mode: "http",
          healthy: true
        };
      } catch {
        return {
          configured: true,
          mode: "http",
          healthy: false
        };
      }
    }
  };
}

export function createKeeperHubClientFromEnv(
  env: Record<string, string | undefined>
): KeeperHubClient {
  const baseUrl = env.KEEPERHUB_BASE_URL;

  if (!baseUrl) {
    return createInMemoryKeeperHubClient();
  }

  const options: KeeperHubHttpClientOptions = {
    baseUrl,
    requestTimeoutMs: parsePositiveInteger(env.KEEPERHUB_REQUEST_TIMEOUT_MS, 5_000),
    paths: {
      ...(env.KEEPERHUB_CREATE_RUN_PATH ? { createRun: env.KEEPERHUB_CREATE_RUN_PATH } : {}),
      ...(env.KEEPERHUB_GET_RUN_PATH ? { getRun: env.KEEPERHUB_GET_RUN_PATH } : {}),
      ...(env.KEEPERHUB_RETRY_RUN_PATH ? { retryRun: env.KEEPERHUB_RETRY_RUN_PATH } : {}),
      ...(env.KEEPERHUB_GET_LOGS_PATH ? { getRunLogs: env.KEEPERHUB_GET_LOGS_PATH } : {}),
      ...(env.KEEPERHUB_HEALTH_PATH ? { health: env.KEEPERHUB_HEALTH_PATH } : {}),
      ...(env.KEEPERHUB_WEBHOOK_RUN_PATH ? { webhookRun: env.KEEPERHUB_WEBHOOK_RUN_PATH } : {})
    }
  };

  if (env.KEEPERHUB_API_KEY) {
    options.apiKey = env.KEEPERHUB_API_KEY;
  }

  if (env.KEEPERHUB_WEBHOOK_KEY) {
    options.webhookKey = env.KEEPERHUB_WEBHOOK_KEY;
  }

  if (env.KEEPERHUB_WORKFLOW_ID) {
    options.workflowId = env.KEEPERHUB_WORKFLOW_ID;
  }

  return createHttpKeeperHubClient(options);
}

export function normalizeRun(
  raw: unknown,
  fallbackJobId = "unknown",
  fallbackWorkflowId?: string
): KeeperHubRun {
  const source = unwrapData(raw);
  const now = new Date().toISOString();
  const id = readString(source, ["executionId", "execution_id", "id", "runId", "run_id"]) ?? `kh_run_${fallbackJobId}`;
  const jobId = readString(source, ["jobId", "job_id"]) ?? fallbackJobId;
  const workflowId = readString(source, ["workflowId", "workflow_id"]) ?? fallbackWorkflowId;
  const state = normalizeState(readString(source, ["state", "status"]));
  const logs = normalizeLogs(readUnknown(source, ["logs", "events"]) ?? [], id);

  return {
    id,
    jobId,
    state,
    ...(workflowId ? { workflowId } : {}),
    logs,
    createdAt: readString(source, ["createdAt", "created_at"]) ?? now,
    updatedAt: readString(source, ["updatedAt", "updated_at"]) ?? now,
    raw
  };
}

export function normalizeLogs(raw: unknown, fallbackRunId: string): KeeperHubLogEntry[] {
  const source = unwrapData(raw);
  const candidates = Array.isArray(source)
    ? source
    : Array.isArray(readUnknown(source, ["logs"]))
      ? (readUnknown(source, ["logs"]) as unknown[])
      : Array.isArray(readUnknown(source, ["events"]))
        ? (readUnknown(source, ["events"]) as unknown[])
        : [];

  return candidates.map((entry, index) => normalizeLog(entry, fallbackRunId, index));
}

function normalizeLog(raw: unknown, fallbackRunId: string, index: number): KeeperHubLogEntry {
  const source = isRecord(raw) ? raw : { message: String(raw) };
  const runId = readString(source, ["runId", "run_id"]) ?? fallbackRunId;
  const level = normalizeLogLevel(readString(source, ["level", "severity"]));
  const message =
    readString(source, ["message", "msg", "text"]) ?? JSON.stringify(source);

  return {
    id: readString(source, ["id", "logId", "log_id"]) ?? `${runId}_log_${index + 1}`,
    runId,
    timestamp: readString(source, ["timestamp", "time", "createdAt", "created_at"]) ?? new Date().toISOString(),
    level,
    message,
    metadata: isRecord(readUnknown(source, ["metadata", "meta"]))
      ? (readUnknown(source, ["metadata", "meta"]) as Record<string, unknown>)
      : {}
  };
}

function appendRunLog(
  run: KeeperHubRun,
  level: KeeperHubLogEntry["level"],
  message: string,
  metadata: Record<string, unknown>
): KeeperHubRun {
  return {
    ...run,
    logs: [...run.logs, createLogEntry(run.id, level, message, metadata)]
  };
}

function createLogEntry(
  runId: string,
  level: KeeperHubLogEntry["level"],
  message: string,
  metadata: Record<string, unknown> = {}
): KeeperHubLogEntry {
  return {
    id: `${runId}_log_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    runId,
    timestamp: new Date().toISOString(),
    level,
    message,
    metadata
  };
}

function requireRun(runs: Map<string, KeeperHubRun>, runId: string): KeeperHubRun {
  const run = runs.get(runId);

  if (!run) {
    throw new Error(`KeeperHub run not found: ${runId}`);
  }

  return run;
}

function applyPathParams(path: string, params: Record<string, string>): string {
  return Object.entries(params).reduce(
    (accumulator, [key, value]) =>
      accumulator.replaceAll(`:${key}`, encodeURIComponent(value)),
    path
  );
}

function normalizeState(value: string | undefined): KeeperHubRunState {
  if (value === "queued" || value === "running" || value === "retrying" || value === "completed" || value === "failed") {
    return value;
  }

  if (value === "success" || value === "succeeded" || value === "complete") {
    return "completed";
  }

  if (value === "error" || value === "errored" || value === "cancelled" || value === "canceled") {
    return "failed";
  }

  if (value === "pending" || value === "created") {
    return "queued";
  }

  return "running";
}

function normalizeLogLevel(value: string | undefined): KeeperHubLogEntry["level"] {
  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }

  if (value === "warning") {
    return "warn";
  }

  return "info";
}

function unwrapData(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }

  if ("run" in raw) {
    return raw.run;
  }

  if ("data" in raw) {
    return raw.data;
  }

  return raw;
}

function readString(source: unknown, keys: string[]): string | undefined {
  const value = readUnknown(source, keys);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readUnknown(source: unknown, keys: string[]): unknown {
  if (!isRecord(source)) {
    return undefined;
  }

  for (const key of keys) {
    if (key in source) {
      return source[key];
    }
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
