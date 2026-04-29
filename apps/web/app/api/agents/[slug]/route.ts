export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getMintedAgents } from "@/lib/agents";
import { agentsStore } from "@/lib/store";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Check local agents first
    const localAgents = Array.from(agentsStore.values());
    const localMatch = localAgents.find(a => a.slug === slug || a.id === slug);
    if (localMatch) {
      return NextResponse.json({ agent: localMatch });
    }

    // Check minted agents
    const mintedAgents = await getMintedAgents();
    const mintedMatch = mintedAgents.find(a => a.slug === slug || a.onchainTokenId === slug || a.id === slug);
    if (mintedMatch) {
      return NextResponse.json({ agent: mintedMatch });
    }

    return NextResponse.json(
      { error: "agent_not_found" },
      { status: 404 }
    );
  } catch (err: unknown) {
    console.error(`[GET /api/agents/[slug]]`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
