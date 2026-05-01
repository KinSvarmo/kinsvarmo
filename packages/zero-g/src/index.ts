export interface ZeroGAgentRecord {
  contractAddress: string;
  tokenId: string;
  explorerUrl: string;
  intelligenceReference: string;
  storageReference: string;
}

export interface ZeroGClient {
  publishAgent(input: {
    creatorWallet: string;
    metadataReference: string;
    intelligenceReference: string;
    priceIn0G: string;
  }): Promise<ZeroGAgentRecord>;
  buildExplorerUrl(contractAddress: string, tokenId?: string): string;
}

export interface ZeroGIntegrationStatus {
  configured: boolean;
  chain: {
    configured: boolean;
    rpcUrl?: string | undefined;
    explorerUrl?: string | undefined;
    missing: string[];
  };
  storage: {
    configured: boolean;
    endpoint?: string | undefined;
    missing: string[];
  };
  compute: {
    configured: boolean;
    providerAddress?: string | undefined;
    serviceUrl?: string | undefined;
    model?: string | undefined;
    hasSecret: boolean;
    missing: string[];
  };
  contracts: {
    configured: boolean;
    agentRegistryAddress?: string | undefined;
    usageAuthorizationAddress?: string | undefined;
    missing: string[];
  };
}

export interface ZeroGInferenceProvider {
  provider: string;
  name: string;
  model: string;
  serviceType: "chatbot" | "text-to-image" | "speech-to-text";
  url?: string | undefined;
  verification?: string;
}

