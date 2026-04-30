import type { AgentListing } from "./agents";

export const seededAgents: AgentListing[] = [
  {
    id: "agent_alkaloid_predictor_v2",
    name: "Alkaloid Predictor v2",
    slug: "alkaloid-predictor-v2",
    creatorName: "Dr. Mira Solenne",
    creatorWallet: "0x0000000000000000000000000000000000000000",
    description:
      "A deterministic phytochemistry analysis agent for small alkaloid screening datasets.",
    longDescription:
      "A private scientific analysis agent tuned for the KinSvarmo demo path. It accepts compact phytochemistry screening datasets and produces modest, auditable observations with confidence notes.",
    domain: "phytochemistry",
    supportedFormats: ["csv", "json"],
    priceIn0G: "0.25",
    runtimeEstimateSeconds: 90,
    status: "published",
    onchainTokenId: "1",
    previewOutput: "Predicted alkaloid-like compound families with confidence notes.",
    expectedOutput:
      "A structured report with candidate compound families, confidence, warnings, and provenance.",
    privacyNotes:
      "Uploaded demo datasets are referenced through the job record and are not exposed in marketplace listings.",
    intelligenceReference: "0g://placeholder/intelligence/alkaloid-v2",
    storageReference: "0g://placeholder/metadata/alkaloid-v2",
    createdAt: "2026-04-24T00:00:00.000Z"
  },
  {
    id: "agent_toxicity_screen_reviewer",
    name: "Toxicity Screen Reviewer",
    slug: "toxicity-screen-reviewer",
    creatorName: "HelixBench Labs",
    creatorWallet: "0x0000000000000000000000000000000000000002",
    description:
      "Reviews compact assay tables for early toxicity signals, weak controls, and follow-up testing priorities.",
    longDescription:
      "A reviewer-style analysis agent for early-stage toxicology screens. It is designed to inspect CSV assay exports, flag possible dose-response concerns, summarize control quality, and produce a cautious triage report for lab teams.",
    domain: "toxicology",
    supportedFormats: ["csv", "json"],
    priceIn0G: "0.18",
    runtimeEstimateSeconds: 120,
    status: "published",
    previewOutput:
      "Ranked toxicity concerns with control-quality notes and recommended confirmatory assays.",
    expectedOutput:
      "A structured triage report with warning flags, confidence notes, and suggested validation steps.",
    privacyNotes:
      "Assay data is intended to remain private to the run and is only referenced through execution records.",
    intelligenceReference: "0g://placeholder/intelligence/toxicity-reviewer",
    storageReference: "0g://placeholder/metadata/toxicity-reviewer",
    createdAt: "2026-04-24T00:10:00.000Z"
  },
  {
    id: "agent_genomics_variant_summarizer",
    name: "Variant Evidence Summarizer",
    slug: "variant-evidence-summarizer",
    creatorName: "Northstar Genomics",
    creatorWallet: "0x0000000000000000000000000000000000000003",
    description:
      "Summarizes variant tables into evidence tiers, caveats, and reproducible review notes.",
    longDescription:
      "A genomics support agent for small demonstration variant tables. It groups records by evidence strength, highlights incomplete annotations, and prepares a clean review packet for a human researcher.",
    domain: "genomics",
    supportedFormats: ["csv", "json"],
    priceIn0G: "0.32",
    runtimeEstimateSeconds: 150,
    status: "published",
    previewOutput:
      "Evidence-tier summary with annotation gaps, review caveats, and provenance fields.",
    expectedOutput:
      "A concise variant review report with tiered findings, missing metadata, and confidence signals.",
    privacyNotes:
      "Variant uploads are treated as private analysis inputs and are not reused across listings.",
    intelligenceReference: "0g://placeholder/intelligence/variant-summarizer",
    storageReference: "0g://placeholder/metadata/variant-summarizer",
    createdAt: "2026-04-24T00:20:00.000Z"
  },
  {
    id: "agent_materials_stability_auditor",
    name: "Materials Stability Auditor",
    slug: "materials-stability-auditor",
    creatorName: "ForgeMatter Research",
    creatorWallet: "0x0000000000000000000000000000000000000004",
    description:
      "Audits materials experiment logs for stability trends, outliers, and missing run metadata.",
    longDescription:
      "A materials-science operations agent for experiment logs and stability screens. It checks compact CSV or JSON inputs for repeated drift patterns, temperature or batch outliers, and weak provenance fields before producing a lab-ready audit summary.",
    domain: "materials",
    supportedFormats: ["csv", "json"],
    priceIn0G: "0.21",
    runtimeEstimateSeconds: 105,
    status: "published",
    previewOutput:
      "Stability trend audit with outlier notes, missing metadata, and rerun suggestions.",
    expectedOutput:
      "A structured audit report with stability observations, confidence, and experiment-quality warnings.",
    privacyNotes:
      "Experiment logs stay scoped to the submitted job and are referenced by provenance ID.",
    intelligenceReference: "0g://placeholder/intelligence/materials-stability",
    storageReference: "0g://placeholder/metadata/materials-stability",
    createdAt: "2026-04-24T00:30:00.000Z"
  },
  {
    id: "agent_paper_reproducibility_checker",
    name: "Reproducibility Checker",
    slug: "reproducibility-checker",
    creatorName: "Open Methods Studio",
    creatorWallet: "0x0000000000000000000000000000000000000005",
    description:
      "Checks methods tables and result summaries for reproducibility gaps before publication review.",
    longDescription:
      "A research-operations agent for small methods and result metadata files. It identifies missing parameters, unclear sample counts, and weak provenance fields so researchers can fix reproducibility issues before sharing a report.",
    domain: "research-ops",
    supportedFormats: ["csv", "json"],
    priceIn0G: "0.14",
    runtimeEstimateSeconds: 75,
    status: "published",
    previewOutput:
      "Checklist-style reproducibility review with missing methods, metadata gaps, and risk notes.",
    expectedOutput:
      "A reproducibility checklist with issue severity, explanation, and recommended next actions.",
    privacyNotes:
      "Draft methods data is private to the run and can be deleted from local demo persistence.",
    intelligenceReference: "0g://placeholder/intelligence/reproducibility-checker",
    storageReference: "0g://placeholder/metadata/reproducibility-checker",
    createdAt: "2026-04-24T00:40:00.000Z"
  },
  {
    id: "agent_cohort_submission_reviewer",
    name: "Cohort Submission Reviewer",
    slug: "cohort-submission-reviewer",
    creatorName: "KinSvarmo Workflows",
    creatorWallet: "0x0000000000000000000000000000000000000006",
    description:
      "Reviews grouped dose-response submissions and returns a structured confidence report for comparison.",
    longDescription:
      "A shared-workflow analysis agent for dose-response datasets. Each participant submits a CSV and receives an individual report. Coordinators compare confidence scores and key findings across the group through the results table.",
    domain: "research-ops",
    supportedFormats: ["csv"],
    priceIn0G: "0.10",
    runtimeEstimateSeconds: 60,
    status: "published",
    previewOutput: "Confidence score, estimated LD50, and structured findings for each submission.",
    expectedOutput:
      "A structured report with dose-response observations, confidence, and provenance for grouped review.",
    privacyNotes:
      "Each submission is scoped to the individual job and is not shared across listings.",
    intelligenceReference: "0g://placeholder/intelligence/cohort-submission",
    storageReference: "0g://placeholder/metadata/cohort-submission",
    createdAt: "2026-04-24T00:50:00.000Z"
  }
];
