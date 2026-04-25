import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  createDemoPlan,
  createDemoReport,
  parsePhytochemistryCsv,
  phytochemistryDemoDataset,
  reviewDemoAnalysis,
  runDemoAnalysis,
  runFullDemoAnalysis
} from "@kingsvarmo/agents";
import type { AnalysisJob } from "@kingsvarmo/shared";

const demoJob: AnalysisJob = {
  id: "job_deterministic_demo",
  agentId: "agent_alkaloid_predictor_v2",
  userWallet: "0x0000000000000000000000000000000000000001",
  filename: "alkaloid-sample.csv",
  inputMetadata: {
    sampleName: "Golden deterministic sample"
  },
  status: "planning",
  paymentStatus: "authorized",
  plannerStatus: "running",
  analyzerStatus: "pending",
  criticStatus: "pending",
  reporterStatus: "pending",
  createdAt: "2026-04-24T00:00:00.000Z",
  updatedAt: "2026-04-24T00:00:00.000Z"
};

test("demo dataset file matches the embedded deterministic dataset", () => {
  const fileDataset = readFileSync(
    join(process.cwd(), "demo-data/alkaloid-sample.csv"),
    "utf8"
  ).trim();

  assert.equal(fileDataset, phytochemistryDemoDataset);
});

test("phytochemistry CSV parser returns stable records", () => {
  const records = parsePhytochemistryCsv(phytochemistryDemoDataset);

  assert.equal(records.length, 4);
  assert.deepEqual(records[0], {
    sampleId: "KS-001",
    compoundHint: "indole-like",
    retentionTimeMin: 1.24,
    signalArea: 1800,
    normalizedIntensity: 0.71,
    missingValues: 0
  });
});

test("deterministic analysis produces the same report every time", () => {
  const first = runFullDemoAnalysis({
    job: demoJob
  });
  const second = runFullDemoAnalysis({
    job: demoJob
  });

  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    jobId: "job_deterministic_demo",
    summary: "Demo sample shows modest alkaloid-like screening signals.",
    confidence: 0.76,
    keyFindings: [
      "3 candidate alkaloid-like signals detected",
      "Top families: indole-like, quinoline-like, isoquinoline-like",
      "Confidence score: 0.76"
    ],
    structuredJson: {
      route: "phytochemistry-demo",
      candidateFamilies: [
        "indole-like",
        "quinoline-like",
        "isoquinoline-like",
        "piperidine-like"
      ],
      metrics: {
        sampleCount: 4,
        candidateSignals: 3,
        meanNormalizedIntensity: 0.735,
        maxSignalArea: 2400,
        missingValueCount: 1,
        normalizedConfidence: 0.76
      },
      warnings: [
        "One demo row contains a missing-value flag; confidence is reduced modestly",
        "Demo result is deterministic and not a clinical or publication-grade claim"
      ]
    },
    provenanceId: "prov_job_deterministic_demo"
  });
});

test("planner, analyzer, critic, and reporter can be run as separate deterministic steps", () => {
  const plan = createDemoPlan({
    job: demoJob
  });
  const analysis = runDemoAnalysis(plan);
  const review = reviewDemoAnalysis(analysis);
  const report = createDemoReport(review);

  assert.equal(plan.sampleCount, 4);
  assert.equal(analysis.metrics.candidateSignals, 3);
  assert.equal(review.confidence, 0.76);
  assert.equal(report.provenanceId, "prov_job_deterministic_demo");
});
