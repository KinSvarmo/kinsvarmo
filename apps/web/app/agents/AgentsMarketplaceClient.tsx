"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { seededAgents, type AgentListing } from "@kingsvarmo/shared";
import { fetchJson } from "@/lib/api";

const DOMAIN_EMOJI: Record<string, string> = {
  phytochemistry: "🌿",
  toxicology: "⚠️",
  genomics: "🧬",
  materials: "⚗️",
  "research-ops": "📋",
  imaging: "🔬",
  default: "🤖",
};

export function AgentsMarketplaceClient() {
  const [agents, setAgents] = useState<AgentListing[]>(seededAgents);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAgents() {
      try {
        const response = await fetchJson<{ agents: AgentListing[] }>("/api/agents");

        if (!cancelled) {
          setAgents(response.agents);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load API agents");
        }
      }
    }

    void loadAgents();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <div style={{ marginBottom: 40 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Marketplace</p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", marginBottom: 16 }}>Scientific Agents</h1>
        <p style={{ color: "var(--text-2)", maxWidth: 540, lineHeight: 1.6 }}>
          Browse and run private analysis agents. Local demo runs are routed through AXL and tracked by KeeperHub.
        </p>
      </div>

      {error && (
        <div className="callout callout-warn" style={{ marginBottom: 24 }}>
          API marketplace fetch failed, showing built-in seed listings: {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
        {["All", "Phytochemistry", "Toxicology", "Genomics", "Materials", "Research Ops"].map((tag, i) => (
          <button
            key={tag}
            className={`btn btn-sm ${i === 0 ? "btn-primary" : "btn-ghost"}`}
            style={i === 0 ? {} : { color: "var(--text-2)" }}
          >
            {tag}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <input
            className="input"
            placeholder="Search agents…"
            style={{ width: 220, padding: "7px 12px", fontSize: "0.85rem" }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
        {agents.map((agent) => (
          <Link key={agent.id} href={`/agents/${agent.slug}`} style={{ display: "contents" }}>
            <article className="agent-card">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div className="agent-avatar" style={{ fontSize: "1.5rem" }}>
                  {DOMAIN_EMOJI[agent.domain] ?? DOMAIN_EMOJI.default}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                    <span className="badge badge-teal" style={{ fontSize: "0.68rem" }}>
                      Published
                    </span>
                    <span className="badge badge-blue" style={{ fontSize: "0.68rem" }}>
                      Local executable
                    </span>
                    {agent.supportedFormats.map((f) => (
                      <span key={f} className="badge badge-muted" style={{ fontSize: "0.68rem" }}>
                        .{f}
                      </span>
                    ))}
                  </div>
                  <h2 style={{ fontSize: "1rem", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 2 }}>
                    {agent.name}
                  </h2>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>
                    by {agent.creatorName}
                  </p>
                </div>
              </div>

              <p style={{ fontSize: "0.85rem", color: "var(--text-2)", lineHeight: 1.6 }}>
                {agent.description}
              </p>

              <div style={{
                background: "var(--bg-raised)",
                borderRadius: "var(--radius)",
                padding: "10px 14px",
                fontSize: "0.8rem",
                color: "var(--text-2)",
                fontStyle: "italic",
                borderLeft: "2px solid var(--teal-dim)",
              }}>
                {agent.previewOutput}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
                <div style={{ fontSize: "0.78rem", color: "var(--text-3)", display: "flex", gap: 12 }}>
                  <span>⏱ ~{Math.round(agent.runtimeEstimateSeconds / 60)} min</span>
                  {agent.intelligenceReference && (
                    <span style={{ color: "var(--teal)", fontSize: "0.72rem" }}>
                      ◆ indexed
                    </span>
                  )}
                </div>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--teal)",
                }}>
                  {agent.priceIn0G} OG
                </span>
              </div>

              <div className="btn btn-primary" style={{ textAlign: "center", width: "100%" }}>
                View Agent →
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
