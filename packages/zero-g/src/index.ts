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

export {
  bytesToHex,
  downloadBrowserFile,
  generateAes256Key,
  hexToBytes,
  peekEncryptionHeader,
  saveBlobAsFile,
  uploadBrowserFile,
} from "./storage";

export type {
  DecryptionInput,
  DownloadResult,
  EncryptionInput,
  UploadResult,
  ZeroGNetworkConfig,
} from "./storage";
