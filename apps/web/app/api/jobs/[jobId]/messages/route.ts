import { NextResponse } from "next/server";
import { messagesStore } from "@/lib/store";

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const messages = messagesStore.get(jobId) || [];
  
  return NextResponse.json({ messages });
}
