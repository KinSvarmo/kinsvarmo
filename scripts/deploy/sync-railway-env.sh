#!/usr/bin/env bash
set -euo pipefail

SERVICE="${RAILWAY_SERVICE:-@kingsvarmo/api}"
ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"
ENV_FILE="${RAILWAY_ENV_FILE:-.env.railway}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

if ! pnpm dlx @railway/cli whoami >/dev/null 2>&1; then
  echo "Railway CLI is not logged in. Run:"
  echo "pnpm dlx @railway/cli login"
  exit 1
fi

echo "Removing stale local/mock AXL variables from Railway..."
for key in \
  AXL_LOCAL_PORT_OFFSET \
  AXL_NODE_API_URL \
  AXL_NODE_API_PEER_ID \
  AXL_NODE_PLANNER_URL \
  AXL_NODE_PLANNER_PEER_ID \
  AXL_NODE_ANALYZER_URL \
  AXL_NODE_ANALYZER_PEER_ID \
  AXL_NODE_CRITIC_URL \
  AXL_NODE_CRITIC_PEER_ID \
  AXL_NODE_REPORTER_URL
do
  pnpm dlx @railway/cli variable delete "$key" \
    --service "$SERVICE" \
    --environment "$ENVIRONMENT" \
    --json >/dev/null 2>&1 || true
done

echo "Syncing variables from $ENV_FILE to Railway service $SERVICE..."
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  pnpm dlx @railway/cli variable set "$line" \
    --service "$SERVICE" \
    --environment "$ENVIRONMENT" \
    --skip-deploys >/dev/null
done < "$ENV_FILE"

echo "Redeploying latest source..."
pnpm dlx @railway/cli redeploy \
  --service "$SERVICE" \
  --environment "$ENVIRONMENT" \
  --from-source \
  --yes

echo "Done. Check deploy logs for: AXL transport: real"
