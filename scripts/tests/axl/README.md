# AXL Adapter Tests

These tests validate the KinSvarmo AXL adapter without needing real AXL nodes.

They start a mock local HTTP node that implements the AXL endpoints used by the adapter:

- `GET /topology`
- `POST /send`
- `GET /recv`

Run only the AXL adapter tests:

```bash
pnpm test:axl
```

Run the full repository test suite:

```bash
pnpm test
```
