"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function JobsPage() {
  const router = useRouter();
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
    <main className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <section className="glass-lg" style={{ padding: 32, maxWidth: 760 }}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>Jobs</p>
        <h1 style={{ fontSize: "2rem", marginBottom: 12 }}>Check job status</h1>
        <p style={{ color: "var(--text-2)", lineHeight: 1.6, marginBottom: 28, maxWidth: 620 }}>
          Paste a job ID to inspect the AXL message log, KeeperHub execution state, module progress, and final result.
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
    </main>
  );
}
