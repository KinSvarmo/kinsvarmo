# Sponsor Mapping

## 0G

Owned by the 0G integration workstream:

- Agent publication through a minimal onchain registry.
- Agent metadata or intelligence reference stored through a 0G-linked storage path.
- Explorer-visible contract address and agent record.

## Gensyn AXL

Implemented use:

- Planner, analyzer, critic, and reporter run as separate module processes.
- Modules communicate through AXL-backed messages.
- Job status UI renders sender, receiver, timestamp, and message type.

Current implementation:

- The API starts a job by sending `job.created` through the AXL adapter.
- Each worker sends the primary workflow message to the next worker over AXL.
- Each worker also sends an AXL audit copy to the API so backend state is driven by received AXL messages.
- The UI displays the true route for audit copies, so judges can see `planner → analyzer → critic → reporter`.
- Real Gensyn AXL nodes can be used through `pnpm axl:real:*` scripts.

## KeeperHub

Implemented use:

- Job execution enters a KeeperHub-tracked workflow.
- The API stores the KeeperHub run ID.
- Job status UI shows workflow state and logs.

Current implementation:

- `pnpm keeperhub:create-webhook` creates and enables the KeeperHub workflow.
- `pnpm keeperhub:test` triggers the real webhook and verifies action-node execution.
- The backend creates a KeeperHub run before starting AXL dispatch.
- The job page displays KeeperHub execution ID, workflow ID, node statuses, and recent logs.
