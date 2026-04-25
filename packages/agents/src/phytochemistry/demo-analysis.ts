import type { AnalysisJob } from "@kingsvarmo/shared";

export const phytochemistryDemoDataset = `sample_id,compound_hint,retention_time_min,signal_area,normalized_intensity,missing_values
KS-001,indole-like,1.24,1800,0.71,0
KS-002,quinoline-like,2.48,2400,0.82,0
KS-003,isoquinoline-like,3.17,1600,0.64,1
KS-004,piperidine-like,4.05,2100,0.77,0`;

export interface PhytochemistryRecord {
  sampleId: string;
  compoundHint: string;
  retentionTimeMin: number;
  signalArea: number;
  normalizedIntensity: number;
  missingValues: number;
}

export interface DemoPlanOutput {
  jobId: string;
  route: "phytochemistry-demo";
  acceptedFormat: "csv" | "json";
  steps: string[];
  datasetText: string;
  sampleCount: number;
}

export interface DemoAnalysisOutput {
  jobId: string;
  route: "phytochemistry-demo";
  observations: string[];
  candidateFamilies: string[];
  metrics: {
    sampleCount: number;
    candidateSignals: number;
    meanNormalizedIntensity: number;
    maxSignalArea: number;
    missingValueCount: number;
    normalizedConfidence: number;
  };
}

export interface DemoCriticOutput {
  jobId: string;
  route: "phytochemistry-demo";
  confidence: number;
  warnings: string[];
  reviewedObservations: string[];
  candidateFamilies: string[];
  metrics: DemoAnalysisOutput["metrics"];
}

export interface DemoReportOutput {
  jobId: string;
  summary: string;
  confidence: number;
  keyFindings: string[];
  structuredJson: {
    route: "phytochemistry-demo";
    candidateFamilies: string[];
    metrics: DemoAnalysisOutput["metrics"];
    warnings: string[];
  };
  provenanceId: string;
}

export function createDemoPlan(input: {
  job: AnalysisJob;
  datasetText?: string;
}): DemoPlanOutput {
  const datasetText = input.datasetText ?? phytochemistryDemoDataset;
  const records = parsePhytochemistryCsv(datasetText);

  return {
    jobId: input.job.id,
    route: "phytochemistry-demo",
    acceptedFormat: inferAcceptedFormat(input.job.filename),
    steps: [
      "validate supported phytochemistry input",
      "parse deterministic screening dataset",
      "score alkaloid-like signal families",
      "review confidence and warnings",
      "prepare auditable report"
    ],
    datasetText,
    sampleCount: records.length
  };
}

export function runDemoAnalysis(plan: DemoPlanOutput): DemoAnalysisOutput {
  const records = parsePhytochemistryCsv(plan.datasetText);
  const candidateFamilies = [...new Set(records.map((record) => record.compoundHint))];
  const candidateSignals = records.filter(
    (record) => record.normalizedIntensity >= 0.7
  ).length;
  const meanNormalizedIntensity = round(
    average(records.map((record) => record.normalizedIntensity)),
    3
  );
  const maxSignalArea = Math.max(...records.map((record) => record.signalArea));
  const missingValueCount = records.reduce(
    (sum, record) => sum + record.missingValues,
    0
  );
  const normalizedConfidence = round(
    0.58 + candidateSignals * 0.07 - missingValueCount * 0.03,
    2
  );

  return {
    jobId: plan.jobId,
    route: "phytochemistry-demo",
    observations: [
      `${candidateSignals} alkaloid-like signals met the deterministic intensity threshold`,
      `Mean normalized intensity was ${meanNormalizedIntensity}`,
      `Largest signal area was ${maxSignalArea}`
    ],
    candidateFamilies,
    metrics: {
      sampleCount: records.length,
      candidateSignals,
      meanNormalizedIntensity,
      maxSignalArea,
      missingValueCount,
      normalizedConfidence
    }
  };
}

export function reviewDemoAnalysis(analysis: DemoAnalysisOutput): DemoCriticOutput {
  const warnings =
    analysis.metrics.missingValueCount > 0
      ? [
          "One demo row contains a missing-value flag; confidence is reduced modestly",
          "Demo result is deterministic and not a clinical or publication-grade claim"
        ]
      : ["Demo result is deterministic and not a clinical or publication-grade claim"];

  return {
    jobId: analysis.jobId,
    route: analysis.route,
    confidence: analysis.metrics.normalizedConfidence,
    warnings,
    reviewedObservations: analysis.observations,
    candidateFamilies: analysis.candidateFamilies,
    metrics: analysis.metrics
  };
}

export function createDemoReport(review: DemoCriticOutput): DemoReportOutput {
  return {
    jobId: review.jobId,
    summary: "Demo sample shows modest alkaloid-like screening signals.",
    confidence: review.confidence,
    keyFindings: [
      `${review.metrics.candidateSignals} candidate alkaloid-like signals detected`,
      `Top families: ${review.candidateFamilies.slice(0, 3).join(", ")}`,
      `Confidence score: ${review.confidence.toFixed(2)}`
    ],
    structuredJson: {
      route: review.route,
      candidateFamilies: review.candidateFamilies,
      metrics: review.metrics,
      warnings: review.warnings
    },
    provenanceId: `prov_${review.jobId}`
  };
}

export function runFullDemoAnalysis(input: {
  job: AnalysisJob;
  datasetText?: string;
}): DemoReportOutput {
  return createDemoReport(
    reviewDemoAnalysis(runDemoAnalysis(createDemoPlan(input)))
  );
}

export function parsePhytochemistryCsv(csvText: string): PhytochemistryRecord[] {
  const [headerLine, ...lines] = csvText.trim().split(/\r?\n/);

  if (!headerLine) {
    return [];
  }

  const headers = headerLine.split(",").map((header) => header.trim());

  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = line.split(",").map((value) => value.trim());
      const row = Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""])
      );

      return {
        sampleId: requireString(row.sample_id, "sample_id"),
        compoundHint: requireString(row.compound_hint, "compound_hint"),
        retentionTimeMin: requireNumber(
          row.retention_time_min,
          "retention_time_min"
        ),
        signalArea: requireNumber(row.signal_area, "signal_area"),
        normalizedIntensity: requireNumber(
          row.normalized_intensity,
          "normalized_intensity"
        ),
        missingValues: requireNumber(row.missing_values, "missing_values")
      };
    });
}

function inferAcceptedFormat(filename: string): "csv" | "json" {
  return filename.toLowerCase().endsWith(".json") ? "json" : "csv";
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required demo dataset field: ${field}`);
  }

  return value;
}

function requireNumber(value: unknown, field: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric demo dataset field: ${field}`);
  }

  return parsed;
}
