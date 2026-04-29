export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? 
  (typeof window !== "undefined" ? "" : "http://localhost:3000");

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...((init?.headers as Record<string, string> | undefined) ?? {})
    }
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new Error(detail ? `${response.status} ${detail}` : `${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as {
      error?: unknown;
      message?: unknown;
      hint?: unknown;
    };
    const parts = [body.error, body.message, body.hint].filter(
      (part): part is string => typeof part === "string" && part.length > 0
    );

    return parts.length > 0 ? parts.join(" — ") : null;
  } catch {
    return null;
  }
}
