import { NextResponse } from "next/server";
import { getAssignment } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    const { assignmentId } = await params;
    const assignment = await getAssignment(assignmentId);

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    return NextResponse.json({ assignment });
  } catch (err: unknown) {
    console.error("[GET /api/classroom/assignments/:id]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