export interface ZeroGInferenceInput {
  providerAddress: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

export interface ZeroGInferenceResult {
  text: string;
  chatId: string | null;
  verified: boolean | null;
  raw: Record<string, unknown>;
}

export interface ZeroGLedgerInfo {
  configured: boolean;
  balance: string;
  providerFunds: Record<string, string>;
}

export function getZeroGIntegrationStatus(
  env: NodeJS.ProcessEnv = process.env
): ZeroGIntegrationStatus {
  const rpcUrl = env.ZERO_G_RPC_URL ?? "https://evmrpc-testnet.0g.ai";
  const explorerUrl = env.ZERO_G_EXPLORER_URL ?? "https://chainscan-galileo.0g.ai";
  const providerAddress = env.ZERO_G_COMPUTE_PROVIDER_ADDRESS ?? env.ZERO_G_INFERENCE_PROVIDER;
  const agentRegistryAddress = env.ZERO_G_AGENT_REGISTRY_ADDRESS ?? env.NEXT_PUBLIC_INFT_REGISTRY_ADDRESS;
  const usageAuthorizationAddress =
    env.ZERO_G_USAGE_AUTHORIZATION_ADDRESS ?? agentRegistryAddress;
  const chainMissing: string[] = [];
  const storageMissing = missingEnv(env, ["ZERO_G_STORAGE_ENDPOINT"]);
  const computeMissing = [
    ...(providerAddress ? [] : ["ZERO_G_INFERENCE_PROVIDER"]),
    ...(env.ZERO_G_COMPUTE_SERVICE_URL ? [] : ["ZERO_G_COMPUTE_SERVICE_URL"]),
    ...(env.ZERO_G_COMPUTE_API_SECRET ? [] : ["ZERO_G_COMPUTE_API_SECRET"]),
    ...(env.ZERO_G_COMPUTE_MODEL ? [] : ["ZERO_G_COMPUTE_MODEL"]),
  ];
  const contractMissing = [
    ...(agentRegistryAddress ? [] : ["NEXT_PUBLIC_INFT_REGISTRY_ADDRESS"]),
    ...(usageAuthorizationAddress ? [] : ["ZERO_G_USAGE_AUTHORIZATION_ADDRESS"]),
  ];

  return {
    configured:
      chainMissing.length === 0 &&
      storageMissing.length === 0 &&
      computeMissing.length === 0 &&
      contractMissing.length === 0,
    chain: {
      configured: chainMissing.length === 0,
      rpcUrl,
      explorerUrl,
      missing: chainMissing,
    },
    storage: {
      configured: storageMissing.length === 0,
      endpoint: env.ZERO_G_STORAGE_ENDPOINT,
      missing: storageMissing,
    },
    compute: {
      configured: computeMissing.length === 0,
      providerAddress,
      serviceUrl: env.ZERO_G_COMPUTE_SERVICE_URL,
      model: env.ZERO_G_COMPUTE_MODEL,
      hasSecret: Boolean(env.ZERO_G_COMPUTE_API_SECRET),
      missing: computeMissing,
    },
    contracts: {
      configured: contractMissing.length === 0,
      agentRegistryAddress,
      usageAuthorizationAddress,
      missing: contractMissing,
    },
  };
}

export function buildZeroGExplorerUrl(path: string, env: NodeJS.ProcessEnv = process.env): string {
  const explorerUrl = env.ZERO_G_EXPLORER_URL ?? "https://chainscan-galileo.0g.ai";
  return `${explorerUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export async function listInferenceProviders(): Promise<ZeroGInferenceProvider[]> {
  return [
    {
      provider: process.env.ZERO_G_COMPUTE_PROVIDER_ADDRESS ?? process.env.ZERO_G_INFERENCE_PROVIDER ?? "0x0000000000000000000000000000000000000000",
      name: "0G demo inference provider",
      model: process.env.ZERO_G_COMPUTE_MODEL ?? "qwen-2.5-7b-instruct",
      serviceType: "chatbot",
      url: process.env.ZERO_G_COMPUTE_SERVICE_URL,
      verification: "demo-adapter",
    },
  ];
}

export async function runInference(input: ZeroGInferenceInput): Promise<ZeroGInferenceResult> {
  const serviceUrl = process.env.ZERO_G_COMPUTE_SERVICE_URL;
  const apiSecret = process.env.ZERO_G_COMPUTE_API_SECRET;
  const model = process.env.ZERO_G_COMPUTE_MODEL ?? "qwen-2.5-7b-instruct";

  if (!serviceUrl || !apiSecret) {
    return {
      text: `0G Compute adapter is configured for provider ${input.providerAddress}, but ZERO_G_COMPUTE_SERVICE_URL and ZERO_G_COMPUTE_API_SECRET are not set. Demo prompt: ${input.userPrompt.slice(0, 180)}`,
      chatId: null,
      verified: null,
      raw: { mode: "local-placeholder", providerAddress: input.providerAddress },
    };
  }

  const response = await fetch(`${serviceUrl.replace(/\/$/, "")}/v1/proxy/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: input.maxTokens ?? 256,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`0G Compute inference failed with ${response.status}: ${body}`);
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const choices = Array.isArray(raw.choices) ? raw.choices : [];
  const firstChoice = choices[0] as { message?: { content?: string } } | undefined;

  return {
    text: firstChoice?.message?.content ?? JSON.stringify(raw),
    chatId: typeof raw.id === "string" ? raw.id : null,
    verified: null,
    raw,
  };
}

export async function depositFunds(_amount: number): Promise<void> {
  return;
}

export async function topUpDeposit(_amount: number): Promise<void> {
  return;
}

export async function transferFundsToProvider(_providerAddress: string, _amountNeuron: bigint): Promise<void> {
  return;
}

export async function getLedgerInfo(): Promise<ZeroGLedgerInfo> {
  return {
    configured: Boolean(process.env.ZERO_G_COMPUTE_PROVIDER_ADDRESS || process.env.ZERO_G_INFERENCE_PROVIDER),
    balance: "0",
    providerFunds: {},
  };
}

function missingEnv(env: NodeJS.ProcessEnv, names: string[]): string[] {
  return names.filter((name) => !env[name]);
}

export {
  bytesToHex,
  downloadBrowserFile,
  generateAes256Key,
  hexToBytes,
  peekEncryptionHeader,
  saveBlobAsFile,
  uploadBrowserFile,
  uploadServerBytes,
} from "./storage";

export type {
  DecryptionInput,
  DownloadResult,
  EncryptionInput,
  ServerUploadInput,
  UploadResult,
  ZeroGNetworkConfig,
} from "./storage";
