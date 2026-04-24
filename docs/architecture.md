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
