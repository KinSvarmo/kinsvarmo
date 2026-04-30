import { NextResponse } from "next/server";
import { getMessages } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const messages = await getMessages(jobId);
  return NextResponse.json({ messages });
}
