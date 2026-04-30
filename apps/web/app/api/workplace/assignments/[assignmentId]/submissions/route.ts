import { NextResponse } from "next/server";
import type { WorkplaceSubmission } from "@kingsvarmo/shared";
import { getAssignment, setAssignment, getSubmission, setSubmission, setJob, setMessages } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const assignment = await getAssignment(assignmentId);

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const submissions = await Promise.all(
    assignment.submissionIds.map((id) => getSubmission(id))
  );

  return NextResponse.json({
    submissions: submissions.filter((s): s is WorkplaceSubmission => s !== null),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    const { assignmentId } = await params;
    const assignment = await getAssignment(assignmentId);

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const body = (await req.json()) as { studentName?: string; studentWallet?: string; filename?: string; csvText?: string };

    if (!body.studentName || !body.filename) {
      return NextResponse.json({ error: "studentName and filename are required" }, { status: 400 });
    }

    // Create the job using the assignment's agent
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    await setJob(jobId, {
      id: jobId,
      agentId: assignment.agentId,
      userWallet: body.studentWallet ?? "",
      filename: body.filename,
      inputMetadata: { csvText: body.csvText ?? "", studentName: body.studentName, assignmentId },
      status: "created",
      paymentStatus: "authorized",
      plannerStatus: "pending",
      analyzerStatus: "pending",
      criticStatus: "pending",
      reporterStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await setMessages(jobId, []);

    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const submission: WorkplaceSubmission = {
      id: submissionId,
      assignmentId,
      studentName: body.studentName,
      ...(body.studentWallet ? { studentWallet: body.studentWallet } : {}),
      filename: body.filename,
      jobId,
      status: "submitted",
      createdAt: now,
    };

    await setSubmission(submissionId, submission);
    await setAssignment(assignmentId, {
      ...assignment,
      submissionIds: [...assignment.submissionIds, submissionId],
    });

    return NextResponse.json({ submission, jobId }, { status: 201 });
  } catch (err: unknown) {
    console.error("[POST /api/workplace/assignments/:id/submissions]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
