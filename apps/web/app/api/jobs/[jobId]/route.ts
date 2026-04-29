import { NextResponse } from "next/server";
import { jobsStore } from "@/lib/store";

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = jobsStore.get(jobId);
  
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  
  return NextResponse.json({ job });
}
