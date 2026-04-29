import type { AgentListing, AnalysisJob } from "@kingsvarmo/shared";

export interface GenericDemoPlanOutput {
  jobId: string;
  agentId: string;
  agentName: string;
  domain: string;
  agentPrompt?: string;
  route: "generic-demo";
  acceptedFormat: string;
  datasetText: string;
  steps: string[];
}

export interface GenericDemoAnalysisOutput {
  jobId: string;
  agentId: string;
  agentName: string;
  domain: string;
  agentPrompt?: string;
  route: "generic-demo";
  observations: string[];
  metrics: {
    recordCount: number;
    fieldCount: number;
    completenessScore: number;
    evidenceScore: number;
    processingScore: number;
  };
}

export interface GenericDemoCriticOutput {
  jobId: string;
  agentId: string;
  agentName: string;
  domain: string;
  agentPrompt?: string;
  route: "generic-demo";
  confidence: number;
  warnings: string[];
  reviewedObservations: string[];
  metrics: GenericDemoAnalysisOutput["metrics"];
}

export interface GenericDemoReportOutput {
  jobId: string;
  summary: string;
  confidence: number;
  keyFindings: string[];
  structuredJson: {
    route: "generic-demo";
    agentId: string;
    agentName: string;
    domain: string;
    agentPrompt?: string;
    metrics: GenericDemoAnalysisOutput["metrics"];
    warnings: string[];
  };
  provenanceId: string;
}

const domainSummary: Record<string, string> = {
  phytochemistry: "Demo sample shows modest alkaloid-like screening signals.",
  toxicology: "Demo assay review flags manageable toxicity-screening concerns.",
  genomics: "Demo variant table contains reviewable evidence tiers and annotation gaps.",
  materials: "Demo experiment log shows stable materials trends with limited outliers.",
  "research-ops": "Demo methods package shows reproducibility gaps ready for cleanup."
};

const domainFindings: Record<string, string[]> = {
  phytochemistry: [
    "Candidate alkaloid-like families detected",
    "Signal intensity is suitable for demo workflow validation"
  ],
  toxicology: [
    "Dose-response rows are present for triage",
    "Control quality should be reviewed before downstream claims"
  ],
  genomics: [
    "Variant evidence can be grouped into review tiers",
    "Some annotations should be verified by a human reviewer"
  ],
  materials: [
    "Stability trend is coherent across the submitted records",
    "Outlier review is recommended for the next experiment pass"
  ],
  "research-ops": [
    "Methods metadata is sufficient for a first reproducibility review",
    "Missing parameter notes should be resolved before publication"
  ]
};

export function createGenericDemoPlan(input: {
  job: AnalysisJob;
  agent?: AgentListing;
  datasetText?: string;
}): GenericDemoPlanOutput {
  const domain = normalizeDomain(input.agent?.domain ?? "research-ops");

  return {
    jobId: input.job.id,
    agentId: input.job.agentId,
    agentName: input.agent?.name ?? input.job.agentId,
    domain,
    ...(input.agent?.promptTemplate ? { agentPrompt: input.agent.promptTemplate } : {}),
    route: "generic-demo",
    acceptedFormat: inferFormat(input.job.filename),
    datasetText: input.datasetText ?? readDatasetText(input.job),
    steps: [
      "validate supported input",
      `run deterministic ${domain} analysis`,
      "review confidence and warnings",
      "prepare auditable result"
    ]
  };
}

export function runGenericDemoAnalysis(plan: GenericDemoPlanOutput): GenericDemoAnalysisOutput {
  const profile = profileDataset(plan.datasetText);
  const domainWeight = Math.max(0.02, Math.min(0.12, plan.domain.length / 100));
  const evidenceScore = round(
    0.58 + profile.recordCount * 0.025 + profile.fieldCount * 0.01 + domainWeight,
    2
  );
  const completenessScore = round(profile.nonEmptyCells / Math.max(profile.totalCells, 1), 2);
  const processingScore = round((evidenceScore + completenessScore) / 2, 2);

  return {
    jobId: plan.jobId,
    agentId: plan.agentId,
    agentName: plan.agentName,
    domain: plan.domain,
    ...(plan.agentPrompt ? { agentPrompt: plan.agentPrompt } : {}),
    route: plan.route,
    observations: [
      `${profile.recordCount} records were parsed for ${plan.domain} review`,
      `${profile.fieldCount} fields were available for deterministic scoring`,
      `Completeness score was ${completenessScore.toFixed(2)}`
    ],
    metrics: {
      recordCount: profile.recordCount,
      fieldCount: profile.fieldCount,
      completenessScore,
      evidenceScore,
      processingScore
    }
  };
}

