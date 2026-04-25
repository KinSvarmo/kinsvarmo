"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { ogTestnet } from "@/lib/chain";

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function Nav() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const wrongChain = isConnected && chainId !== ogTestnet.id;

  const links = [
    { href: "/agents",  label: "Browse Agents" },
    { href: "/creator", label: "Mint iNFT" },
  ];

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(7,11,16,0.85)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", height: 60, gap: 32 }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="var(--teal-dim)" stroke="rgba(0,212,170,0.3)" strokeWidth="1"/>
            <path d="M7 14h4l3-7 3 14 3-7h4" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          KinSvarmo
        </Link>

        {/* Nav links */}
        <nav style={{ display: "flex", gap: 4, flex: 1 }}>
          {links.map(({ href, label }) => (
            <Link key={href} href={href} style={{
              padding: "6px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.88rem",
              fontWeight: 500,
              color: pathname === href ? "var(--teal)" : "var(--text-2)",
              background: pathname === href ? "var(--teal-dim)" : "transparent",
              transition: "all 0.15s",
            }}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Wallet area */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {wrongChain && (
            <button
              onClick={() => switchChain({ chainId: ogTestnet.id })}
              className="btn btn-sm"
              style={{ background: "rgba(245,158,11,0.15)", color: "var(--amber)", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              Switch to 0G
            </button>
          )}

          {isConnected ? (
            <button onClick={() => disconnect()} className="btn btn-secondary btn-sm" title="Click to disconnect">
              <span className="status-dot running" style={{ color: "var(--teal)" }} />
              {truncate(address!)}
            </button>
          ) : (
            <button onClick={() => connect({ connector: injected() })} className="btn btn-primary btn-sm">
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
