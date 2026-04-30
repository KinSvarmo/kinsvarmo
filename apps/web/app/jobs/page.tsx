"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useJobHistory } from "@/hooks/useJobHistory";

export default function JobsHistoryPage() {
  const router = useRouter();
  const { history, clearHistory } = useJobHistory();
  const [jobId, setJobId] = useState("");

  function openJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = jobId.trim();
    if (!normalized) {
      return;
    }

    router.push(`/jobs/${encodeURIComponent(normalized)}`);
  }

  return (
    <main className="container" style={{ paddingTop: 64, paddingBottom: 80, maxWidth: 900 }}>
      <section className="glass-lg" style={{ padding: 32, marginBottom: 24 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Jobs</p>
        <h1 style={{ fontSize: "2rem", marginBottom: 12 }}>Check job status</h1>
        <p style={{ color: "var(--text-2)", lineHeight: 1.6, marginBottom: 24, maxWidth: 650 }}>
          Open a saved browser job or paste a job ID to inspect the AXL message log, KeeperHub state, module progress, and result.
        </p>

        <form onSubmit={openJob} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            value={jobId}
            onChange={(event) => setJobId(event.target.value)}
            placeholder="job_..."
            style={{
              flex: "1 1 320px",
              minWidth: 0,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text)",
              padding: "0 14px",
              height: 44,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.9rem",
            }}
          />
          <button type="submit" className="btn btn-primary btn-sm" style={{ height: 44 }}>
            Open job
          </button>
        </form>
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <h2 style={{ fontSize: "1.2rem" }}>Local job history</h2>
          {history.length > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                if (confirm("Clear local job history from this browser?")) {
                  clearHistory();
                }
              }}
            >
              Clear history
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="glass" style={{ padding: 32 }}>
            <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>No saved jobs yet</h3>
            <p style={{ color: "var(--text-2)", marginBottom: 20 }}>
              Jobs started from this browser will appear here. You can still paste a job ID above.
            </p>
            <Link href="/agents" className="btn btn-primary btn-sm">
              Browse agents
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {history.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <article className="glass agent-card-hover" style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "1.1rem" }}>
                        {job.filename || "Untitled Dataset"}
                      </span>
                      <span className={`badge ${job.status === "completed" ? "badge-teal" : job.status === "failed" ? "badge-amber" : "badge-blue"}`}>
                        {job.status}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-2)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <span>ID: <span className="font-mono">{job.id.slice(0, 18)}...</span></span>
                      <span>Agent: <span className="font-mono">{job.agentId}</span></span>
                      <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span style={{ color: "var(--teal)", whiteSpace: "nowrap" }}>View</span>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
