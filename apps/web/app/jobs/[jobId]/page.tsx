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
            <p className="eyebrow" style={{ marginBottom: 12 }}>KeeperHub</p>
            <div className="callout callout-info">
              {job?.keeperhubRunId
                ? `Run ID: ${job.keeperhubRunId}`
                : "KeeperHub run ID will appear here once the execution adapter is connected."}
            </div>
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
