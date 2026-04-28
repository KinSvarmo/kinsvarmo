import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface WorkflowNode {
  id: string;
  type?: string;
  data?: {
    type?: string;
    label?: string;
    description?: string;
    status?: string;
    config?: Record<string, unknown>;
  };
  position?: {
    x: number;
    y: number;
  };
  [key: string]: unknown;
}

interface Workflow {
  id: string;
  name?: string;
  description?: string;
  visibility?: string;
  nodes?: WorkflowNode[];
  edges?: unknown[];
  [key: string]: unknown;
}

loadDotEnv(".env", {
  override: true
});

const baseUrl = requireEnv("KEEPERHUB_BASE_URL").replace(/\/$/, "");
const apiKey = requireEnv("KEEPERHUB_API_KEY");
const requestTimeoutMs = Number(readEnv("KEEPERHUB_REQUEST_TIMEOUT_MS", "5000"));

async function main(): Promise<void> {
  assertKeyPrefix("KEEPERHUB_API_KEY", apiKey, "kh_");

  console.log("Creating KeeperHub workflow through the official API...");
  const triggerId = "kinsvarmo-job-started";
  const validateId = "validate-job-payload";
  const auditId = "keeperhub-audit-log";
  const dispatchId = "prepare-axl-dispatch-audit";
  const finalizeId = "finalize-keeperhub-record";
  const nodes = createWorkflowNodes({
    triggerId,
    validateId,
    auditId,
    dispatchId,
    finalizeId
  });
  const edges = [
    {
      id: "edge-trigger-to-validate",
      type: "animated",
      source: triggerId,
      target: validateId
    },
    {
      id: "edge-validate-to-audit",
      type: "animated",
      source: validateId,
      target: auditId
    },
    {
      id: "edge-audit-to-dispatch",
      type: "animated",
      source: auditId,
      target: dispatchId
    },
    {
      id: "edge-dispatch-to-finalize",
      type: "animated",
      source: dispatchId,
      target: finalizeId
    }
  ];

  const created = await requestJson<Workflow>({
    method: "POST",
    url: `${baseUrl}/api/workflows/create`,
    body: {
      name: "KinSvarmo Analysis Execution",
      description:
        "Receives a KinSvarmo job payload, validates it, records KeeperHub audit logs, and prepares the backend AXL execution path.",
      visibility: "private",
      enabled: true,
      nodes,
      edges
    }
  });
  const enabled = await requestJson<Workflow>({
    method: "PATCH",
    url: `${baseUrl}/api/workflows/${created.id}`,
    body: {
      enabled: true
    }
  });

  updateDotEnv(enabled.id);

  console.log("KeeperHub workflow created and .env updated.");
  console.log(`workflowId: ${enabled.id}`);
  console.log(`webhook: ${baseUrl}/api/workflows/${enabled.id}/webhook`);
  console.log("\nNext:");
  console.log("pnpm keeperhub:test");
}

