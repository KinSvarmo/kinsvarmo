# Test Suites

This folder holds repository-level checks that should stay independent from any one app.

## Suites

- `repo/monorepo-structure.test.ts`: verifies the expected monorepo folders, package names, docs, scripts, and root config files exist.
- `shared/shared-models.test.ts`: verifies shared TypeScript model exports, allowed statuses, seeded demo agent shape, and sponsor-facing message constants.
- `axl/axl-client.test.ts`: verifies the in-memory AXL adapter, HTTP AXL adapter, `/send`, `/recv`, `/topology`, health checks, and optional live-node smoke tests.

## Run

```bash
pnpm test
```

Use this suite whenever changing repository structure or shared model contracts.
