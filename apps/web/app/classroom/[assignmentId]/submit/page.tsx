"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClassroomAssignment } from "@kingsvarmo/shared";
import { seededAgents } from "@kingsvarmo/shared";
import { fetchJson } from "@/lib/api";

const SAMPLE_CSV = `dose,response,total
0,0,20
0.1,2,20
0.25,4,20
0.5,7,20
1,10,20
2.5,14,20
5,18,20
10,20,20`;

export default function SubmitPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = use(params);
  const router = useRouter();

  const [assignment, setAssignment] = useState<ClassroomAssignment | null>(null);
  const [studentName, setStudentName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [filename, setFilename] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<{ assignment: ClassroomAssignment }>(`/api/classroom/assignments/${assignmentId}`)
      .then((r) => setAssignment(r.assignment))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load assignment"));
  }, [assignmentId]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!csvText) { setError("Upload a CSV file first"); return; }
    setSubmitting(true);
    setError(null);

    try {
      const { jobId } = await fetchJson<{ jobId: string }>(
        `/api/classroom/assignments/${assignmentId}/submissions`,
        {
          method: "POST",
          body: JSON.stringify({ studentName, filename: filename || "dataset.csv", csvText }),
        }
      );

      await fetchJson(`/api/jobs/${jobId}/start`, { method: "POST" });
      router.push(`/jobs/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setSubmitting(false);
    }
  }

  const agentName = seededAgents.find((a) => a.id === assignment?.agentId)?.name ?? "—";

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, fontSize: "0.82rem", color: "var(--text-3)" }}>
        <Link href="/classroom" style={{ color: "var(--text-3)" }}>Classroom</Link>
        <span>/</span>
        <Link href={`/classroom/${assignmentId}`} style={{ color: "var(--text-3)" }}>{assignment?.title ?? assignmentId}</Link>
        <span>/</span>
        <span style={{ color: "var(--text)" }}>Submit</span>
      </div>

      <p className="eyebrow" style={{ marginBottom: 8 }}>Student submission</p>
      <h1 style={{ fontSize: "1.8rem", marginBottom: 6 }}>{assignment?.title ?? "Assignment"}</h1>
      {assignment && (
        <p style={{ color: "var(--text-2)", fontSize: "0.88rem", marginBottom: 32 }}>
          {assignment.className} · Agent: {agentName}
        </p>
      )}

      {assignment?.instructions && (
        <div className="callout callout-info" style={{ marginBottom: 24 }}>
          {assignment.instructions}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="glass" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 22 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-2)", marginBottom: 6 }}>Your name</label>
            <input
              className="input"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Full name"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-2)", marginBottom: 6 }}>Dataset (CSV)</label>
            <input type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: "block", marginBottom: 8 }} />
            {!csvText && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setCsvText(SAMPLE_CSV); setFilename("classroom-pulse-sample.csv"); }}>
                  Use sample CSV
                </button>
                <a href="/demo-data/classroom-pulse-sample.csv" download className="btn btn-secondary btn-sm">
                  Download sample
                </a>
              </div>
            )}
            {csvText && (
              <pre style={{ marginTop: 8, padding: "10px 12px", background: "var(--bg-raised)", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", color: "var(--text-2)", overflow: "auto", maxHeight: 160 }}>
                {csvText.slice(0, 400)}{csvText.length > 400 ? "\n…" : ""}
              </pre>
            )}
          </div>

          {error && <div className="callout callout-error">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit and run"}
          </button>
        </div>
      </form>
    </div>
  );
}
