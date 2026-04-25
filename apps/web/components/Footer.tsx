import Link from "next/link";

export function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid var(--border)",
      marginTop: "auto",
      padding: "32px 0",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="var(--teal-dim)" stroke="rgba(0,212,170,0.3)" strokeWidth="1"/>
            <path d="M7 14h4l3-7 3 14 3-7h4" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: "0.85rem", color: "var(--text-2)" }}>KinSvarmo © 2026</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {[
            { label: "0G", href: "https://0g.ai", color: "var(--teal)" },
            { label: "Gensyn AXL", href: "https://gensyn.ai", color: "#a78bfa" },
            { label: "KeeperHub", href: "#", color: "#93c5fd" },
          ].map(({ label, href, color }) => (
            <Link key={label} href={href} target="_blank" style={{ fontSize: "0.8rem", color, fontWeight: 600, letterSpacing: "0.03em" }}>
              {label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Docs", href: "/docs" },
            { label: "GitHub", href: "https://github.com" },
          ].map(({ label, href }) => (
            <Link key={label} href={href} style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
