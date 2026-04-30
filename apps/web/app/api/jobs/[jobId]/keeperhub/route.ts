import { NextResponse } from "next/server";
import { getKeeperHubRun } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const run = await getKeeperHubRun(jobId);

  if (!run) {
    return NextResponse.json({ error: "KeeperHub run not found" }, { status: 404 });
  }

  return NextResponse.json({ run });
}
