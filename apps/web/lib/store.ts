import { Redis } from "@upstash/redis";
import type { AnalysisJob, AnalysisResult, AxlMessage, ClassroomAssignment, ClassroomSubmission } from "@kingsvarmo/shared";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const TTL = 60 * 60 * 24;

export async function getJob(jobId: string): Promise<AnalysisJob | null> {
  return redis.get<AnalysisJob>(`job:${jobId}`);
}

export async function setJob(jobId: string, job: AnalysisJob): Promise<void> {
  await redis.set(`job:${jobId}`, job, { ex: TTL });
}

export async function getMessages(jobId: string): Promise<AxlMessage[]> {
  return (await redis.get<AxlMessage[]>(`messages:${jobId}`)) ?? [];
}

export async function setMessages(jobId: string, messages: AxlMessage[]): Promise<void> {
  await redis.set(`messages:${jobId}`, messages, { ex: TTL });
}

export async function getResult(jobId: string): Promise<AnalysisResult | null> {
  return redis.get<AnalysisResult>(`result:${jobId}`);
}

export async function setResult(jobId: string, result: AnalysisResult): Promise<void> {
  await redis.set(`result:${jobId}`, result, { ex: TTL });
}

export async function getKeeperHubRun(jobId: string): Promise<unknown> {
  return redis.get(`keeperhub:${jobId}`);
}

export async function setKeeperHubRun(jobId: string, run: unknown): Promise<void> {
  await redis.set(`keeperhub:${jobId}`, run, { ex: TTL });
}

// ── Classroom ─────────────────────────────────────────────────────────────────

export async function getAssignment(id: string): Promise<ClassroomAssignment | null> {
  return redis.get<ClassroomAssignment>(`classroom:assignment:${id}`);
}

export async function setAssignment(id: string, assignment: ClassroomAssignment): Promise<void> {
  await redis.set(`classroom:assignment:${id}`, assignment, { ex: TTL });
}

export async function getAllAssignments(): Promise<ClassroomAssignment[]> {
  const ids = (await redis.get<string[]>("classroom:assignment_ids")) ?? [];
  if (ids.length === 0) return [];
  const results = await Promise.all(ids.map((id) => getAssignment(id)));
  return results.filter((a): a is ClassroomAssignment => a !== null);
}

export async function addAssignmentId(id: string): Promise<void> {
  const ids = (await redis.get<string[]>("classroom:assignment_ids")) ?? [];
  if (!ids.includes(id)) {
    await redis.set("classroom:assignment_ids", [...ids, id], { ex: TTL * 7 });
  }
}

export async function getSubmission(id: string): Promise<ClassroomSubmission | null> {
  return redis.get<ClassroomSubmission>(`classroom:submission:${id}`);
}

export async function setSubmission(id: string, submission: ClassroomSubmission): Promise<void> {
  await redis.set(`classroom:submission:${id}`, submission, { ex: TTL });
}
