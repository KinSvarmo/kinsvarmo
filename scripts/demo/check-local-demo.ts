import { buildLocalAxlEnv, getLocalAxlNodes, parsePortOffset } from "../axl/local-network";

const portOffset = parsePortOffset();
const env = {
  ...process.env,
  ...buildLocalAxlEnv(portOffset)
};

const apiUrl = (env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main(): Promise<void> {
  console.log("KinSvarmo local demo check");
  console.log(`API: ${apiUrl}`);
  console.log(`AXL port offset: ${portOffset}`);

  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  checks.push(await checkJson("API health", `${apiUrl}/health`));

  for (const node of getLocalAxlNodes(portOffset)) {
    checks.push(
      await checkJson(
        `AXL ${node.participant}`,
        `${env[`AXL_NODE_${node.participant.toUpperCase()}_URL`]}/topology`
      )
    );
  }

  for (const check of checks) {
    console.log(`${check.ok ? "OK" : "FAIL"} ${check.name}: ${check.detail}`);
  }

  if (checks.some((check) => !check.ok)) {
    process.exit(1);
  }
}

async function checkJson(name: string, url: string): Promise<{ name: string; ok: boolean; detail: string }> {
  try {
    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
      return {
        name,
        ok: false,
        detail: `${response.status} ${response.statusText}: ${text.slice(0, 160)}`
      };
    }

    return {
      name,
      ok: true,
      detail: url
    };
  } catch (caught) {
    return {
      name,
      ok: false,
      detail: caught instanceof Error ? caught.message : "request failed"
    };
  }
}
