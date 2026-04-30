export interface ClassroomAssignment {
  id: string;
  teacherWallet: string;
  title: string;
  className: string;
  agentId: string;
  instructions: string;
  dueDate?: string;
  submissionIds: string[];
  createdAt: string;
}

export interface ClassroomSubmission {
  id: string;
  assignmentId: string;
  studentName: string;
  studentWallet?: string;
  filename: string;
  jobId?: string;
  resultId?: string;
  status: "created" | "submitted" | "running" | "completed" | "failed";
  createdAt: string;
}

export type WorkplaceAssignment = ClassroomAssignment;
export type WorkplaceSubmission = ClassroomSubmission;
