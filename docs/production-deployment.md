# KinSvarmo Production Deployment

This setup gives the hackathon demo a public URL while keeping long-running execution services out of Vercel serverless functions.

## Target Shape

```text
Vercel
  apps/web
  public UI

Railway, Render, Fly, or VPS
  apps/api
  local AXL nodes or real AXL client connection
  planner/analyzer/critic/reporter workers
  KeeperHub calls
  0G compute and storage calls

KeeperHub
  workflow execution and logs

0G
  iNFT contract, storage, compute, wallet authorization
```

## Why Vercel Is Only The Web App

Vercel is excellent for the Next.js interface. It is not the right place to run AXL nodes or workers because those processes need to stay alive, hold queues, and continuously listen for messages.

Use Vercel for:

- marketplace
- creator page
- workplace pages
- job/result UI
- wallet connection

Use a long-running host for:

- Fastify API
- AXL node processes
- agent workers
- KeeperHub integration
- 0G compute calls

## Step 1: Deploy The API Stack

Use Railway, Render, Fly.io, or a VPS. The repo includes:

```text
Dockerfile.api
railway.json
scripts/deploy/start-api-stack.ts
```

The container starts:

- local AXL nodes
- agent workers
- Fastify API

For Railway:

1. Create a new Railway project from the GitHub repo.
2. Use Dockerfile deployment.
3. Railway should detect `railway.json`.
4. Set environment variables from `.env.production.example`.
5. Deploy.
6. Confirm the health endpoint:

```text
https://YOUR_API_HOST/health
```

For a generic Docker host:

```bash
docker build -f Dockerfile.api -t kingsvarmo-api .
docker run --env-file .env.production -p 4000:4000 kingsvarmo-api
```

## Step 2: Deploy The Web App To Vercel

The repo includes `vercel.json`.

Recommended Vercel settings:

```text
Framework: Next.js
Install command: corepack enable && pnpm install --frozen-lockfile
Build command: pnpm --filter @kingsvarmo/web build
Output directory: apps/web/.next
```

Set these Vercel environment variables:

```text
NEXT_PUBLIC_APP_NAME=KinSvarmo
NEXT_PUBLIC_API_URL=https://YOUR_API_HOST
NEXT_PUBLIC_CHAIN_ID=16602
NEXT_PUBLIC_INFT_REGISTRY_ADDRESS=0xYourRegistry
```

Do not put private keys, KeeperHub secrets, or 0G compute API secrets in Vercel public variables.

## Step 3: Connect CORS

On the API host, set:

```text
WEB_ORIGIN=https://YOUR_VERCEL_APP.vercel.app
CORS_ORIGINS=https://YOUR_VERCEL_APP.vercel.app,https://YOUR_CUSTOM_DOMAIN
```

Restart the API after changing these.

## Step 4: AXL Modes

### Simple Hosted Hackathon Mode

Use this first.

```text
AXL_TRANSPORT=local
AXL_START_LOCAL_NODES=1
AXL_START_WORKERS=1
```

This runs separate local AXL-compatible node processes inside the API container. It is public, repeatable, and visible in the UI, but it is not a distributed multi-machine AXL deployment.

### Real AXL Node Mode

Use this only if you have deployed real Gensyn AXL nodes separately.

```text
AXL_TRANSPORT=real
AXL_START_LOCAL_NODES=0
AXL_START_WORKERS=1
AXL_NODE_API_URL=https://...
AXL_NODE_API_PEER_ID=...
AXL_NODE_PLANNER_URL=https://...
AXL_NODE_PLANNER_PEER_ID=...
AXL_NODE_ANALYZER_URL=https://...
AXL_NODE_ANALYZER_PEER_ID=...
AXL_NODE_CRITIC_URL=https://...
AXL_NODE_CRITIC_PEER_ID=...
AXL_NODE_REPORTER_URL=https://...
AXL_NODE_REPORTER_PEER_ID=...
```

In this mode, the API and workers talk to external AXL node APIs.

## Step 5: KeeperHub

Set these on the API host:

```text
KEEPERHUB_BASE_URL=https://app.keeperhub.com
KEEPERHUB_API_KEY=kh_...
KEEPERHUB_WEBHOOK_KEY=wfb_...
KEEPERHUB_WORKFLOW_ID=...
KEEPERHUB_WEBHOOK_RUN_PATH=/api/workflows/:workflowId/webhook
```

Verify:

```bash
pnpm keeperhub:test
```

## Step 6: 0G

Set these on the API host:

```text
ZERO_G_RPC_URL=
ZERO_G_EXPLORER_URL=
ZERO_G_STORAGE_ENDPOINT=
ZERO_G_PRIVATE_KEY=
ZERO_G_COMPUTE_PROVIDER_ADDRESS=
ZERO_G_COMPUTE_SERVICE_URL=
ZERO_G_COMPUTE_API_SECRET=
ZERO_G_COMPUTE_MODEL=qwen/qwen-2.5-7b-instruct
OG_COMPUTE_URL=
OG_COMPUTE_API_KEY=
OG_COMPUTE_MODEL=qwen/qwen-2.5-7b-instruct
```

Set this on Vercel:

```text
NEXT_PUBLIC_INFT_REGISTRY_ADDRESS=0xYourRegistry
NEXT_PUBLIC_CHAIN_ID=16602
```

## Step 7: Smoke Test

After both deployments are live:

1. Open the Vercel URL.
2. Go to `System`.
3. Confirm API, KeeperHub, AXL, and 0G status.
4. Go to `Agents`.
5. Open an agent.
6. Upload a CSV.
7. Start the run.
8. Open job status.
9. Confirm AXL messages appear.
10. Confirm KeeperHub state appears.
11. Open the result.

## Current Production Limitation

The API stack still uses process memory for jobs and workplace records. This is acceptable for a hackathon public demo, but not for durable production.

Next hardening step:

- add Postgres
- store jobs, messages, results, workplace tasks, and submissions in the database
- make workers recover unfinished jobs after restart
