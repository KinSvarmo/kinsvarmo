import { NextResponse } from "next/server";
import { getAssignment } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const assignment = await getAssignment(assignmentId);

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  return NextResponse.json({ assignment });
}
