import {
  buildDl50InferenceMessages,
  parseDl50InferenceResponse,
  type Dl50InferenceRequest,
  type Dl50InferenceResult,
} from "@kingsvarmo/agents";

export interface ZeroGComputeConfig {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export async function runDl50OnZeroGCompute(
  input: Dl50InferenceRequest,
  config: ZeroGComputeConfig = {},
): Promise<Dl50InferenceResult> {
  const baseUrl = (config.baseUrl ?? process.env.OG_COMPUTE_URL ?? "").trim().replace(/\/$/, "");
  const apiKey = (config.apiKey ?? process.env.OG_COMPUTE_API_KEY ?? "").trim();
  const model = (config.model ?? process.env.OG_COMPUTE_MODEL ?? "qwen-2.5-7b-instruct").trim();

  if (!baseUrl) {
    throw new Error("OG_COMPUTE_URL is not configured");
  }
  if (!apiKey) {
    throw new Error("OG_COMPUTE_API_KEY is not configured");
  }

  const prompt = buildDl50InferenceMessages(input);
  const response = await fetch(`${baseUrl}/v1/proxy/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const detail = await readBodyText(response);
    throw new Error(
      `0G Compute request failed: ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ""}`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("0G Compute response did not include message content");
  }

  const parsed = parseDl50InferenceResponse(content);
  return {
    ...parsed,
    model,
  };
}

async function readBodyText(response: Response): Promise<string | null> {
  try {
    const text = await response.text();
    return text.trim() || null;
  } catch {
    return null;
  }
}
