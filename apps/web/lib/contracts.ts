import type { Abi } from "viem";

// ─── Placeholder Addresses ───────────────────────────────────────────────────
// These will be replaced with real deployed addresses after contracts go live.
const INFT_REGISTRY_ADDRESS =
  process.env.NEXT_PUBLIC_INFT_REGISTRY_ADDRESS?.trim() ??
  "0x0000000000000000000000000000000000000000";

export const CONTRACT_ADDRESSES = {
  INFTRegistry: INFT_REGISTRY_ADDRESS as `0x${string}`,
  UsageAuthorizationManager: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  AnalysisEscrow: "0x0000000000000000000000000000000000000000" as `0x${string}`,
} as const;

// ─── INFTRegistry ABI (subset used by the UI) ────────────────────────────────
export const INFTRegistryABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "encryptedURI", type: "string" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    name: "getEncryptedURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
] as const satisfies Abi;

// ─── AnalysisEscrow ABI (subset used by the UI) ──────────────────────────────
export const AnalysisEscrowABI = [
  {
    name: "createJob",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "agentTokenId", type: "uint256" },
      { name: "datasetReference", type: "string" },
    ],
    outputs: [{ name: "jobId", type: "bytes32" }],
  },
  {
    name: "getJobState",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "bytes32" }],
    outputs: [{ name: "state", type: "uint8" }],
  },
  {
    name: "JobCreated",
    type: "event",
    inputs: [
      { name: "jobId", type: "bytes32", indexed: true },
      { name: "agentTokenId", type: "uint256", indexed: true },
      { name: "payer", type: "address", indexed: true },
    ],
  },
] as const satisfies Abi;

// ─── UsageAuthorizationManager ABI ───────────────────────────────────────────
export const UsageAuthorizationManagerABI = [
  {
    name: "authorizeUsage",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "executor", type: "address" },
      { name: "permissions", type: "bytes" },
    ],
    outputs: [],
  },
] as const satisfies Abi;
