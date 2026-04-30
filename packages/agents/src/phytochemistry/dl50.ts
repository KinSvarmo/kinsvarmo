import type { AnalysisJob } from "@kingsvarmo/shared";

export interface Dl50Record {
  dose: number;
  response: number;
  total: number;
}

export interface Dl50PlanOutput {
  jobId: string;
  route: "phytochemistry-dl50";
  steps: string[];
  datasetText: string;
  records: Dl50Record[];
}

export interface Dl50AnalysisOutput {
  jobId: string;
  route: "phytochemistry-dl50";
  estimatedDl50: number;
  method: "log-dose interpolation" | "linear interpolation";
  responseWindow: {
    lowerDose: number;
    lowerResponseRate: number;
    upperDose: number;
    upperResponseRate: number;
  };
  observations: string[];
  metrics: {
    sampleCount: number;
    minDose: number;
    maxDose: number;
    minResponseRate: number;
    maxResponseRate: number;
    confidence: number;
  };
}

export interface Dl50CriticOutput {
  jobId: string;
  route: "phytochemistry-dl50";
  confidence: number;
  warnings: string[];
  observations: string[];
  estimatedDl50: number;
  method: Dl50AnalysisOutput["method"];
  responseWindow: Dl50AnalysisOutput["responseWindow"];
  metrics: Dl50AnalysisOutput["metrics"];
}

export interface Dl50ReportOutput {
  jobId: string;
  summary: string;
  confidence: number;
  keyFindings: string[];
  structuredJson: {
    route: "phytochemistry-dl50";
    estimatedDl50: number;
    method: Dl50AnalysisOutput["method"];
    responseWindow: Dl50AnalysisOutput["responseWindow"];
    observations: string[];
    warnings: string[];
    metrics: Dl50AnalysisOutput["metrics"];
  };
  provenanceId: string;
}

export interface Dl50InferenceRequest {
  jobId: string;
  datasetText: string;
  filename?: string;
  agentName?: string;
  promptTemplate?: string;
}

export interface Dl50InferenceResult {
  summary: string;
  confidence: number;
  keyFindings: string[];
  structuredJson: Record<string, unknown>;
  model?: string;
}

export function buildDl50InferenceMessages(input: Dl50InferenceRequest): { system: string; user: string } {
  return {
    system:
      input.promptTemplate ??
      "You are a careful scientific data analyst. Review dose-response CSV data and return concise JSON.",
    user: [
      `Job ID: ${input.jobId}`,
      `Agent: ${input.agentName ?? "DL50 analysis agent"}`,
      `Filename: ${input.filename ?? "dataset.csv"}`,
      "",
      "Analyze the dataset and respond only with JSON shaped as:",
      JSON.stringify({
        summary: "short result summary",
        confidence: 0.82,
        keyFindings: ["finding one", "finding two"],
        structuredJson: {
          estimatedDl50: 0,
          method: "brief method",
          warnings: ["warning if any"]
        }
      }),
      "",
      "Dataset:",
      input.datasetText
    ].join("\n")
  };
}

export function parseDl50InferenceResponse(content: string): Dl50InferenceResult {
  const parsed = parseJsonObject(content);
  const summary = getString(parsed.summary) ?? "0G Compute completed DL50 analysis.";
  const confidence = clamp(getNumber(parsed.confidence) ?? 0.82, 0, 1);
  const keyFindings = getStringArray(parsed.keyFindings);
  const structuredJson = isRecord(parsed.structuredJson) ? parsed.structuredJson : parsed;

  return {
    summary,
    confidence,
    keyFindings: keyFindings.length > 0 ? keyFindings : [`Confidence score: ${confidence.toFixed(2)}`],
    structuredJson
  };
}

export function createDl50Plan(input: {
  job: AnalysisJob;
  datasetText?: string;
}): Dl50PlanOutput {
  const datasetText = input.datasetText ?? "";
  const records = parseDl50Csv(datasetText);

  return {
    jobId: input.job.id,
    route: "phytochemistry-dl50",
    steps: [
      "validate dose-response CSV columns",
      "parse dose, response, and total counts",
      "estimate LD50 from the 50% response window",
      "review confidence and data coverage",
      "prepare result summary and provenance"
    ],
    datasetText,
    records
  };
}

