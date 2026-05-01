# Local AXL Nodes

This folder contains local AXL-compatible node tooling for the KinSvarmo demo.

It is not a replacement for Gensyn AXL. It mirrors the AXL HTTP API endpoints that the backend uses so the product can run locally before real AXL infra is available.

Implemented endpoints:

- `GET /topology`
- `POST /send`
- `GET /recv`

Internal local endpoint:

- `POST /__enqueue`

## Run the Local AXL Network

Terminal 1:

```bash
pnpm axl:nodes
```

This starts five separate local node processes:

- API node: `http://127.0.0.1:9002`
- Planner node: `http://127.0.0.1:9012`
- Analyzer node: `http://127.0.0.1:9022`
- Critic node: `http://127.0.0.1:9032`
- Reporter node: `http://127.0.0.1:9042`

## Run Agent Workers

Terminal 2:

```bash
pnpm axl:workers
```

This starts four separate worker processes:

- planner
- analyzer
- critic
- reporter

Each worker polls its own local AXL node through `/recv` and sends the next workflow message through `/send`.

## Run a Demo Job

Terminal 3:

```bash
pnpm axl:demo
```

Expected message path:

```text
api -> planner: job.created
planner -> analyzer: plan.generated
analyzer -> critic: analysis.completed
critic -> reporter: critic.reviewed
reporter -> api: report.generated
```

## Avoid Port Conflicts

Use `AXL_LOCAL_PORT_OFFSET` when you need a second local network:

```bash
AXL_LOCAL_PORT_OFFSET=1000 pnpm axl:nodes
AXL_LOCAL_PORT_OFFSET=1000 pnpm axl:workers
AXL_LOCAL_PORT_OFFSET=1000 pnpm axl:demo
```

The API node would then run on `10002`, planner on `10012`, and so on.

## Tests

```bash
pnpm test:axl
```

The test suite starts local node processes and worker processes automatically.

## Real Gensyn AXL Nodes

Use this when `/tmp/axl/node` exists from the official Gensyn AXL repo.

First generate configs:

```bash
pnpm axl:real:config
```

If your local simulator is already running on ports `9002`, `9012`, `9022`, `9032`, and `9042`, use an offset:

```bash
AXL_REAL_PORT_OFFSET=1000 pnpm axl:real:config
```

Start real AXL nodes in terminal 1:

```bash
AXL_REAL_PORT_OFFSET=1000 pnpm axl:real:nodes
```

Generate env vars in terminal 2:

```bash
AXL_REAL_PORT_OFFSET=1000 pnpm axl:real:env
```

Check real node health:

```bash
pnpm axl:real:check
```

Run live real-node tests:

```bash
pnpm axl:real:test
```

Run workers on real AXL in terminal 2:

```bash
pnpm axl:real:workers
```

Run the real AXL demo in terminal 3:

```bash
pnpm axl:real:demo
```

Important: real AXL nodes use different HTTP API ports, but the generated config gives every node the same internal `tcp_port`. This is intentional. AXL sends messages to a peer's virtual IPv6 address on that shared transport port.

## Remote Reporter Proof Mode

Use this mode to prove that one agent can run outside the hosted backend while the job still completes through AXL.

Railway should run only these AXL nodes and workers:

```env
AXL_TRANSPORT=real
AXL_START_REAL_NODES=1
AXL_START_LOCAL_NODES=0
AXL_START_WORKERS=1
AXL_REAL_NODE_PARTICIPANTS=api,planner,analyzer,critic
AXL_WORKERS=planner,analyzer,critic
AXL_REAL_HUB_LISTEN_HOST=0.0.0.0
```

Add a Railway TCP proxy for port `9101`. Use the generated host and port as `AXL_REMOTE_SEED_PEER` on the remote machine.

Remote terminal 1:

```bash
AXL_REMOTE_SEED_PEER=tls://RAILWAY_TCP_HOST:RAILWAY_TCP_PORT pnpm axl:remote:reporter:node
```

Remote terminal 2:

```bash
export AXL_REMOTE_API_PEER_ID="$(curl -s https://kingsvarmoapi-production.up.railway.app/api/axl/topology | node -e 'let s=\"\"; process.stdin.on(\"data\", d => s += d); process.stdin.on(\"end\", () => console.log(JSON.parse(s).nodes.find((node) => node.participant === \"api\").peerId));')"
pnpm axl:remote:reporter:env
set -a; source /tmp/axl/kingsvarmo-configs/kinsvarmo-remote-reporter.env; set +a
pnpm axl:remote:reporter:worker
```

Copy the printed `AXL_NODE_REPORTER_PEER_ID` into Railway, redeploy, then start a UI job. The job should wait at reporter until the remote reporter terminal is running.
