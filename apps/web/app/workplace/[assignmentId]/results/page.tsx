"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { WorkplaceAssignment, WorkplaceSubmission, AnalysisResult } from "@kingsvarmo/shared";
import { fetchJson } from "@/lib/api";

type SubmissionWithResult = WorkplaceSubmission & { result?: AnalysisResult };

export default function ResultsPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = use(params);
  const [assignment, setAssignment] = useState<WorkplaceAssignment | null>(null);
  const [rows, setRows] = useState<SubmissionWithResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [aRes, sRes] = await Promise.all([
          fetchJson<{ assignment: WorkplaceAssignment }>(`/api/workplace/assignments/${assignmentId}`),
          fetchJson<{ submissions: WorkplaceSubmission[] }>(`/api/workplace/assignments/${assignmentId}/submissions`),
        ]);

        const withResults = await Promise.all(
          sRes.submissions.map(async (s): Promise<SubmissionWithResult> => {
            if (!s.jobId) return s;
            try {
              const rRes = await fetchJson<{ result: AnalysisResult }>(`/api/jobs/${s.jobId}/result`);
              return { ...s, result: rRes.result };
            } catch {
              return s;
            }
          })
        );

        if (!cancelled) {
          setAssignment(aRes.assignment);
          setRows(withResults);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const poll = window.setInterval(() => { void load(); }, 5_000);
    return () => { cancelled = true; window.clearInterval(poll); };
  }, [assignmentId]);

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, fontSize: "0.82rem", color: "var(--text-3)" }}>
        <Link href="/workplace" style={{ color: "var(--text-3)" }}>Workspaces</Link>
        <span>/</span>
        <Link href={`/workplace/${assignmentId}`} style={{ color: "var(--text-3)" }}>{assignment?.title ?? assignmentId}</Link>
        <span>/</span>
        <span style={{ color: "var(--text)" }}>Results</span>
      </div>

      <p className="eyebrow" style={{ marginBottom: 8 }}>Results</p>
      <h1 style={{ fontSize: "1.8rem", marginBottom: 32 }}>{assignment?.title ?? "Shared task"}</h1>

      {loading ? (
        <div className="callout callout-info">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="callout callout-info">No submissions yet.</div>
      ) : (
        <div className="glass" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Submitter", "Status", "Confidence", "Key finding", "Result"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-3)", fontWeight: 500, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <p style={{ fontWeight: 500 }}>{row.studentName}</p>
                    <p style={{ color: "var(--text-3)", fontSize: "0.75rem" }}>{row.filename}</p>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className={statusBadge(row.status)}>{row.status}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontFamily: "'JetBrains Mono', monospace" }}>
                    {row.result ? `${Math.round(row.result.confidence * 100)}%` : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-2)", maxWidth: 280 }}>
                    {row.result?.keyFindings?.[0] ?? "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {row.jobId ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link href={`/jobs/${row.jobId}`} className="btn btn-secondary btn-sm" style={{ fontSize: "0.75rem" }}>Job</Link>
                        {row.result && (
                          <Link href={`/results/${row.result.id}`} className="btn btn-primary btn-sm" style={{ fontSize: "0.75rem" }}>Report</Link>
                        )}
                      </div>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function statusBadge(status: WorkplaceSubmission["status"]): string {
  if (status === "completed") return "badge badge-teal";
  if (status === "failed") return "badge badge-amber";
  if (status === "running") return "badge badge-blue";
  return "badge badge-muted";
}
