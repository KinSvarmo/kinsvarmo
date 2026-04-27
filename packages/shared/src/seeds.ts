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
  }
];
