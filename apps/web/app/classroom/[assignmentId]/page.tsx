"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { ClassroomAssignment, ClassroomSubmission } from "@kingsvarmo/shared";
import { seededAgents } from "@kingsvarmo/shared";
import { fetchJson } from "@/lib/api";

export default function AssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = use(params);
  const [assignment, setAssignment] = useState<ClassroomAssignment | null>(null);
  const [submissions, setSubmissions] = useState<ClassroomSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [aRes, sRes] = await Promise.all([
          fetchJson<{ assignment: ClassroomAssignment }>(`/api/classroom/assignments/${assignmentId}`),
          fetchJson<{ submissions: ClassroomSubmission[] }>(`/api/classroom/assignments/${assignmentId}/submissions`),
        ]);
        if (!cancelled) {
          setAssignment(aRes.assignment);
          setSubmissions(sRes.submissions);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const poll = window.setInterval(() => { void load(); }, 5_000);
    return () => { cancelled = true; window.clearInterval(poll); };
  }, [assignmentId]);

  const agentName = seededAgents.find((a) => a.id === assignment?.agentId)?.name ?? assignment?.agentId ?? "—";
  const submitUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/classroom/${assignmentId}/submit`;

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 80 }}>
        <div className="glass-lg" style={{ padding: 32 }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Classroom</p>
          <p style={{ color: "var(--text-2)" }}>Loading assignment…</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="container" style={{ paddingTop: 80, maxWidth: 640 }}>
        <div className="glass-lg" style={{ padding: 32 }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Classroom</p>
          <div className="callout callout-error" style={{ marginBottom: 20 }}>{error ?? "Assignment not found"}</div>
          <Link href="/classroom" className="btn btn-secondary">Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, fontSize: "0.82rem", color: "var(--text-3)" }}>
        <Link href="/classroom" style={{ color: "var(--text-3)" }}>Classroom</Link>
        <span>/</span>
        <span style={{ color: "var(--text)" }}>{assignment.title}</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 32 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Assignment</p>
          <h1 style={{ fontSize: "2rem", marginBottom: 6 }}>{assignment.title}</h1>
          <p style={{ color: "var(--text-2)", fontSize: "0.9rem" }}>{assignment.className} · Agent: {agentName}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href={`/classroom/${assignmentId}/results`} className="btn btn-secondary btn-sm">Results table</Link>
          <Link href={`/classroom/${assignmentId}/submit`} className="btn btn-primary btn-sm">Submit dataset</Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="glass" style={{ padding: 24 }}>
            <p className="eyebrow" style={{ marginBottom: 12 }}>Submissions</p>
            {submissions.length === 0 ? (
              <div className="callout callout-info">
                No submissions yet. Share the link below with students.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {submissions.map((s) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", background: "var(--bg-raised)", borderRadius: "var(--radius-sm)", flexWrap: "wrap" }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: "0.9rem" }}>{s.studentName}</p>
                      <p style={{ color: "var(--text-3)", fontSize: "0.78rem" }}>{s.filename}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className={statusBadge(s.status)}>{s.status}</span>
                      {s.jobId && (
                        <Link href={`/jobs/${s.jobId}`} className="btn btn-secondary btn-sm" style={{ fontSize: "0.75rem" }}>
                          View job
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <section className="glass" style={{ padding: 20 }}>
            <p className="eyebrow" style={{ marginBottom: 12 }}>Details</p>
            <div className="job-detail-list">
              <div className="job-detail-row"><span>Class</span><strong>{assignment.className}</strong></div>
              <div className="job-detail-row"><span>Agent</span><strong>{agentName}</strong></div>
              <div className="job-detail-row"><span>Submissions</span><strong>{assignment.submissionIds.length}</strong></div>
              {assignment.dueDate && <div className="job-detail-row"><span>Due</span><strong>{assignment.dueDate}</strong></div>}
            </div>
          </section>

          {assignment.instructions && (
            <section className="glass" style={{ padding: 20 }}>
              <p className="eyebrow" style={{ marginBottom: 10 }}>Instructions</p>
              <p style={{ color: "var(--text-2)", fontSize: "0.85rem", lineHeight: 1.6 }}>{assignment.instructions}</p>
            </section>
          )}

          <section className="glass" style={{ padding: 20 }}>
            <p className="eyebrow" style={{ marginBottom: 10 }}>Student link</p>
            <p style={{ color: "var(--text-3)", fontSize: "0.75rem", wordBreak: "break-all", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
              {submitUrl}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function statusBadge(status: ClassroomSubmission["status"]): string {
  if (status === "completed") return "badge badge-teal";
  if (status === "failed") return "badge badge-amber";
  if (status === "running") return "badge badge-blue";
  return "badge badge-muted";
}
