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

  const latestMessage = orderedMessages.at(-1);
  const keeperHubTrace = getKeeperHubTrace(keeperHubRun?.raw);
  const keeperHubNodeStatuses = getKeeperHubNodeStatuses(keeperHubRun?.raw);

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
              <span className="badge badge-teal">sender → receiver</span>
            </div>

            {orderedMessages.length === 0 ? (
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
                {orderedMessages.map((message) => (
                  <article key={message.id} className="axl-log-row">
                    <span className="font-mono" style={{ color: "var(--text-3)" }}>
                      {formatTime(message.timestamp)}
                    </span>
                    <span>{message.sender}</span>
                    <span>{message.receiver}</span>
                    <span>
                      <span className="badge badge-muted">{message.type}</span>
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
              <p className="eyebrow">KeeperHub</p>
              {keeperHubRun && <span className={keeperHubBadge(keeperHubRun.state)}>{keeperHubRun.state}</span>}
            </div>
            {!job?.keeperhubRunId ? (
              <div className="callout callout-info">
                KeeperHub run ID will appear once the backend starts the workflow.
              </div>
            ) : keeperHubError ? (
              <div className="callout callout-warn">
                KeeperHub run ID: {job.keeperhubRunId}
                <br />
                Status fetch failed: {keeperHubError}
              </div>
            ) : keeperHubRun ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="job-detail-list">
                  <Detail label="Execution ID" value={job.keeperhubRunId} monospace />
                  <Detail label="Workflow" value={keeperHubRun.workflowId ?? "pgvk69uxp1yg9bfcmihz9"} monospace />
                  <Detail label="Logs" value={`${keeperHubRun.logs.length}`} />
                </div>

                {keeperHubTrace.length > 0 && (
                  <div>
                    <p style={{ color: "var(--text-3)", fontSize: "0.74rem", marginBottom: 8 }}>Execution trace</p>
                    <div className="keeperhub-trace">
                      {keeperHubTrace.map((nodeId) => (
                        <span key={nodeId} className="badge badge-muted">{nodeId}</span>
                      ))}
                    </div>
                  </div>
                )}

                {keeperHubNodeStatuses.length > 0 && (
                  <div>
                    <p style={{ color: "var(--text-3)", fontSize: "0.74rem", marginBottom: 8 }}>Node status</p>
                    <div className="keeperhub-node-list">
                      {keeperHubNodeStatuses.map((node) => (
                        <div key={node.nodeId} className="keeperhub-node-row">
                          <span>{node.nodeId}</span>
                          <strong>{node.status}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {keeperHubRun.logs.length > 0 && (
                  <div>
                    <p style={{ color: "var(--text-3)", fontSize: "0.74rem", marginBottom: 8 }}>Recent logs</p>
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
              </div>
            ) : (
              <div className="callout callout-info">
                Run ID: {job.keeperhubRunId}
                <br />
                Fetching KeeperHub execution state...
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
                </div>
                <a href={`${API_BASE_URL}/api/jobs/${jobId}/result`} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">Open Result JSON</a>
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
        return `${nodeName}: ${status}`;
      }
    }
  } catch {
    // Keep the raw message when it is already human-readable.
  }

  return message.length > 120 ? `${message.slice(0, 117)}...` : message;
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
