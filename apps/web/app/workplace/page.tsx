"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { WorkplaceAssignment } from "@kingsvarmo/shared";
import { fetchJson } from "@/lib/api";

export default function WorkspacesPage() {
  const [assignments, setAssignments] = useState<WorkplaceAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<{ assignments: WorkplaceAssignment[] }>("/api/workplace/assignments")
      .then((r) => setAssignments(r.assignments))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 40 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Workspaces</p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", marginBottom: 12 }}>Shared analysis tasks</h1>
          <p style={{ color: "var(--text-2)", maxWidth: 500, lineHeight: 1.6 }}>
            Create reusable tasks for teams, cohorts, reviewers, or clients to submit datasets. Each submission runs through the full agent workflow and returns a traceable result.
          </p>
        </div>
        <Link href="/workplace/new" className="btn btn-primary" style={{ flexShrink: 0 }}>
          Create task
        </Link>
      </div>

      {loading ? (
        <div className="callout callout-info">Loading tasks…</div>
      ) : assignments.length === 0 ? (
        <div className="glass" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ color: "var(--text-2)", marginBottom: 20 }}>No shared tasks yet.</p>
          <Link href="/workplace/new" className="btn btn-primary">Create your first task</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {assignments.map((a) => (
            <Link key={a.id} href={`/workplace/${a.id}`} style={{ textDecoration: "none" }}>
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
