# KinSvarmo

KinSvarmo is a scientific agent marketplace and execution platform where researchers publish private analysis agents as 0G-linked iNFT-style assets, and users run auditable analysis workflows on uploaded datasets.

The current demo includes a seeded marketplace, a working Alkaloid Predictor execution path, AXL-backed planner/analyzer/critic/reporter communication, KeeperHub workflow tracking, and a dedicated result page. The 0G contract/storage path is still being integrated separately.

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

## Demo Flow

1. Open the landing page.
2. Browse seeded scientific agents.
3. Open `Alkaloid Predictor v2`.
4. Click `Run Demo Analysis`.
5. Start the backend job.
6. Watch planner, analyzer, critic, and reporter progress.
7. Inspect true AXL message routes and KeeperHub execution state.
8. Open the final result page with confidence, key findings, structured JSON, and provenance.

## Local Setup

```bash
pnpm install
```

Create and enable the real KeeperHub webhook workflow:

```bash
pnpm keeperhub:create-webhook
pnpm keeperhub:test
```

## One-Command Local Demo

Start local AXL-compatible nodes, agent workers, API, and web app:

```bash
pnpm demo:local
```

In another terminal, verify the stack:

```bash
pnpm demo:check
```

Then open:

```text
http://localhost:3000/agents/1
```

## Manual Local AXL Demo

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

The UI displays the true worker route for audit messages, so the status page shows `planner → analyzer → critic → reporter` even when the API receives an audit copy for state tracking.

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

Copy `.env.example` to `.env` for local API/demo development and fill KeeperHub values. The frontend can use `NEXT_PUBLIC_API_URL=http://localhost:4000`.

## Current Status

- Seeded marketplace with five catalog agents.
- `Alkaloid Predictor v2` is the executable golden path.
- API job creation, AXL workflow start, message logging, KeeperHub tracking, and result retrieval work locally.
- Dedicated job status and result pages exist.
- Local AXL-compatible nodes and real Gensyn AXL smoke-test scripts exist.
- KeeperHub workflow creation, enabling, and live testing scripts exist.

## Known Limitations

- Non-Alkaloid marketplace agents are preview listings.
- In-memory job state is used for the local demo. Persistence should later become an index/cache over 0G/onchain references, not the source of truth.
- 0G contract/storage integration is owned separately and still needs final wiring.