export function reviewGenericDemoAnalysis(analysis: GenericDemoAnalysisOutput): GenericDemoCriticOutput {
  const warnings = [
    "Demo result is deterministic and not a production-grade scientific claim"
  ];

  if (analysis.metrics.recordCount < 3) {
    warnings.unshift("Small input size limits confidence");
  }

  if (analysis.metrics.completenessScore < 0.85) {
    warnings.unshift("Missing values reduced confidence");
  }

  return {
    jobId: analysis.jobId,
    agentId: analysis.agentId,
    agentName: analysis.agentName,
    domain: analysis.domain,
    ...(analysis.agentPrompt ? { agentPrompt: analysis.agentPrompt } : {}),
    route: analysis.route,
    confidence: Math.min(0.91, Math.max(0.52, analysis.metrics.processingScore)),
    warnings,
    reviewedObservations: analysis.observations,
    metrics: analysis.metrics
  };
}

export function createGenericDemoReport(review: GenericDemoCriticOutput): GenericDemoReportOutput {
  const summary =
    domainSummary[review.domain] ??
    `${review.agentName} completed a deterministic demo review.`;
  const findings = domainFindings[review.domain] ?? [
    "Input structure was parsed successfully",
    "Deterministic workflow completed through all modules"
  ];

  return {
    jobId: review.jobId,
    summary,
    confidence: review.confidence,
    keyFindings: [
      ...findings,
      `Confidence score: ${review.confidence.toFixed(2)}`
    ],
    structuredJson: {
      route: review.route,
      agentId: review.agentId,
      agentName: review.agentName,
      domain: review.domain,
      ...(review.agentPrompt ? { agentPrompt: review.agentPrompt } : {}),
      metrics: review.metrics,
      warnings: review.warnings
    },
    provenanceId: `prov_${review.jobId}`
  };
}

function readDatasetText(job: AnalysisJob): string {
  const candidate = job.inputMetadata.csvText ?? job.inputMetadata.datasetText;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate
    : "sample_id,value,quality\nKS-001,0.71,pass\nKS-002,0.82,pass\nKS-003,0.64,review";
}

function inferFormat(filename: string): string {
  const extension = filename.toLowerCase().split(".").pop();
  return extension && extension.length <= 6 ? extension : "csv";
}

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/\s+/g, "-");
}

function profileDataset(datasetText: string): {
  recordCount: number;
  fieldCount: number;
  nonEmptyCells: number;
  totalCells: number;
} {
  const trimmed = datasetText.trim();

  if (!trimmed) {
    return {
      recordCount: 0,
      fieldCount: 0,
      nonEmptyCells: 0,
      totalCells: 0
    };
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return profileJson(trimmed);
  }

  const rows = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const fieldCount = rows[0]?.split(",").length ?? 0;
  const dataRows = rows.slice(1);
  const cells = dataRows.flatMap((row) => row.split(","));

  return {
    recordCount: dataRows.length,
    fieldCount,
    nonEmptyCells: cells.filter((cell) => cell.trim().length > 0).length,
    totalCells: cells.length
  };
}

function profileJson(text: string): {
  recordCount: number;
  fieldCount: number;
  nonEmptyCells: number;
  totalCells: number;
} {
  try {
    const parsed = JSON.parse(text) as unknown;
    const records = Array.isArray(parsed) ? parsed : [parsed];
    const fieldNames = new Set<string>();
    let nonEmptyCells = 0;
    let totalCells = 0;

    for (const record of records) {
      if (typeof record !== "object" || record === null) {
        totalCells += 1;
        if (record !== null && record !== undefined && String(record).length > 0) {
          nonEmptyCells += 1;
        }
        continue;
      }

      for (const [key, value] of Object.entries(record)) {
        fieldNames.add(key);
        totalCells += 1;
        if (value !== null && value !== undefined && String(value).length > 0) {
          nonEmptyCells += 1;
        }
      }
    }

    return {
      recordCount: records.length,
      fieldCount: fieldNames.size,
      nonEmptyCells,
      totalCells
    };
  } catch {
    return {
      recordCount: 1,
      fieldCount: 1,
      nonEmptyCells: 1,
      totalCells: 1
    };
  }
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