function createWorkflowNodes(input: {
  triggerId: string;
  validateId: string;
  auditId: string;
  dispatchId: string;
  finalizeId: string;
}): WorkflowNode[] {
  const { triggerId, validateId, auditId, dispatchId, finalizeId } = input;

  return [
    {
      id: triggerId,
      type: "trigger",
      position: {
        x: 0,
        y: 0
      },
      data: {
        type: "trigger",
        label: "KinSvarmo Job Started",
        description: "Webhook trigger called by KinSvarmo when an analysis job starts.",
        status: "idle",
        config: {
          triggerType: "Webhook"
        }
      }
    },
    createCodeNode({
      id: validateId,
      label: "Validate Job Payload",
      description: "Validates the KinSvarmo webhook payload before backend execution continues.",
      x: 260,
      code: [
        `const payload = {{@${triggerId}:KinSvarmo Job Started.data}};`,
        "",
        "if (!payload.jobId) throw new Error(\"Missing jobId\");",
        "if (!payload.agentId) throw new Error(\"Missing agentId\");",
        "",
        "console.log(\"KeeperHub validated KinSvarmo job\", payload.jobId);",
        "",
        "return {",
        "  ok: true,",
        "  event: \"keeperhub.job.validated\",",
        "  jobId: payload.jobId,",
        "  agentId: payload.agentId,",
        "  filename: payload.filename ?? null,",
        "  uploadReference: payload.uploadReference ?? null,",
        "  metadata: payload.metadata ?? {},",
        "  state: \"running\"",
        "};"
      ]
    }),
    createCodeNode({
      id: auditId,
      label: "Create KeeperHub Audit Log",
      description: "Creates a KeeperHub-visible audit event for the accepted KinSvarmo job.",
      x: 520,
      code: [
        `const job = {{@${validateId}:Validate Job Payload.result}};`,
        "",
        "console.log(\"KeeperHub accepted KinSvarmo job\", job.jobId);",
        "",
        "return {",
        "  ok: true,",
        "  event: \"keeperhub.job.accepted\",",
        "  jobId: job.jobId,",
        "  agentId: job.agentId,",
        "  filename: job.filename,",
        "  state: \"running\",",
        "  audit: \"KeeperHub accepted and validated the job payload.\"",
        "};"
      ]
    }),
    createCodeNode({
      id: dispatchId,
      label: "Prepare AXL Dispatch Audit",
      description: "Records that KinSvarmo will dispatch the job through planner, analyzer, critic, and reporter AXL nodes.",
      x: 780,
      code: [
        `const job = {{@${validateId}:Validate Job Payload.result}};`,
        "",
        "const modules = [\"planner\", \"analyzer\", \"critic\", \"reporter\"];",
        "console.log(\"KeeperHub prepared AXL dispatch audit\", { jobId: job.jobId, modules });",
        "",
        "return {",
        "  ok: true,",
        "  event: \"keeperhub.axl.dispatch.prepared\",",
        "  jobId: job.jobId,",
        "  agentId: job.agentId,",
        "  modules,",
        "  state: \"running\"",
        "};"
      ]
    }),
    createCodeNode({
      id: finalizeId,
      label: "Finalize KeeperHub Record",
      description: "Finalizes the KeeperHub-side execution record for display in the KinSvarmo job status page.",
      x: 1040,
      code: [
        `const job = {{@${validateId}:Validate Job Payload.result}};`,
        "",
        "console.log(\"KeeperHub workflow completed for KinSvarmo job\", job.jobId);",
        "",
        "return {",
        "  ok: true,",
        "  event: \"keeperhub.execution.completed\",",
        "  jobId: job.jobId,",
        "  agentId: job.agentId,",
        "  state: \"completed\"",
        "};"
      ]
    })
  ];
}

function createCodeNode(input: {
  id: string;
  label: string;
  description: string;
  x: number;
  code: string[];
}): WorkflowNode {
  return {
    id: input.id,
    type: "action",
    position: {
      x: input.x,
      y: 0
    },
    data: {
      type: "action",
      label: input.label,
      description: input.description,
      status: "idle",
      config: {
        actionType: "code/run-code",
        timeout: 10,
        code: input.code.join("\n")
      }
    }
  };
}

async function requestJson<T>(input: {
  method: string;
  url: string;
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
        Authorization: `Bearer ${apiKey}`,
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

function updateDotEnv(workflowId: string): void {
  const envPath = join(process.cwd(), ".env");
  const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const replacements: Record<string, string> = {
    KEEPERHUB_WORKFLOW_ID: workflowId,
    KEEPERHUB_CREATE_RUN_PATH: `/api/workflow/${workflowId}/execute`,
    KEEPERHUB_HEALTH_PATH: `/api/workflows/${workflowId}`,
    KEEPERHUB_WEBHOOK_RUN_PATH: `/api/workflows/${workflowId}/webhook`
  };
  let next = current;

  for (const [key, value] of Object.entries(replacements)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");

    if (pattern.test(next)) {
      next = next.replace(pattern, line);
    } else {
      next = `${next.trimEnd()}\n${line}\n`;
    }
  }

  writeFileSync(envPath, next.endsWith("\n") ? next : `${next}\n`);
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

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
