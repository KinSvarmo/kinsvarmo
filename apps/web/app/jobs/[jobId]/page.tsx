"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import type { AnalysisJob, AnalysisResult, AxlMessage, ModuleStatus } from "@kingsvarmo/shared";
import { API_BASE_URL, fetchJson } from "@/lib/api";

type JobResponse = {
  job: AnalysisJob;
};

type MessagesResponse = {
  messages: AxlMessage[];
};

type ResultResponse = {
  result: AnalysisResult;
};

type KeeperHubRunState = "queued" | "running" | "retrying" | "completed" | "failed";

type KeeperHubLogEntry = {
  id: string;
  runId: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  metadata: Record<string, unknown>;
};

type KeeperHubRun = {
  id: string;
  jobId: string;
  state: KeeperHubRunState;
  workflowId?: string;
  logs: KeeperHubLogEntry[];
  createdAt: string;
  updatedAt: string;
  raw?: unknown;
};

type KeeperHubResponse = {
  run: KeeperHubRun;
};

type DisplayedAxlMessage = {
  message: AxlMessage;
  displayedReceiver: string;
  route: string;
  isAuditCopy: boolean;
};

const MODULES: Array<{
  key: "plannerStatus" | "analyzerStatus" | "criticStatus" | "reporterStatus";
  label: string;
  description: string;
}> = [
  {
    key: "plannerStatus",
    label: "Planner",
    description: "Validates the request and creates the execution plan."
  },
  {
    key: "analyzerStatus",
    label: "Analyzer",
    description: "Estimates LD50 from dose-response CSV data."
  },
  {
    key: "criticStatus",
    label: "Critic",
    description: "Reviews the output and assigns confidence signals."
  },
  {
    key: "reporterStatus",
    label: "Reporter",
    description: "Packages the final report for the user interface."
  }
];

