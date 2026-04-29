import { NextResponse } from "next/server";
import { keeperHubStore } from "@/lib/store";

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const run = keeperHubStore.get(jobId);
  
  if (!run) {
    return NextResponse.json({ error: "KeeperHub run not found" }, { status: 404 });
  }
  
  return NextResponse.json({ run });
}
