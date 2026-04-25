import assert from "node:assert/strict";
import test from "node:test";
import {
  agentModuleNames,
  agentStatuses,
  axlMessageTypes,
  jobStatuses,
  moduleStatuses,
  paymentStatuses,
  seededAgents,
  supportedInputFormats
} from "@kingsvarmo/shared";
import type {
  AnalysisJob,
  AnalysisResult,
  AxlMessage,
  CreatorProfile,
  SponsorIntegrationSnapshot
} from "@kingsvarmo/shared";

test("status constants expose the expected finite model values", () => {
  assert.deepEqual(agentStatuses, ["draft", "published", "paused"]);
  assert.deepEqual(jobStatuses, [
    "created",
    "authorized",
    "planning",
    "analyzing",
    "reviewing",
    "reporting",
    "completed",
    "failed"
  ]);
  assert.deepEqual(moduleStatuses, ["pending", "running", "completed", "failed"]);
  assert.deepEqual(paymentStatuses, ["pending", "authorized", "settled", "failed"]);
  assert.deepEqual(agentModuleNames, ["planner", "analyzer", "critic", "reporter"]);
  assert.deepEqual(supportedInputFormats, ["csv", "json"]);
});

test("AXL message types cover the required MVP workflow", () => {
  assert.deepEqual(axlMessageTypes, [
    "job.created",
    "plan.generated",
    "analysis.started",
    "analysis.completed",
    "critic.reviewed",
    "report.generated",
    "job.failed"
  ]);
});

test("seeded demo agent is usable by marketplace, detail, and run flows", () => {
  assert.equal(seededAgents.length, 1);

  const [agent] = seededAgents;
  assert.ok(agent);
  assert.equal(agent.name, "Alkaloid Predictor v2");
  assert.equal(agent.slug, "alkaloid-predictor-v2");
  assert.equal(agent.status, "published");
  assert.equal(agent.domain, "phytochemistry");
  assert.deepEqual(agent.supportedFormats, ["csv", "json"]);
  assert.match(agent.priceIn0G, /^\d+(\.\d+)?$/);
  assert.ok(agent.runtimeEstimateSeconds > 0);
  assert.match(agent.intelligenceReference ?? "", /^0g:\/\//);
  assert.match(agent.storageReference ?? "", /^0g:\/\//);
});

test("shared types can model one complete demo run", () => {
  const job: AnalysisJob = {
    id: "job_demo_001",
    agentId: "agent_alkaloid_predictor_v2",
    userWallet: "0x0000000000000000000000000000000000000001",
    filename: "alkaloid-sample.csv",
    uploadReference: "0g://placeholder/uploads/job_demo_001",
    inputMetadata: {
      sampleName: "Golden demo sample"
    },
    status: "completed",
    paymentStatus: "authorized",
    plannerStatus: "completed",
    analyzerStatus: "completed",
    criticStatus: "completed",
    reporterStatus: "completed",
    keeperhubRunId: "kh_run_demo_001",
    resultId: "result_demo_001",
    createdAt: "2026-04-24T00:00:00.000Z",
    updatedAt: "2026-04-24T00:02:00.000Z"
  };

  const message: AxlMessage = {
    id: "msg_demo_001",
    jobId: job.id,
    sender: "planner",
    receiver: "analyzer",
    type: "plan.generated",
    payload: {
      route: "phytochemistry-demo"
    },
    timestamp: "2026-04-24T00:00:30.000Z"
  };

  const result: AnalysisResult = {
    id: "result_demo_001",
    jobId: job.id,
    summary: "Demo sample shows modest alkaloid-like screening signals.",
    confidence: 0.82,
    keyFindings: ["Stable retention-time cluster", "No severe data warnings"],
    structuredJson: {
      candidateFamilies: ["indole-like", "quinoline-like"]
    },
    explanation:
      "This deterministic report is scoped for infrastructure demonstration.",
    provenanceId: "prov_demo_001",
    downloadUrl: "/api/results/result_demo_001/download",
    completedAt: "2026-04-24T00:02:00.000Z"
  };

  assert.equal(message.jobId, job.id);
  assert.equal(result.jobId, job.id);
  assert.ok(result.confidence >= 0 && result.confidence <= 1);
});

test("creator and sponsor integration snapshots are represented in shared models", () => {
  const creator: CreatorProfile = {
    id: "creator_demo_001",
    name: "Dr. Mira Solenne",
    wallet: "0x0000000000000000000000000000000000000000",
    bio: "Phytochemistry researcher publishing private analysis agents.",
    publishedAgentIds: ["agent_alkaloid_predictor_v2"]
  };

  const sponsorSnapshot: SponsorIntegrationSnapshot = {
    zeroG: {
      contractAddress: "0x0000000000000000000000000000000000000000",
      tokenId: "1",
      explorerUrl: "https://explorer.example/agent/1",
      intelligenceReference: "0g://placeholder/intelligence/alkaloid-v2",
      storageReference: "0g://placeholder/metadata/alkaloid-v2"
    },
    axl: {
      nodeCount: 4,
      messageCount: 6,
      healthy: true
    },
    keeperHub: {
      runId: "kh_run_demo_001",
      state: "completed",
      logs: ["Workflow completed"],
      updatedAt: "2026-04-24T00:02:00.000Z"
    }
  };

  assert.equal(creator.publishedAgentIds[0], "agent_alkaloid_predictor_v2");
  assert.equal(sponsorSnapshot.axl.nodeCount, 4);
  assert.equal(sponsorSnapshot.keeperHub?.state, "completed");
});
