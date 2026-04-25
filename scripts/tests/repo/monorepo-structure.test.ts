import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as Record<
    string,
    unknown
  >;
}

test("root workspace configuration is present", () => {
  for (const path of [
    "package.json",
    "pnpm-workspace.yaml",
    "tsconfig.base.json",
    ".env.example",
    "README.md"
  ]) {
    assert.equal(existsSync(join(repoRoot, path)), true, `${path} should exist`);
  }
});

test("monorepo has the required app, package, script, and docs folders", () => {
  const requiredDirectories = [
    "apps/web",
    "apps/api",
    "packages/shared",
    "packages/agents",
    "packages/axl-client",
    "packages/keeperhub",
    "packages/zero-g",
    "packages/contracts",
    "scripts/seed",
    "scripts/deploy",
    "scripts/demo",
    "scripts/axl",
    "scripts/tests",
    "docs"
  ];

  for (const directory of requiredDirectories) {
    assert.equal(
      existsSync(join(repoRoot, directory)),
      true,
      `${directory} should exist`
    );
  }
});

test("workspace packages use the expected names", () => {
  const expectedPackageNames: Record<string, string> = {
    "apps/web/package.json": "@kingsvarmo/web",
    "apps/api/package.json": "@kingsvarmo/api",
    "packages/shared/package.json": "@kingsvarmo/shared",
    "packages/agents/package.json": "@kingsvarmo/agents",
    "packages/axl-client/package.json": "@kingsvarmo/axl-client",
    "packages/keeperhub/package.json": "@kingsvarmo/keeperhub",
    "packages/zero-g/package.json": "@kingsvarmo/zero-g",
    "packages/contracts/package.json": "@kingsvarmo/contracts"
  };

  for (const [path, expectedName] of Object.entries(expectedPackageNames)) {
    const packageJson = readJson(path);
    assert.equal(packageJson.name, expectedName);
  }
});

test("required project docs exist", () => {
  for (const path of [
    "docs/architecture.md",
    "docs/sponsor-mapping.md",
    "docs/demo-script.md",
    "docs/known-limitations.md"
  ]) {
    assert.equal(existsSync(join(repoRoot, path)), true, `${path} should exist`);
  }
});

test("environment example includes sponsor integration variables", () => {
  const envExample = readFileSync(join(repoRoot, ".env.example"), "utf8");

  for (const variableName of [
    "ZERO_G_RPC_URL",
    "ZERO_G_EXPLORER_URL",
    "ZERO_G_STORAGE_ENDPOINT",
    "KEEPERHUB_API_KEY",
    "KEEPERHUB_BASE_URL",
    "AXL_NODE_PLANNER_URL",
    "AXL_NODE_ANALYZER_URL",
    "AXL_NODE_CRITIC_URL",
    "AXL_NODE_REPORTER_URL"
  ]) {
    assert.match(envExample, new RegExp(`^${variableName}=`, "m"));
  }
});
