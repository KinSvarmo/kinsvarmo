# KinSvarmo

KinSvarmo is a scientific agent marketplace and execution platform where researchers publish private analysis agents as 0G-linked iNFT-style assets, and users run auditable analysis workflows on uploaded datasets.

This repository is currently at the basic scaffold stage. The first usable demo path will focus on one seeded phytochemistry agent, one deterministic upload flow, visible AXL module communication, KeeperHub workflow state, and a 0G-linked agent record.

## Repository Layout

```text
apps/
  web/       Next.js frontend shell
  api/       API service shell
packages/
  shared/    Shared domain types and schemas
  agents/    Planner, analyzer, critic, and reporter module contracts
  axl-client/
  keeperhub/
  zero-g/
  contracts/
scripts/
docs/
```

## Planned Demo Flow

1. Open the landing page.
2. Browse seeded scientific agents.
3. Open `Alkaloid Predictor v2`.
4. Upload a demo dataset.
5. Start a paid analysis run.
6. Watch planner, analyzer, critic, and reporter progress.
7. Inspect AXL messages and KeeperHub execution state.
8. Open the final result with provenance and 0G references.

## Local Setup

```bash
pnpm install
pnpm dev
```

## Local AXL Demo

Run the local AXL-compatible node network:

```bash
pnpm axl:nodes
```

In a second terminal:

```bash
pnpm axl:workers
```

In a third terminal:

```bash
pnpm axl:demo
```

This sends a demo job through planner, analyzer, critic, and reporter as separate processes.

## API Job Workflow

The backend job flow is driven by AXL messages. `POST /api/jobs/:id/start` sends `job.created` to the planner node, then the API consumes AXL messages sent back by the workers to update module status, message logs, and final result state.

## Demo Dataset

The deterministic phytochemistry sample lives at `demo-data/alkaloid-sample.csv`. The same input produces the same report every time, which keeps the demo path stable.

## Repository Checks

Repository-level tests live in `scripts/tests`.

```bash
pnpm test
pnpm test:axl
pnpm typecheck
```

AXL-specific setup and live-node smoke testing are documented in `docs/axl-adapter-testing.md`.

## Environment

Copy `.env.example` to `.env.local` for local development and fill sponsor integration values as they become available.

## Current Status

- Monorepo scaffold exists.
- App and package placeholders exist.
- Shared domain types are defined.
- Sponsor adapter interfaces are stubbed.
- Repository structure and shared model tests exist under `scripts/tests`.
- Detailed integrations are intentionally not implemented yet.

## Known Limitations

The current repository is only a foundation. It does not yet include a real UI, running API, contracts, AXL nodes, KeeperHub workflow execution, or 0G deployment.
# kinsvarmo
