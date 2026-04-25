import Link from "next/link";
import { seededAgents } from "@kingsvarmo/shared";

const DOMAIN_EMOJI: Record<string, string> = {
  phytochemistry: "🌿",
  genomics: "🧬",
  materials: "⚗️",
  imaging: "🔬",
  default: "🤖",
};

export const metadata = {
  title: "Browse Agents — KinSvarmo",
  description: "Discover private scientific analysis agents published as iNFTs on 0G.",
};

export default function AgentsPage() {
  // In future this will fetch from /api/agents; for now use seeded data
  const agents = seededAgents;

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Marketplace</p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", marginBottom: 16 }}>Scientific Agents</h1>
        <p style={{ color: "var(--text-2)", maxWidth: 540, lineHeight: 1.6 }}>
          Browse and run private analysis agents published as iNFTs on 0G. Pay per run in OG token — no subscriptions.
        </p>
      </div>

      {/* Filter bar (UI stub) */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
        {["All", "Phytochemistry", "Genomics", "Materials", "Imaging"].map((tag, i) => (
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

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
        {agents.map((agent) => (
          <Link key={agent.id} href={`/agents/${agent.slug}`} style={{ display: "contents" }}>
            <article className="agent-card">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div className="agent-avatar" style={{ fontSize: "1.5rem" }}>
                  {DOMAIN_EMOJI.phytochemistry}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                    <span className="badge badge-teal" style={{ fontSize: "0.68rem" }}>
                      Published
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

              {/* Preview output */}
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
                      ◆ 0G indexed
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
                Run Analysis →
              </div>
            </article>
          </Link>
        ))}

        {/* Coming soon placeholders */}
        {[1, 2].map((i) => (
          <div key={i} className="agent-card" style={{ opacity: 0.4, cursor: "default" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div className="agent-avatar">⚗️</div>
              <div>
                <span className="badge badge-muted" style={{ fontSize: "0.68rem", marginBottom: 4 }}>
                  Coming soon
                </span>
                <div className="skeleton" style={{ width: 160, height: 16, marginTop: 6 }} />
                <div className="skeleton" style={{ width: 100, height: 12, marginTop: 6 }} />
              </div>
            </div>
            <div className="skeleton" style={{ height: 40 }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="skeleton" style={{ width: 80, height: 14 }} />
              <div className="skeleton" style={{ width: 60, height: 16 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
