# Architecture

KinSvarmo will use a small modular monorepo:

- `apps/web`: user-facing marketplace, upload flow, job status, result report, and creator dashboard.
- `apps/api`: job creation, orchestration, result retrieval, and sponsor adapter coordination.
- `packages/shared`: shared TypeScript domain types and constants.
- `packages/agents`: planner, analyzer, critic, and reporter module contracts.
- `packages/axl-client`: AXL node communication wrapper.
- `packages/keeperhub`: KeeperHub workflow adapter.
- `packages/zero-g`: 0G contract, storage, compute, and explorer helpers.
- `packages/contracts`: Solidity contracts and deployment support.

The MVP should keep one golden path reliable before adding broader marketplace behavior.

## AXL-Driven Job Workflow

The API no longer needs a fake timer/event stream for job progress. A job starts when `POST /api/jobs/:id/start` sends a real `job.created` AXL message from the API node to the planner node.

Planner, analyzer, critic, and reporter run as separate worker processes. Each worker receives one AXL message, sends the primary next-step message to the next module, and sends an audit copy back to the API node for job status tracking.

The API consumes messages from its AXL node and updates job state from message types:

- `plan.generated`: planner completed, analyzer running
- `analysis.completed`: analyzer completed, critic running
- `critic.reviewed`: critic completed, reporter running
- `report.generated`: reporter completed, result stored

The API exposes the persisted state through:

- `POST /api/jobs`
- `POST /api/jobs/:id/start`
- `GET /api/jobs/:id`
- `GET /api/jobs/:id/messages`
- `GET /api/jobs/:id/result`

## Deterministic Demo Analysis

The phytochemistry demo path is intentionally deterministic. The sample input lives at `demo-data/alkaloid-sample.csv`, and the reusable analysis functions live in `packages/agents/src/phytochemistry/demo-analysis.ts`.

The analysis does not make production scientific claims. It parses a small screening dataset, computes stable summary metrics, applies a modest confidence rule, and packages the result for the reporter. The same job and dataset produce the same output every time.
