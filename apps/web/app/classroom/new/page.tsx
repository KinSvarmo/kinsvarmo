"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { seededAgents } from "@kingsvarmo/shared";
import { fetchJson } from "@/lib/api";
import type { ClassroomAssignment } from "@kingsvarmo/shared";

export default function NewAssignmentPage() {
  const router = useRouter();
  const { address } = useAccount();

  const [title, setTitle] = useState("");
  const [className, setClassName] = useState("");
  const [agentId, setAgentId] = useState(seededAgents[0]?.id ?? "");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { assignment } = await fetchJson<{ assignment: ClassroomAssignment }>(
        "/api/classroom/assignments",
        {
          method: "POST",
          body: JSON.stringify({
            title,
            className,
            agentId,
            instructions,
            dueDate: dueDate || undefined,
            teacherWallet: address ?? "",
          }),
        }
      );
      router.push(`/classroom/${assignment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create assignment");
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 640 }}>
      <p className="eyebrow" style={{ marginBottom: 8 }}>Classroom</p>
      <h1 style={{ fontSize: "1.8rem", marginBottom: 32 }}>New Assignment</h1>

      <form onSubmit={handleSubmit}>
        <div className="glass" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 22 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-2)", marginBottom: 6 }}>Assignment title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dose response lab"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-2)", marginBottom: 6 }}>Class name</label>
            <input
              className="input"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. CHEM 301"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-2)", marginBottom: 6 }}>Agent</label>
            <select
              className="input"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              required
            >
              {seededAgents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-2)", marginBottom: 6 }}>Instructions for students</label>
            <textarea
              className="input"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Upload your CSV and compare confidence scores across the class."
              rows={3}
              style={{ resize: "vertical" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-2)", marginBottom: 6 }}>Due date (optional)</label>
            <input
              className="input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {error && (
            <div className="callout callout-error">{error}</div>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Creating…" : "Create Assignment"}
          </button>
        </div>
      </form>
    </div>
  );
}
