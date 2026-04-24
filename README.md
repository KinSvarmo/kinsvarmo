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

## Environment

Copy `.env.example` to `.env.local` for local development and fill sponsor integration values as they become available.

## Current Status

- Monorepo scaffold exists.
- App and package placeholders exist.
- Shared domain types are defined.
- Sponsor adapter interfaces are stubbed.
- Detailed integrations are intentionally not implemented yet.

## Known Limitations

The current repository is only a foundation. It does not yet include a real UI, running API, contracts, AXL nodes, KeeperHub workflow execution, or 0G deployment.
# kinsvarmo
