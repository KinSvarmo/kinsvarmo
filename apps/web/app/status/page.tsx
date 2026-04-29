"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api";

type HealthResponse = {
  ok: boolean;
  service: string;
  axl?: {
    configured?: string[];
    healthy?: boolean;
    nodes?: Record<string, boolean>;
  };
  keeperHub?: {
    configured?: boolean;
    mode?: string;
    healthy?: boolean;
  };
  zeroG?: ZeroGStatus;
};

type ZeroGStatus = {
  configured: boolean;
  chain: {
    configured: boolean;
    rpcUrl?: string;
    explorerUrl?: string;
    missing: string[];
  };
  storage: {
    configured: boolean;
    endpoint?: string;
    missing: string[];
  };
  compute: {
    configured: boolean;
    providerAddress?: string;
    serviceUrl?: string;
    model?: string;
    hasSecret: boolean;
    missing: string[];
  };
  contracts: {
    configured: boolean;
    agentRegistryAddress?: string;
    usageAuthorizationAddress?: string;
    missing: string[];
  };
};

export default function StatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetchJson<HealthResponse>("/health");

        if (!cancelled) {
          setHealth(response);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setHealth(null);
          setError(caught instanceof Error ? caught.message : "Unable to fetch API health");
        }
      }
    }

    void refresh();
    const interval = window.setInterval(() => void refresh(), 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <p className="eyebrow" style={{ marginBottom: 10 }}>System</p>
      <h1 style={{ fontSize: "2rem", marginBottom: 12 }}>Demo Health</h1>
      <p style={{ color: "var(--text-2)", lineHeight: 1.6, marginBottom: 28, maxWidth: 620 }}>
        Live status for the local API, AXL node configuration, and KeeperHub workflow adapter.
      </p>

      {error && (
        <div className="callout callout-error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <StatusCard
          title="API"
          status={health?.ok ? "healthy" : "unavailable"}
          rows={[
            ["Service", health?.service ?? "unknown"]
          ]}
        />
        <StatusCard
          title="AXL"
          status={health?.axl?.healthy ? "healthy" : "check"}
          rows={[
            ["Configured", String(health?.axl?.configured?.length ?? 0)],
            ...Object.entries(health?.axl?.nodes ?? {}).map(([node, ok]) => [node, ok ? "online" : "offline"] as [string, string])
          ]}
        />
        <StatusCard
          title="KeeperHub"
          status={health?.keeperHub?.healthy ? "healthy" : "check"}
          rows={[
            ["Configured", health?.keeperHub?.configured ? "yes" : "no"],
            ["Mode", health?.keeperHub?.mode ?? "unknown"]
          ]}
        />
        <StatusCard
          title="0G"
          status={health?.zeroG?.configured ? "healthy" : "check"}
          rows={[
            ["Chain", health?.zeroG?.chain.configured ? "configured" : `missing ${health?.zeroG?.chain.missing.length ?? 0}`],
            ["Storage", health?.zeroG?.storage.configured ? "configured" : `missing ${health?.zeroG?.storage.missing.length ?? 0}`],
            ["Compute", health?.zeroG?.compute.configured ? "configured" : `missing ${health?.zeroG?.compute.missing.length ?? 0}`],
            ["Contracts", health?.zeroG?.contracts.configured ? "configured" : `missing ${health?.zeroG?.contracts.missing.length ?? 0}`]
          ]}
        />
      </div>
    </div>
  );
}

function StatusCard({ title, status, rows }: { title: string; status: string; rows: Array<[string, string]> }) {
  return (
    <section className="glass" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <p className="eyebrow">{title}</p>
        <span className={status === "healthy" ? "badge badge-teal" : "badge badge-amber"}>{status}</span>
      </div>
      <div className="job-detail-list">
        {rows.map(([label, value]) => (
          <div key={label} className="job-detail-row">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
