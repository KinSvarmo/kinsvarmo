import { NextResponse } from "next/server";
import { resultsStore } from "@/lib/store";

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const result = resultsStore.get(jobId);
  
  if (!result) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }
  
  return NextResponse.json({ result });
}