export default function JobStatusPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [messages, setMessages] = useState<AxlMessage[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [keeperHubRun, setKeeperHubRun] = useState<KeeperHubRun | null>(null);
  const [keeperHubError, setKeeperHubError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const [jobResponse, messagesResponse] = await Promise.all([
          fetchJson<JobResponse>(`/api/jobs/${jobId}`),
          fetchJson<MessagesResponse>(`/api/jobs/${jobId}/messages`)
        ]);

        if (cancelled) {
          return;
        }

        setJob(jobResponse.job);
        setMessages(messagesResponse.messages);
        setError(null);

        if (jobResponse.job.keeperhubRunId) {
          try {
            const keeperHubResponse = await fetchJson<KeeperHubResponse>(`/api/jobs/${jobId}/keeperhub`);
            if (!cancelled) {
              setKeeperHubRun(keeperHubResponse.run);
              setKeeperHubError(null);
            }
          } catch (caught) {
            if (!cancelled) {
              setKeeperHubRun(null);
              setKeeperHubError(caught instanceof Error ? caught.message : "Unable to load KeeperHub run");
            }
          }
        } else {
          setKeeperHubRun(null);
          setKeeperHubError(null);
        }

        if (jobResponse.job.resultId || jobResponse.job.status === "completed") {
          try {
            const resultResponse = await fetchJson<ResultResponse>(`/api/jobs/${jobId}/result`);
            if (!cancelled) {
              setResult(resultResponse.result);
            }
          } catch {
            if (!cancelled) {
              setResult(null);
            }
          }
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load job status");
        }
      } finally {
        if (!cancelled) {
          setLoadedOnce(true);
        }
      }
    }

    void refresh();
    const poll = window.setInterval(() => {
      void refresh();
    }, 2_000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [jobId]);

  const orderedMessages = useMemo(
    () =>
      [...messages].sort(
        (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
      ),
    [messages]
  );
  const displayedMessages = useMemo(
    () => orderedMessages.map((message) => toDisplayedAxlMessage(message)),
    [orderedMessages]
  );

  const latestMessage = orderedMessages.at(-1);
  const keeperHubTrace = getKeeperHubTrace(keeperHubRun?.raw);
  const keeperHubNodeStatuses = getKeeperHubNodeStatuses(keeperHubRun?.raw);
  const workflowTimeline = getWorkflowTimeline({
    job,
    keeperHubRun,
    messages: orderedMessages,
    result
  });

  async function retryWorkflow() {
    setRetrying(true);
    setRetryError(null);

    try {
      const response = await fetchJson<JobResponse>(`/api/jobs/${jobId}/retry`, {
        method: "POST"
      });
      setJob(response.job);
      setResult(null);
    } catch (caught) {
      setRetryError(caught instanceof Error ? caught.message : "Unable to retry workflow");
    } finally {
      setRetrying(false);
    }
  }

  if (!loadedOnce && !job) {
    return (
      <div className="container" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div className="glass-lg" style={{ padding: 32 }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Job Status</p>
          <h1 style={{ fontSize: "1.8rem", marginBottom: 8 }}>Loading workflow</h1>
          <p style={{ color: "var(--text-2)" }}>Fetching the job, module states, and AXL communication history.</p>
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="container" style={{ paddingTop: 80, paddingBottom: 80, maxWidth: 720 }}>
        <div className="glass-lg" style={{ padding: 32 }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Job Status</p>
          <h1 style={{ fontSize: "1.8rem", marginBottom: 12 }}>Job unavailable</h1>
          <div className="callout callout-error" style={{ marginBottom: 20 }}>
            {error}
          </div>
          <Link href="/agents" className="btn btn-secondary">Back to Agents</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, fontSize: "0.82rem", color: "var(--text-3)" }}>
        <Link href="/agents" style={{ color: "var(--text-3)" }}>Agents</Link>
        <span>/</span>
        <span style={{ color: "var(--text)" }}>Job {jobId}</span>
      </div>

      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>AXL Workflow</p>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "2rem", marginBottom: 10 }}>Job Status</h1>
            <p className="font-mono" style={{ color: "var(--text-2)", fontSize: "0.88rem", wordBreak: "break-all" }}>
              {jobId}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span className={statusBadge(job?.status ?? "created")}>{job?.status ?? "created"}</span>
            <span className="badge badge-blue">{orderedMessages.length} AXL messages</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="callout callout-warn" style={{ marginBottom: 20 }}>
          Last refresh failed: {error}
        </div>
      )}

      <div className="job-status-layout">
        <main style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section className="glass" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: 8 }}>Swarm Modules</p>
                <h2 style={{ fontSize: "1.25rem" }}>Execution state</h2>
              </div>
              {latestMessage && (
                <span className="badge badge-muted">Latest: {latestMessage.type}</span>
              )}
            </div>

            <div className="module-status-grid">
              {MODULES.map((module) => {
                const status = job?.[module.key] ?? "pending";

                return (
                  <article key={module.key} className="module-status-card">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                      <h3 style={{ fontSize: "1rem" }}>{module.label}</h3>
                      <span className={moduleBadge(status)}>{status}</span>
                    </div>
                    <p style={{ color: "var(--text-2)", fontSize: "0.82rem", lineHeight: 1.55 }}>
                      {module.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="glass" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: 8 }}>AXL Communication Log</p>
                <h2 style={{ fontSize: "1.25rem" }}>Message history</h2>
              </div>
              <span className="badge badge-teal">true route</span>
            </div>

            {displayedMessages.length === 0 ? (
              <div className="callout callout-info">
                No AXL messages have been recorded yet. Start the job to see planner, analyzer, critic, and reporter traffic here.
              </div>
            ) : (
              <div className="axl-log-list">
                <div className="axl-log-row axl-log-header">
                  <span>Time</span>
                  <span>Sender</span>
                  <span>Receiver</span>
                  <span>Type</span>
                </div>
                {displayedMessages.map(({ message, displayedReceiver, route, isAuditCopy }) => (
                  <article key={message.id} className="axl-log-row">
                    <span className="font-mono" style={{ color: "var(--text-3)" }}>
                      {formatTime(message.timestamp)}
                    </span>
                    <span>{message.sender}</span>
                    <span>
                      <span>{displayedReceiver}</span>
                      {isAuditCopy && (
                        <small className="axl-audit-copy">observed by API</small>
                      )}
                    </span>
                    <span>
                      <span className="badge badge-muted">{message.type}</span>
                      <small className="axl-route-label">{route}</small>
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="glass" style={{ padding: 22 }}>
            <p className="eyebrow" style={{ marginBottom: 12 }}>Job Details</p>
            <div className="job-detail-list">
              <Detail label="Filename" value={job?.filename ?? "pending"} />
              <Detail label="Payment" value={job?.paymentStatus ?? "pending"} />
              <Detail label="Agent ID" value={job?.agentId ?? "unknown"} monospace />
              <Detail label="Updated" value={job ? formatDate(job.updatedAt) : "pending"} />
            </div>
          </section>

          <section className="glass" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <p className="eyebrow">0G Execution Proof</p>
            </div>
            <div className="job-detail-list">
              <Detail label="Compute Mode" value="inference" />
              <Detail label="Provider" value={process.env.NEXT_PUBLIC_0G_INFERENCE_PROVIDER || "0x9815..."} monospace />
              <Detail label="Model" value="Qwen2.5-0.5B-Instruct" />
            </div>
          </section>

          <section className="glass" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <p className="eyebrow">Workflow Audit</p>
              {keeperHubRun && <span className={keeperHubBadge(keeperHubRun.state)}>{keeperHubRun.state}</span>}
            </div>
            {!job?.keeperhubRunId ? (
              <div className="callout callout-info">
                External run record will appear once the backend starts the workflow.
              </div>
            ) : keeperHubError ? (
              <div className="callout callout-warn">
                Audit run ID: {job.keeperhubRunId}
                <br />
                Audit fetch failed: {keeperHubError}
              </div>
            ) : keeperHubRun ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="job-detail-list">
                  <Detail label="Run record" value={job.keeperhubRunId} monospace />
                  <Detail label="Template" value={keeperHubRun.workflowId ?? "pgvk69uxp1yg9bfcmihz9"} monospace />
                  <Detail label="Audit logs" value={`${keeperHubRun.logs.length}`} />
                </div>
                <div className="callout callout-success" style={{ fontSize: "0.78rem", lineHeight: 1.55 }}>
                  Independent workflow record: payload received, validated, and timestamped before the AXL swarm result was accepted.
                </div>

                <div>
                  <p style={{ color: "var(--text-3)", fontSize: "0.74rem", marginBottom: 8 }}>Execution proof timeline</p>
                  <div className="keeperhub-node-list">
                    {workflowTimeline.map((item) => (
                      <div key={item.label} className="keeperhub-node-row">
                        <span>{item.label}</span>
                        <strong>{item.state}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {keeperHubTrace.length > 0 && (
                  <div>
                    <p style={{ color: "var(--text-3)", fontSize: "0.74rem", marginBottom: 8 }}>Audit path</p>
                    <div className="keeperhub-trace">
                      {keeperHubTrace.map((nodeId) => (
                        <span key={nodeId} className="badge badge-muted">{formatKeeperHubNodeLabel(nodeId)}</span>
                      ))}
                    </div>
                  </div>
                )}

                {keeperHubNodeStatuses.length > 0 && (
                  <div>
                    <p style={{ color: "var(--text-3)", fontSize: "0.74rem", marginBottom: 8 }}>Audit checkpoints</p>
                    <div className="keeperhub-node-list">
                      {keeperHubNodeStatuses.map((node) => (
                        <div key={node.nodeId} className="keeperhub-node-row">
                          <span>{formatKeeperHubNodeLabel(node.nodeId)}</span>
                          <strong>{node.status}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {keeperHubRun.logs.length > 0 && (
                  <div>
                    <p style={{ color: "var(--text-3)", fontSize: "0.74rem", marginBottom: 8 }}>Recent audit logs</p>
                    <div className="keeperhub-log-list">
                      {keeperHubRun.logs.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="keeperhub-log-row">
                          <span className="font-mono">{formatTime(entry.timestamp)}</span>
                          <strong>{entry.level}</strong>
                          <p>{summarizeKeeperHubLog(entry.message)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <a
                    href={`${API_BASE_URL}/api/jobs/${jobId}/audit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    Open Audit Bundle
                  </a>
                  <a
                    href="https://app.keeperhub.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    Open KeeperHub
                  </a>
                  {job?.status === "failed" && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => void retryWorkflow()}
                      disabled={retrying}
                    >
                      {retrying ? "Retrying..." : "Retry Workflow"}
                    </button>
                  )}
                </div>
                {retryError && (
                  <div className="callout callout-error" style={{ fontSize: "0.78rem" }}>
                    {retryError}
                  </div>
                )}
              </div>
            ) : (
              <div className="callout callout-info">
                Audit run ID: {job.keeperhubRunId}
                <br />
                Fetching workflow audit state...
              </div>
            )}
          </section>

          <section className="glass" style={{ padding: 22 }}>
            <p className="eyebrow" style={{ marginBottom: 12 }}>Result</p>
            {result ? (
              <div>
                <p style={{ color: "var(--text)", lineHeight: 1.5, marginBottom: 12 }}>{result.summary}</p>
                {typeof result.structuredJson.estimatedDl50 === "number" && (
                  <div className="glass" style={{ padding: 16, marginBottom: 16, background: "var(--bg-raised)" }}>
                    <div className="job-detail-list">
                      <Detail label="Estimated LD50" value={formatNumber(result.structuredJson.estimatedDl50 as number)} monospace />
                      <Detail label="Method" value={String(result.structuredJson.method ?? "unknown")} />
                    </div>
                  </div>
                )}
                <div className="job-detail-list" style={{ marginBottom: 16 }}>
                  <Detail label="Confidence" value={`${Math.round(result.confidence * 100)}%`} />
                  <Detail label="Provenance" value={result.provenanceId} monospace />
                  <Detail label="0G Compute" value={getZeroGComputeMode(result)} />
                  {result.structuredJson.verified === true && (
                     <Detail label="0G Verified" value="✓ Valid TEE Signature" />
                  )}
                  {result.structuredJson.verified === false && (
                     <Detail label="0G Verified" value="✗ Invalid Signature" />
                  )}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link href={`/results/${result.id}`} className="btn btn-primary btn-sm">Open Result Page</Link>
                  <a href={`${API_BASE_URL}/api/jobs/${jobId}/result`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Open JSON</a>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text-2)", fontSize: "0.86rem", lineHeight: 1.6 }}>
                The final report appears after the reporter sends `report.generated` back to the API.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value, monospace = false }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="job-detail-row">
      <span>{label}</span>
      <strong className={monospace ? "font-mono" : undefined}>{value}</strong>
    </div>
  );
}

function formatTime(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(timestamp));
}

function formatDate(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function toDisplayedAxlMessage(message: AxlMessage): DisplayedAxlMessage {
  const originalReceiver = getOriginalReceiver(message);
  const displayedReceiver = originalReceiver ?? message.receiver;
  const isAuditCopy = originalReceiver !== null && message.receiver === "api";

  return {
    message,
    displayedReceiver,
    route: `${message.sender} → ${displayedReceiver}`,
    isAuditCopy
  };
}

function getOriginalReceiver(message: AxlMessage): string | null {
  const { payload } = message;

  if (!isRecord(payload)) {
    return null;
  }

  const audit = payload.audit;
  const originalReceiver = payload.originalReceiver;

  return audit === true && typeof originalReceiver === "string"
    ? originalReceiver
    : null;
}

function getKeeperHubTrace(raw: unknown): string[] {
  if (!isRecord(raw)) {
    return [];
  }

  const execution = raw.execution;
  const candidate = isRecord(execution) ? execution.executionTrace : raw.executionTrace;

  return Array.isArray(candidate)
    ? candidate.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function getKeeperHubNodeStatuses(raw: unknown): Array<{ nodeId: string; status: string }> {
  if (!isRecord(raw)) {
    return [];
  }

  const candidate = raw.nodeStatuses;

  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.nodeId !== "string" || typeof entry.status !== "string") {
      return [];
    }

    return [{ nodeId: entry.nodeId, status: entry.status }];
  });
}

function summarizeKeeperHubLog(message: string): string {
  try {
    const parsed = JSON.parse(message) as unknown;

    if (isRecord(parsed)) {
      const nodeName = typeof parsed.nodeName === "string" ? parsed.nodeName : undefined;
      const status = typeof parsed.status === "string" ? parsed.status : undefined;

      if (nodeName && status) {
        return `${formatKeeperHubNodeLabel(nodeName)}: ${status}`;
      }
    }
  } catch {
    // Keep the raw message when it is already human-readable.
  }

  return message.length > 120 ? `${message.slice(0, 117)}...` : message;
}

function getWorkflowTimeline(input: {
  job: AnalysisJob | null;
  keeperHubRun: KeeperHubRun | null;
  messages: AxlMessage[];
  result: AnalysisResult | null;
}): Array<{ label: string; state: string }> {
  const { job, keeperHubRun, messages, result } = input;
  const hasReport = messages.some((message) => message.type === "report.generated");
  const computeMode = result ? getZeroGComputeMode(result) : "pending";

  return [
    {
      label: "0G usage authorized",
      state: job?.paymentStatus === "authorized" ? "confirmed" : job?.paymentStatus ?? "pending"
    },
    {
      label: "Workflow audit opened",
      state: keeperHubRun?.state ?? (job?.keeperhubRunId ? "recorded" : "pending")
    },
    {
      label: "AXL swarm completed",
      state: hasReport ? "confirmed" : `${messages.length} messages`
    },
    {
      label: "0G Compute proof",
      state: computeMode === "real" ? "real" : computeMode
    },
    {
      label: "Report hash bundle",
      state: result?.provenanceId ? "ready" : "pending"
    }
  ];
}

function formatKeeperHubNodeLabel(value: string): string {
  const normalized = value.toLowerCase();
  const labels: Record<string, string> = {
    "kinsvarmo-job-started": "Job received",
    "kinsvarmo job started": "Job received",
    "validate-job-payload": "Payload validated",
    "validate job payload": "Payload validated",
    "keeperhub-audit-log": "Audit log recorded",
    "create keeperhub audit log": "Audit log recorded",
    "prepare-axl-dispatch-audit": "AXL dispatch recorded",
    "prepare axl dispatch audit": "AXL dispatch recorded",
    "finalize-keeperhub-record": "Workflow record finalized",
    "finalize keeperhub record": "Workflow record finalized"
  };

  if (labels[normalized]) {
    return labels[normalized];
  }

  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getZeroGComputeMode(result: AnalysisResult): string {
  const candidate =
    asRecord(result.structuredJson.zeroGCompute) ??
    asRecord(asRecord(result.structuredJson.structuredJson)?.zeroGCompute);

  if (!isRecord(candidate)) {
    return "not recorded";
  }

  return typeof candidate.mode === "string" ? candidate.mode : "unknown";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function statusBadge(status: AnalysisJob["status"]): string {
  if (status === "completed") {
    return "badge badge-teal";
  }

  if (status === "failed") {
    return "badge badge-amber";
  }

  return "badge badge-blue";
}

function moduleBadge(status: ModuleStatus): string {
  if (status === "completed") {
    return "badge badge-teal";
  }

  if (status === "failed") {
    return "badge badge-amber";
  }

  if (status === "running") {
    return "badge badge-blue";
  }

  return "badge badge-muted";
}

function keeperHubBadge(status: KeeperHubRunState): string {
  if (status === "completed") {
    return "badge badge-teal";
  }

  if (status === "failed") {
    return "badge badge-amber";
  }

  return "badge badge-blue";
}
