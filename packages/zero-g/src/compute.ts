import { Wallet, JsonRpcProvider } from "ethers";
import {
  createZGComputeNetworkBroker,
  createZGComputeNetworkReadOnlyBroker,
} from "@0glabs/0g-serving-broker";

// ── Types ──────────────────────────────────────────────────────────────

export interface InferenceOptions {
  providerAddress: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

export interface InferenceResult {
  text: string;
  chatId: string | null;
  verified: boolean | null;
  model: string;
  provider: string;
}

export interface ProviderInfo {
  provider: string;
  model: string;
  url: string;
  inputPrice: string;
  outputPrice: string;
}

// ── Config ─────────────────────────────────────────────────────────────

const RPC_URL = process.env.ZERO_G_RPC_URL || "https://evmrpc-testnet.0g.ai";

function getServerWallet(): Wallet {
  const key = process.env.ZERO_G_PRIVATE_KEY;
  if (!key) throw new Error("ZERO_G_PRIVATE_KEY not set");
  const provider = new JsonRpcProvider(RPC_URL);
  return new Wallet(key, provider);
}

// ── Inference ──────────────────────────────────────────────────────────

/**
 * Run an OpenAI-compatible chat completion against a 0G Compute provider.
 * 
 * Flow (from the SDK README):
 *   1. Create broker with wallet
 *   2. Get service metadata (endpoint + model)
 *   3. Generate signed billing headers
 *   4. POST to provider's /chat/completions endpoint
 *   5. Verify response via processResponse
 */
export async function runInference(opts: InferenceOptions): Promise<InferenceResult> {
  const wallet = getServerWallet();
  const broker = await createZGComputeNetworkBroker(wallet);

  // 1. Ensure the provider signer is acknowledged
  try {
    const status = await broker.inference.checkProviderSignerStatus(opts.providerAddress);
    if (!status.isAcknowledged) {
      await broker.inference.acknowledgeProviderSigner(opts.providerAddress);
    }
  } catch {
    // Provider may already be acknowledged — continue
  }

  // 2. Get service metadata
  const { endpoint, model } = await broker.inference.getServiceMetadata(opts.providerAddress);

  // 3. Build request body
  const messages = [
    { role: "system", content: opts.systemPrompt },
    { role: "user", content: opts.userPrompt },
  ];
  const requestBody = {
    model,
    messages,
    max_tokens: opts.maxTokens ?? 256,
  };

  // 4. Get signed billing headers
  const content = opts.userPrompt;
  const headers = await broker.inference.getRequestHeaders(opts.providerAddress, content);

  // 5. POST to provider
  const response = await fetch(`${endpoint}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`0G provider returned ${response.status}: ${body}`);
  }

  const completion = await response.json();

  // 6. Extract chat ID from response header (TEE signature key)
  const chatId = response.headers.get("ZG-Res-Key") || completion.id || null;

  // 7. Verify response
  let verified: boolean | null = null;
  try {
    const usage = completion.usage ? JSON.stringify(completion.usage) : undefined;
    verified = await broker.inference.processResponse(
      opts.providerAddress,
      chatId ?? undefined,
      usage
    );
  } catch {
    // Verification optional — non-verifiable services return null
    verified = null;
  }

  // 8. Extract text
  const text =
    completion.choices?.[0]?.message?.content ??
    completion.choices?.[0]?.text ??
    JSON.stringify(completion);

  return {
    text,
    chatId,
    verified,
    model,
    provider: opts.providerAddress,
  };
}

// ── Provider Discovery ─────────────────────────────────────────────────

export async function listInferenceProviders(): Promise<ProviderInfo[]> {
  const broker = await createZGComputeNetworkReadOnlyBroker(RPC_URL);
  const services = await broker.inference.listService();
  return services.map((s: any) => ({
    provider: s.provider ?? s.providerAddress ?? "",
    model: s.model ?? "",
    url: s.url ?? "",
    inputPrice: String(s.inputPrice ?? "0"),
    outputPrice: String(s.outputPrice ?? "0"),
  }));
}

// ── Ledger / Funding ───────────────────────────────────────────────────

export async function depositFunds(amount: number): Promise<void> {
  const wallet = getServerWallet();
  const broker = await createZGComputeNetworkBroker(wallet);
  await broker.ledger.addLedger(amount);
}

export async function topUpDeposit(amount: number): Promise<void> {
  const wallet = getServerWallet();
  const broker = await createZGComputeNetworkBroker(wallet);
  await broker.ledger.depositFund(amount);
}

export async function transferFundsToProvider(
  providerAddress: string,
  amountNeuron: bigint
): Promise<void> {
  const wallet = getServerWallet();
  const broker = await createZGComputeNetworkBroker(wallet);
  await broker.ledger.transferFund(providerAddress, "inference", amountNeuron);
}

export async function getLedgerInfo() {
  const wallet = getServerWallet();
  const broker = await createZGComputeNetworkBroker(wallet);
  return broker.ledger.getLedger();
}
