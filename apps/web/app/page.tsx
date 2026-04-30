import Link from "next/link";

const actions = [
  {
    title: "Browse agents",
    description: "Open the marketplace and run an existing iNFT agent.",
    href: "/agents",
    label: "Open agents",
  },
  {
    title: "Create agent",
    description: "Publish a new analysis agent and mint it on 0G.",
    href: "/creator",
    label: "Create agent",
  },
  {
    title: "Classroom",
    description: "Create assignments and collect student submissions.",
    href: "/classroom",
    label: "Open classroom",
  },
  {
    title: "Check job",
    description: "Open a job status page by ID to inspect AXL, KeeperHub, and result state.",
    href: "/jobs",
    label: "Find job",
  },
  {
    title: "System status",
    description: "Check API, AXL, KeeperHub, and 0G configuration.",
    href: "/status",
    label: "View status",
  },
];

export default function HomePage() {
  return (
    <main className="container" style={{ paddingTop: 64, paddingBottom: 80 }}>
      <section className="glass-lg" style={{ padding: 32, marginBottom: 24 }}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>KinSvarmo App</p>
        <h1 style={{ fontSize: "2rem", marginBottom: 10 }}>Start a workflow</h1>
        <p style={{ color: "var(--text-2)", maxWidth: 680, lineHeight: 1.6 }}>
          Choose an agent, mint a new one, manage classroom assignments, or check the local demo stack.
        </p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {actions.map((action) => (
          <article key={action.href} className="glass" style={{ padding: 24 }}>
            <h2 style={{ fontSize: "1.05rem", marginBottom: 8 }}>{action.title}</h2>
            <p style={{ color: "var(--text-2)", fontSize: "0.9rem", lineHeight: 1.55, marginBottom: 18 }}>
              {action.description}
            </p>
            <Link href={action.href} className="btn btn-primary btn-sm">
              {action.label}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
