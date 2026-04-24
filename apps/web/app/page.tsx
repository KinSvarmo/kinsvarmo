import { seededAgents } from "@kingsvarmo/shared";

export default function HomePage() {
  const [agent] = seededAgents;

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">0G · AXL · KeeperHub</p>
        <h1>KinSvarmo</h1>
        <p className="lede">
          Publish private scientific analysis agents and run auditable dataset
          workflows through a visible swarm.
        </p>
        <div className="actions">
          <a href="/agents">Browse Agents</a>
          <a href="/creator">Create Agent</a>
        </div>
      </section>

      <section className="panel">
        <h2>Seed Agent</h2>
        <p>{agent?.name ?? "Alkaloid Predictor v2"}</p>
        <small>Marketplace and run flow will be implemented next.</small>
      </section>
    </main>
  );
}
