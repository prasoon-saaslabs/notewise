#!/usr/bin/env bash
# One command: gateway + web UI (Ctrl+C stops both).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GW_PID=""
cleanup() {
  if [[ -n "$GW_PID" ]]; then
    kill "$GW_PID" 2>/dev/null || true
    wait "$GW_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if curl -sf "http://127.0.0.1:${PYAI_GATEWAY_PORT:-3002}/health" >/dev/null 2>&1; then
  echo "==> Gateway already running on :${PYAI_GATEWAY_PORT:-3002}"
else
  echo "==> Starting gateway…"
  bash "$ROOT/scripts/gateway.sh" &
  GW_PID=$!
  bash "$ROOT/scripts/wait-gateway.sh"
  echo "==> Gateway ready"
fi

echo "==> Starting web UI on http://127.0.0.1:5173"
exec env VITE_PROXY_TARGET="http://127.0.0.1:${PYAI_GATEWAY_PORT:-3002}" \
  pnpm --filter @notewise/web dev
