import { NextResponse } from "next/server";
import { getResult } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const result = await getResult(jobId);

  if (!result) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

  return NextResponse.json({ result });
}
