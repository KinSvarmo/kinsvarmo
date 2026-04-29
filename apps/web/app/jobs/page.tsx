"use client";

import Link from "next/link";
import { useJobHistory } from "@/hooks/useJobHistory";

export default function JobsHistoryPage() {
  const { history, clearHistory } = useJobHistory();

  return (
    <div className="container" style={{ paddingTop: 64, paddingBottom: 80, maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 32 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Dashboard</p>
          <h1 style={{ fontSize: "2rem" }}>Analysis History</h1>
        </div>
        {history.length > 0 && (
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => {
              if (confirm("Are you sure you want to clear your local job history?")) {
                clearHistory();
              }
            }}
          >
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="glass" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>📭</div>
          <h2 style={{ fontSize: "1.2rem", marginBottom: 8 }}>No jobs found</h2>
          <p style={{ color: "var(--text-2)", marginBottom: 24 }}>
            You haven't run any analysis jobs from this browser yet. Jobs are saved locally since the 0G smart contract only records payment authorization.
          </p>
          <Link href="/agents" className="btn btn-primary">
            Browse Agents
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {history.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <div className="glass agent-card-hover" style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", transition: "transform 0.2s ease, border-color 0.2s ease" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "1.1rem" }}>
                      {job.filename || "Untitled Dataset"}
                    </span>
                    <span className={`badge ${job.status === "completed" ? "badge-teal" : job.status === "failed" ? "badge-error" : "badge-blue"}`}>
                      {job.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-2)", display: "flex", gap: 16 }}>
                    <span>ID: <span className="font-mono">{job.id.slice(0, 12)}...</span></span>
                    <span>Agent: <span className="font-mono">{job.agentId}</span></span>
                    <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ color: "var(--teal)" }}>
                  View →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
