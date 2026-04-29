export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getMintedAgents } from "@/lib/agents";
import { agentsStore } from "@/lib/store";
import type { AgentListing } from "@kingsvarmo/shared";

export async function GET() {
  try {
    const mintedAgents = await getMintedAgents();
    const localAgents = Array.from(agentsStore.values());
    
    // Combine, putting local agents first, or minted agents first depending on preference.
    // Minted agents are the real iNFTs, local ones are demos published in this session.
    const combinedAgents = [...localAgents, ...mintedAgents];

    return NextResponse.json({ agents: combinedAgents });
  } catch (err: unknown) {
    console.error("[GET /api/agents]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Simulate a local publish
    const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    
    const newAgent: AgentListing = {
      id: `local_${Date.now()}`,
      name: body.name,
      slug: slug,
      creatorName: body.creatorName,
      creatorWallet: body.creatorWallet || "local-demo-creator",
      description: body.description,
      longDescription: body.longDescription || body.description,
      domain: body.domain || "research-ops",
      supportedFormats: body.supportedFormats || ["csv"],
      priceIn0G: body.priceIn0G || "0.01",
      runtimeEstimateSeconds: Number(body.runtimeEstimateSeconds) || 90,
      status: "published",
      previewOutput: body.previewOutput || "Deterministic local report",
      expectedOutput: body.expectedOutput || "A deterministic report with confidence, key findings, and structured JSON.",
      promptTemplate: body.promptTemplate,
      privacyNotes: body.privacyNotes || "Local demo listing.",
      createdAt: new Date().toISOString(),
    };

    agentsStore.set(newAgent.id, newAgent);

    return NextResponse.json({ agent: newAgent });
  } catch (err: unknown) {
    console.error("[POST /api/agents]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
