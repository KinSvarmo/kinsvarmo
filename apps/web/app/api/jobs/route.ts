import { NextResponse } from "next/server";
import { JobCreateInput, AnalysisJob } from "@kingsvarmo/shared";
import { setJob, setMessages } from "@/lib/store";

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
      inputMetadata: body.inputMetadata ?? {},
      status: "created",
      paymentStatus: "authorized",
      plannerStatus: "pending",
      analyzerStatus: "pending",
      criticStatus: "pending",
      reporterStatus: "pending",
      createdAt: now,
      updatedAt: now,
    };

    if (body.uploadReference) {
      newJob.uploadReference = body.uploadReference;
    }

    await setJob(jobId, newJob);
    await setMessages(jobId, []);

    return NextResponse.json({ job: newJob });
  } catch (err: unknown) {
    console.error("[POST /api/jobs]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
