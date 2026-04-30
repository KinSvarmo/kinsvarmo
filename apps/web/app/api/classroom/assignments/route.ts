import { NextResponse } from "next/server";
import type { ClassroomAssignment } from "@kingsvarmo/shared";
import { getAllAssignments, setAssignment, addAssignmentId } from "@/lib/store";

export async function GET() {
  try {
    const assignments = await getAllAssignments();
    return NextResponse.json({ assignments });
  } catch (err: unknown) {
    console.error("[GET /api/classroom/assignments]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ClassroomAssignment>;

    if (!body.title || !body.className || !body.agentId) {
      return NextResponse.json({ error: "title, className and agentId are required" }, { status: 400 });
    }

    const id = `asgn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const assignment: ClassroomAssignment = {
      id,
      teacherWallet: body.teacherWallet ?? "",
      title: body.title,
      className: body.className,
      agentId: body.agentId,
      instructions: body.instructions ?? "",
      ...(body.dueDate ? { dueDate: body.dueDate } : {}),
      submissionIds: [],
      createdAt: new Date().toISOString(),
    };

    await setAssignment(id, assignment);
    await addAssignmentId(id);

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err: unknown) {
    console.error("[POST /api/classroom/assignments]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