export function runDl50Analysis(plan: Dl50PlanOutput): Dl50AnalysisOutput {
  const records = [...plan.records].sort((left, right) => left.dose - right.dose);
  if (records.length === 0) {
    throw new Error("No dose-response rows were found in the dataset.");
  }

  const responseRates = records.map((record) => record.response / record.total);
  const target = 0.5;
  const exactMatch = records.find((record) => record.response / record.total === target);

  if (exactMatch) {
    return buildAnalysis(plan.jobId, records, exactMatch.dose, "linear interpolation", target, target, target, [
      `Exact 50% response observed at dose ${formatNumber(exactMatch.dose)}`
    ]);
  }

  const upperIndex = responseRates.findIndex((rate) => rate >= target);
  if (upperIndex === -1) {
    throw new Error("The dataset never reaches a 50% response, so LD50 cannot be estimated.");
  }

  const lowerIndex = Math.max(0, upperIndex - 1);
  const lower = records[lowerIndex]!;
  const upper = records[upperIndex]!;
  const lowerRate = responseRates[lowerIndex]!;
  const upperRate = responseRates[upperIndex]!;

  if (upperRate === lowerRate) {
    throw new Error("Cannot estimate LD50 from a flat response window.");
  }

  const method =
    lower.dose > 0 && upper.dose > 0 ? "log-dose interpolation" : "linear interpolation";
  const estimatedDl50 = interpolateDl50(lower.dose, lowerRate, upper.dose, upperRate, target, method);
  const confidence = estimateConfidence(records, lowerRate, upperRate);
  const observations = [
    `Response rises from ${formatPercent(lowerRate)} at dose ${formatNumber(lower.dose)} to ${formatPercent(upperRate)} at dose ${formatNumber(upper.dose)}`,
    `Estimated LD50 is ${formatNumber(estimatedDl50)} using ${method}`,
    `Total subjects analyzed: ${records.reduce((sum, record) => sum + record.total, 0)}`
  ];

  return buildAnalysis(plan.jobId, records, estimatedDl50, method, lowerRate, upperRate, target, observations, confidence);
}

export function reviewDl50Analysis(analysis: Dl50AnalysisOutput): Dl50CriticOutput {
  const warnings = [
    analysis.metrics.sampleCount < 4
      ? "Small dose-response sample size reduces precision."
      : null,
    analysis.metrics.confidence < 0.75
      ? "Dose-response window is sparse, so the LD50 estimate should be treated as approximate."
      : null,
    analysis.method === "linear interpolation"
      ? "Linear interpolation was used because a positive-dose log window was not available."
      : null
  ].filter((warning): warning is string => Boolean(warning));

  if (warnings.length === 0) {
    warnings.push("LD50 estimate is derived from the observed response window and should be validated experimentally.");
  }

  return {
    jobId: analysis.jobId,
    route: analysis.route,
    confidence: analysis.metrics.confidence,
    warnings,
    observations: analysis.observations,
    estimatedDl50: analysis.estimatedDl50,
    method: analysis.method,
    responseWindow: analysis.responseWindow,
    metrics: analysis.metrics
  };
}

export function createDl50Report(review: Dl50CriticOutput): Dl50ReportOutput {
  return {
    jobId: review.jobId,
    summary: `Estimated LD50 is ${formatNumber(review.estimatedDl50)} using ${review.method}.`,
    confidence: review.confidence,
    keyFindings: [
      `LD50 estimate: ${formatNumber(review.estimatedDl50)}`,
      `Method: ${review.method}`,
      `Confidence: ${Math.round(review.confidence * 100)}%`
    ],
    structuredJson: {
      route: review.route,
      estimatedDl50: review.estimatedDl50,
      method: review.method,
      responseWindow: review.responseWindow,
      observations: review.observations,
      warnings: review.warnings,
      metrics: review.metrics
    },
    provenanceId: `prov_${review.jobId}`
  };
}

export function runFullDl50Analysis(input: {
  job: AnalysisJob;
  datasetText?: string;
}): Dl50ReportOutput {
  return createDl50Report(reviewDl50Analysis(runDl50Analysis(createDl50Plan(input))));
}

