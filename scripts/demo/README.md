# Demo Scripts

## Local Full Stack

Start local AXL-compatible nodes, agent workers, API, and web app:

```bash
pnpm demo:local
```

Check the local API and AXL node topology endpoints:

```bash
pnpm demo:check
```

Before running the UI demo, verify KeeperHub separately:

```bash
pnpm keeperhub:test
```

Then open:

```text
http://localhost:3000/agents/1
```
