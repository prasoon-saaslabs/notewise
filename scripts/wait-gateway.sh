#!/usr/bin/env bash
# Wait until the PyAI gateway answers /health (default :3002).
set -euo pipefail

PORT="${PYAI_GATEWAY_PORT:-3002}"
URL="${GATEWAY_HEALTH_URL:-http://127.0.0.1:${PORT}/health}"
TIMEOUT="${GATEWAY_WAIT_SECS:-45}"

for ((i = 1; i <= TIMEOUT * 2; i++)); do
  if curl -sf "$URL" >/dev/null 2>&1; then
    exit 0
  fi
  sleep 0.5
done

echo "Gateway did not become ready at $URL within ${TIMEOUT}s" >&2
echo "Start it with: make run   (or check services/pyai-gateway/.env)" >&2
exit 1
