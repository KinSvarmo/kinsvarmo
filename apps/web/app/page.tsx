import Link from "next/link";
import { seededAgents } from "@kingsvarmo/shared";

const steps = [
  {
    icon: "🔬",
    title: "Researchers Mint",
    desc: "Scientists publish analysis logic as encrypted iNFTs on 0G, protecting their IP while monetizing it.",
  },
  {
    icon: "📤",
    title: "Users Upload",
    desc: "Upload any compatible dataset and get an instant cost quote in 0G token.",
  },
  {
    icon: "🤖",
    title: "Swarm Runs",
    desc: "Planner, Analyzer, Critic and Reporter agents coordinate over Gensyn AXL in real time.",
  },
  {
    icon: "📄",
    title: "Results Delivered",
    desc: "A structured scientific report with confidence scores and 0G provenance references.",
  },
];

const sponsors = [
  { name: "0G", color: "var(--teal)",   badge: "badge-teal",   desc: "Storage · Compute · Chain" },
  { name: "Gensyn AXL", color: "#a78bfa", badge: "badge-violet", desc: "Agent Communication" },
  { name: "KeeperHub",  color: "#93c5fd", badge: "badge-blue",   desc: "Execution Orchestration" },
];

export default function HomePage() {
  const [agent] = seededAgents;

  if (!agent) {
    return null;
  }

  return (
    <>
      {/* ── Hero ── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "100px 0 80px" }}>
        <div className="hero-gradient" />
        <div className="grid-overlay" />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          {/* Sponsor badges */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
            {sponsors.map((s) => (
              <span key={s.name} className={`badge ${s.badge}`}>
                {s.name}
              </span>
            ))}
          </div>

          <h1 style={{ fontSize: "clamp(3rem, 7vw, 5.5rem)", marginBottom: 24, maxWidth: 860 }}>
            Scientific Agents<br />as Private{" "}
            <span style={{ color: "var(--teal)" }}>iNFTs</span>
          </h1>

          <p style={{ fontSize: "1.2rem", color: "var(--text-2)", maxWidth: 600, lineHeight: 1.6, marginBottom: 40 }}>
            Researchers publish encrypted analysis agents on&nbsp;0G. Users pay in 0G token,
            trigger the swarm, and receive auditable scientific results.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/agents" className="btn btn-primary btn-lg">
              Browse Agents →
            </Link>
            <Link href="/creator" className="btn btn-secondary btn-lg">
              Mint your iNFT
            </Link>
          </div>

          {/* Live agent preview card */}
          <div className="glass" style={{ marginTop: 64, padding: 24, maxWidth: 480, display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div className="agent-avatar">🌿</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "0.98rem" }}>
                  {agent.name}
                </span>
                <span className="badge badge-teal" style={{ fontSize: "0.7rem" }}>Published</span>
              </div>
              <p style={{ fontSize: "0.83rem", color: "var(--text-2)", marginBottom: 12, lineHeight: 1.5 }}>
                {agent.description}
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>
                  by {agent.creatorName}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.9rem", color: "var(--teal)", fontWeight: 700 }}>
                  {agent.priceIn0G} OG
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sponsor section ── */}
      <section className="section-sm" style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="container">
          <p className="eyebrow" style={{ textAlign: "center", marginBottom: 24 }}>Powered by</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
            {sponsors.map((s) => (
              <div key={s.name} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: s.color, marginBottom: 4 }}>
                  {s.name}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="section">
        <div className="container">
          <p className="eyebrow" style={{ marginBottom: 12 }}>How it works</p>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", marginBottom: 48 }}>
            Four steps to auditable science
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {steps.map((step, i) => (
              <div key={i} className="glass" style={{ padding: 28 }}>
                <div style={{ fontSize: "2rem", marginBottom: 16 }}>{step.icon}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--teal)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                  Step {i + 1}
                </div>
                <h3 style={{ fontSize: "1rem", marginBottom: 10, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-2)", lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-sm">
        <div className="container" style={{ textAlign: "center" }}>
          <div className="glass-lg" style={{ padding: "56px 32px", position: "relative", overflow: "hidden" }}>
            <div className="hero-gradient" />
            <div style={{ position: "relative", zIndex: 1 }}>
              <p className="eyebrow" style={{ marginBottom: 16 }}>Start now</p>
              <h2 style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", marginBottom: 16 }}>
                Ready to run private analysis on 0G?
              </h2>
              <p style={{ color: "var(--text-2)", marginBottom: 32, maxWidth: 480, margin: "0 auto 32px" }}>
                Connect your wallet, browse agents, and launch your first analysis in minutes.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/agents" className="btn btn-primary btn-lg">Browse Agents</Link>
                <Link href="/creator" className="btn btn-secondary btn-lg">Publish an Agent</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
