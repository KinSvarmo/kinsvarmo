import { NextResponse } from "next/server";
import { JobCreateInput, AnalysisJob } from "@kingsvarmo/shared";
import { jobsStore, messagesStore } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as JobCreateInput;
    
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    
    const newJob: AnalysisJob = {
      id: jobId,
      agentId: body.agentId,
      userWallet: body.userWallet,
      filename: body.filename,
      uploadReference: body.uploadReference,
      inputMetadata: body.inputMetadata ?? {},
      status: "created",
      paymentStatus: "paid",
      plannerStatus: "pending",
      analyzerStatus: "pending",
      criticStatus: "pending",
      reporterStatus: "pending",
      createdAt: now,
      updatedAt: now,
    };
    
    jobsStore.set(jobId, newJob);
    messagesStore.set(jobId, []);
    
    return NextResponse.json({ job: newJob });
  } catch (err: unknown) {
    console.error("[POST /api/jobs]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