export function parseDl50Csv(csvText: string): Dl50Record[] {
  const trimmed = csvText.trim();
  if (!trimmed) {
    return [];
  }

  const [headerLine, ...lines] = trimmed.split(/\r?\n/);
  if (!headerLine) {
    return [];
  }

  const headers = headerLine.split(",").map((header) => header.trim().toLowerCase());
  const doseIndex = headers.indexOf("dose");
  const responseIndex = headers.indexOf("response");
  const totalIndex = headers.indexOf("total");

  if (doseIndex === -1 || responseIndex === -1 || totalIndex === -1) {
    throw new Error("Expected CSV headers: dose,response,total");
  }

  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = line.split(",").map((value) => value.trim());
      const dose = requireFiniteNumber(values[doseIndex], "dose");
      const response = requireFiniteNumber(values[responseIndex], "response");
      const total = requireFiniteNumber(values[totalIndex], "total");

      if (total <= 0) {
        throw new Error("Total subjects must be greater than zero.");
      }
      if (response < 0 || response > total) {
        throw new Error("Response must be between 0 and total.");
      }

      return { dose, response, total };
    });
}

function buildAnalysis(
  jobId: string,
  records: Dl50Record[],
  estimatedDl50: number,
  method: Dl50AnalysisOutput["method"],
  lowerResponseRate: number,
  upperResponseRate: number,
  targetRate: number,
  observations: string[],
  confidence = estimateConfidence(records, lowerResponseRate, upperResponseRate)
): Dl50AnalysisOutput {
  const doses = records.map((record) => record.dose);
  const responseRates = records.map((record) => record.response / record.total);
  const upperIndex = responseRates.findIndex((rate) => rate >= targetRate);
  const lowerIndex = Math.max(0, upperIndex - 1);
  const lower = records[lowerIndex]!;
  const upper = records[Math.max(upperIndex, 0)]!;

  return {
    jobId,
    route: "phytochemistry-dl50",
    estimatedDl50,
    method,
    responseWindow: {
      lowerDose: lower?.dose ?? Number.NaN,
      lowerResponseRate: lowerResponseRate,
      upperDose: upper?.dose ?? Number.NaN,
      upperResponseRate: upperResponseRate
    },
    observations,
    metrics: {
      sampleCount: records.length,
      minDose: Math.min(...doses),
      maxDose: Math.max(...doses),
      minResponseRate: Math.min(...responseRates),
      maxResponseRate: Math.max(...responseRates),
      confidence
    }
  };
}

function interpolateDl50(
  lowerDose: number,
  lowerRate: number,
  upperDose: number,
  upperRate: number,
  targetRate: number,
  method: Dl50AnalysisOutput["method"]
): number {
  const ratio = (targetRate - lowerRate) / (upperRate - lowerRate);
  if (method === "log-dose interpolation" && lowerDose > 0 && upperDose > 0) {
    const lowerLog = Math.log(lowerDose);
    const upperLog = Math.log(upperDose);
    return Math.exp(lowerLog + ratio * (upperLog - lowerLog));
  }

  return lowerDose + ratio * (upperDose - lowerDose);
}

function estimateConfidence(records: Dl50Record[], lowerRate: number, upperRate: number): number {
  const sampleWeight = Math.min(records.length / 8, 1);
  const windowWeight = Math.max(0.2, 1 - Math.abs(0.5 - lowerRate) - Math.abs(upperRate - 0.5));
  return round(clamp(0.45 + 0.3 * sampleWeight + 0.2 * windowWeight, 0.45, 0.95), 2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function requireFiniteNumber(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric CSV field: ${field}`);
  }
  return parsed;
}

function parseJsonObject(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced ?? trimmed;

  try {
    const parsed: unknown = JSON.parse(candidate);
    return isRecord(parsed) ? parsed : {};
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");

    if (start >= 0 && end > start) {
      try {
        const parsed: unknown = JSON.parse(candidate.slice(start, end + 1));
        return isRecord(parsed) ? parsed : {};
      } catch {
        return { summary: candidate };
      }
    }

    return { summary: candidate };
  }
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
