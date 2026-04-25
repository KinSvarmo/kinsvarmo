# AXL Adapter Testing

KinSvarmo talks to AXL through `packages/axl-client`. The backend should depend on this adapter instead of calling AXL endpoints directly.

The adapter supports two modes:

- `createInMemoryAxlClient`: local development, no AXL process required.
- `createHttpAxlClient`: real AXL node communication through the local HTTP API.

The implementation follows the public AXL HTTP API:

- `GET /topology` returns the node address, public key, peers, and tree.
- `POST /send` sends raw bytes to a destination peer using `X-Destination-Peer-Id`.
- `GET /recv` polls raw inbound messages and returns `204 No Content` when the queue is empty.

Sources:

- https://github.com/gensyn-ai/axl/blob/main/docs/api.md
- https://github.com/gensyn-ai/axl/blob/main/docs/configuration.md

## Automated Local Tests

Run only the AXL adapter tests:

```bash
pnpm test:axl
```

Expected result:

- in-memory client stores messages by job ID
- env variables map to participant node configs
- HTTP client calls `/send`
- HTTP client calls `/recv`
- HTTP client calls `/topology`
- health check reports configured node state
- missing peer IDs fail with a clear error
- live-node tests are skipped unless enabled

Run all repository tests:

```bash
pnpm test
```

Run TypeScript checks:

```bash
pnpm typecheck
```

## Local AXL-Compatible Nodes

The repo now includes local AXL-compatible node processes in `scripts/axl`.

These are useful before real Gensyn AXL nodes are available. They expose the same HTTP endpoints used by the adapter:

- `GET /topology`
- `POST /send`
- `GET /recv`

Start the local network:

```bash
pnpm axl:nodes
```

In another terminal, start the planner/analyzer/critic/reporter workers:

```bash
pnpm axl:workers
```

In a third terminal, run the demo message chain:

```bash
pnpm axl:demo
```

Expected workflow:

```text
api -> planner: job.created
planner -> analyzer: plan.generated
analyzer -> critic: analysis.completed
critic -> reporter: critic.reviewed
reporter -> api: report.generated
```

To avoid port conflicts, run all three commands with the same offset:

```bash
AXL_LOCAL_PORT_OFFSET=1000 pnpm axl:nodes
AXL_LOCAL_PORT_OFFSET=1000 pnpm axl:workers
AXL_LOCAL_PORT_OFFSET=1000 pnpm axl:demo
```

## Real AXL Node Smoke Test

Use this after installing and building AXL locally. The repo now has scripts that create the config files for you.

### 1. Clone and Build AXL

```bash
git clone https://github.com/gensyn-ai/axl /tmp/axl
cd /tmp/axl
make build
```

If `make build` is unavailable in your environment, the AXL configuration docs also show:

```bash
go build -o node ./cmd/node/
```

### 2. Generate Configs and Keys

```bash
pnpm axl:real:config
```

If the local simulator is already running on default ports, use:

```bash
AXL_REAL_PORT_OFFSET=1000 pnpm axl:real:config
```

The generated files are:

- `/tmp/axl/kingsvarmo-configs/api.json`
- `/tmp/axl/kingsvarmo-configs/planner.json`
- `/tmp/axl/kingsvarmo-configs/analyzer.json`
- `/tmp/axl/kingsvarmo-configs/critic.json`
- `/tmp/axl/kingsvarmo-configs/reporter.json`

Note: all real AXL nodes intentionally share the same internal `tcp_port`. Their HTTP API ports differ, but AXL routes data to a peer's virtual IPv6 address on the shared TCP transport port.

### 3. Start the Nodes

```bash
AXL_REAL_PORT_OFFSET=1000 pnpm axl:real:nodes
```

### 4. Export Env Vars

In a second terminal:

```bash
AXL_REAL_PORT_OFFSET=1000 pnpm axl:real:env
```

Then load the generated env file:

```bash
set -a; source /tmp/axl/kingsvarmo-configs/kingsvarmo-real-axl.env; set +a
```

### 5. Check Health

```bash
pnpm axl:real:check
```

Expected result:

```json
{
  "configured": ["api", "planner", "analyzer", "critic", "reporter"],
  "healthy": true
}
```

### 6. Run Live AXL Tests

```bash
pnpm axl:real:test
```

Expected result:

- live topology test passes
- live send/receive test passes
- local simulator tests still pass

### 7. Run the Worker Chain on Real AXL

Terminal 2:

```bash
pnpm axl:real:workers
```

Terminal 3:

```bash
pnpm axl:real:demo
```

Expected result:

```text
api -> planner: job.created
planner -> analyzer: plan.generated
analyzer -> critic: analysis.completed
critic -> reporter: critic.reviewed
reporter -> api: report.generated
```

### Manual Curl Check

```bash
set -a; source /tmp/axl/kingsvarmo-configs/kingsvarmo-real-axl.env; set +a
curl -s "$AXL_NODE_API_URL/topology" | jq .
curl -s "$AXL_NODE_PLANNER_URL/topology" | jq .
```

Create a small message:

```bash
cat > /tmp/axl/kingsvarmo-message.json <<'JSON'
{
  "id": "msg_manual_001",
  "jobId": "job_manual_001",
  "sender": "api",
  "receiver": "planner",
  "type": "job.created",
  "payload": {
    "agentId": "agent_alkaloid_predictor_v2"
  },
  "timestamp": "2026-04-24T00:00:00.000Z"
}
JSON
```

Send it:

```bash
curl -i -X POST "$AXL_NODE_API_URL/send" \
  -H "Content-Type: application/octet-stream" \
  -H "X-Destination-Peer-Id: $AXL_NODE_PLANNER_PEER_ID" \
  --data-binary @/tmp/axl/kingsvarmo-message.json
```

Receive it:

```bash
curl -i "$AXL_NODE_PLANNER_URL/recv"
```

Expected result:

- send returns `200 OK`
- send response includes `X-Sent-Bytes`
- receive returns either `200 OK` with the JSON body or `204 No Content` if the message has not arrived yet
- if `204`, wait one second and retry `/recv`
