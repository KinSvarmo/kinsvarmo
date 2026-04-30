"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ClassroomAssignment } from "@kingsvarmo/shared";
import { fetchJson } from "@/lib/api";

export default function ClassroomPage() {
  const [assignments, setAssignments] = useState<ClassroomAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<{ assignments: ClassroomAssignment[] }>("/api/classroom/assignments")
      .then((r) => setAssignments(r.assignments))
      .catch((err) => setApiError(err instanceof Error ? err.message : "Failed to load assignments"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 40 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Classroom</p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", marginBottom: 12 }}>Assignments</h1>
          <p style={{ color: "var(--text-2)", maxWidth: 500, lineHeight: 1.6 }}>
            Create assignments for students to submit datasets. Each submission runs through the full agent workflow and returns a traceable result.
          </p>
        </div>
        <Link href="/classroom/new" className="btn btn-primary" style={{ flexShrink: 0 }}>
          Create Assignment
        </Link>
      </div>

      {loading ? (
        <div className="callout callout-info">Loading assignments…</div>
      ) : apiError ? (
        <div className="callout callout-error">Could not load assignments: {apiError}</div>
      ) : assignments.length === 0 ? (
        <div className="glass" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ color: "var(--text-2)", marginBottom: 20 }}>No assignments yet.</p>
          <Link href="/classroom/new" className="btn btn-primary">Create your first assignment</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {assignments.map((a) => (
            <Link key={a.id} href={`/classroom/${a.id}`} style={{ textDecoration: "none" }}>
              <div className="glass" style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", cursor: "pointer" }}>
                <div>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>{a.title}</p>
                  <p style={{ color: "var(--text-2)", fontSize: "0.85rem" }}>{a.className}</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span className="badge badge-muted">{a.submissionIds.length} submission{a.submissionIds.length !== 1 ? "s" : ""}</span>
                  {a.dueDate && (
                    <span style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>Due {a.dueDate}</span>
                  )}
                  <span style={{ color: "var(--teal)", fontSize: "0.85rem" }}>View →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
