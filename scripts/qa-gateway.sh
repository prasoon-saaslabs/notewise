#!/usr/bin/env bash
# Smoke test PyAI gateway + Vite proxy (expects gateway on :3002).
set -euo pipefail

API="${GATEWAY_URL:-http://127.0.0.1:3002}"
PROXY="${WEB_PROXY_URL:-http://127.0.0.1:5173/api}"

echo "== PyAI gateway QA =="

curl -sf "$API/health" >/dev/null && echo "PASS  gateway /health" || { echo "FAIL  gateway /health"; exit 1; }

BODY=$(curl -sf "$API/health")
echo "$BODY" | grep -q 'pyai-gateway' && echo "PASS  pyai-gateway identity" || echo "WARN  unexpected health payload"

if curl -sf "$PROXY/health" >/dev/null 2>&1; then
  echo "PASS  vite proxy /api/health"
else
  echo "SKIP  vite proxy (web dev not running on :5173)"
fi

curl -sf "$API/providers" >/dev/null && echo "PASS  /providers" || echo "WARN  /providers"
curl -sf "$API/meetings" >/dev/null && echo "PASS  /meetings" || echo "WARN  /meetings"

echo "Done."
