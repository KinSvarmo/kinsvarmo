"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { AnalysisResult } from "@kingsvarmo/shared";
import { API_BASE_URL, fetchJson } from "@/lib/api";

type ResultResponse = {
  result: AnalysisResult;
};

export default function ResultPage({ params }: { params: Promise<{ resultId: string }> }) {
  const { resultId } = use(params);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadResult() {
      try {
        const response = await fetchJson<ResultResponse>(`/api/results/${resultId}`);

        if (!cancelled) {
          setResult(response.result);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load result");
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void loadResult();

    return () => {
      cancelled = true;
    };
  }, [resultId]);

  if (!loaded && !result) {
    return (
      <div className="container" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div className="glass-lg" style={{ padding: 32 }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Result</p>
          <h1 style={{ fontSize: "1.8rem", marginBottom: 8 }}>Loading report</h1>
          <p style={{ color: "var(--text-2)" }}>Fetching the final AXL reporter output and provenance record.</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="container" style={{ paddingTop: 80, paddingBottom: 80, maxWidth: 720 }}>
        <div className="glass-lg" style={{ padding: 32 }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Result</p>
          <h1 style={{ fontSize: "1.8rem", marginBottom: 12 }}>Report unavailable</h1>
          <div className="callout callout-error" style={{ marginBottom: 20 }}>
            {error ?? "Result not found"}
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
        <Link href={`/jobs/${result.jobId}`} style={{ color: "var(--text-3)" }}>Job</Link>
        <span>/</span>
        <span style={{ color: "var(--text)" }}>Result</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 24, alignItems: "start" }}>
        <main className="glass-lg" style={{ padding: 32 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>Final Scientific Report</p>
          <h1 style={{ fontSize: "2rem", marginBottom: 14 }}>{result.summary}</h1>
          <p style={{ color: "var(--text-2)", lineHeight: 1.7, marginBottom: 28 }}>
            {result.explanation}
          </p>

          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: "1.1rem", marginBottom: 12 }}>Key Findings</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {result.keyFindings.map((finding) => (
                <div key={finding} className="keeperhub-node-row">
                  <span>{finding}</span>
                  <strong>observed</strong>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: "1.1rem", marginBottom: 12 }}>Structured Output</h2>
            <pre className="result-json">
              {JSON.stringify(result.structuredJson, null, 2)}
            </pre>
          </section>
        </main>

        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="glass" style={{ padding: 22 }}>
            <p className="eyebrow" style={{ marginBottom: 12 }}>Report Metrics</p>
            <div className="job-detail-list">
              <Detail label="Confidence" value={`${Math.round(result.confidence * 100)}%`} />
              <Detail label="Job ID" value={result.jobId} monospace />
              <Detail label="Provenance" value={result.provenanceId} monospace />
              <Detail label="Completed" value={formatDate(result.completedAt)} />
            </div>
          </section>

          <section className="glass" style={{ padding: 22 }}>
            <p className="eyebrow" style={{ marginBottom: 12 }}>Actions</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href={`${API_BASE_URL}/api/results/${result.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                Open Result JSON
              </a>
              <a href={`${API_BASE_URL}/api/results/${result.id}/download`} className="btn btn-secondary btn-sm">
                Download Report
              </a>
              <Link href={`/jobs/${result.jobId}`} className="btn btn-secondary btn-sm">
                Back to Job Status
              </Link>
              <Link href="/agents/1" className="btn btn-ghost btn-sm">
                Rerun Demo Agent
              </Link>
            </div>
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

function formatDate(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}
