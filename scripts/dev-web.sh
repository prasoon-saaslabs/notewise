#!/usr/bin/env bash
# One command: gateway + web UI (Ctrl+C stops both).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WEB_PORT="${VITE_DEV_PORT:-5173}"
GW_PID=""

cleanup() {
  if [[ -n "$GW_PID" ]]; then
    kill "$GW_PID" 2>/dev/null || true
    wait "$GW_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

free_web_port() {
  local pids pid
  pids="$(lsof -nP -iTCP:"$WEB_PORT" -sTCP:LISTEN -t 2>/dev/null || true)"
  [[ -z "$pids" ]] && return 0

  for pid in $pids; do
    if lsof -p "$pid" 2>/dev/null | grep -qE 'notewise/apps/web|vite/bin/vite'; then
      echo "==> Stopping stale web dev server (pid $pid)…"
    else
      echo "==> Stopping process on port $WEB_PORT (pid $pid)…"
    fi
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  done

  sleep 0.3
  if lsof -nP -iTCP:"$WEB_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Could not free port $WEB_PORT" >&2
    exit 1
  fi
}

if curl -sf "http://127.0.0.1:${PYAI_GATEWAY_PORT:-3002}/health" >/dev/null 2>&1; then
  echo "==> Gateway already running on :${PYAI_GATEWAY_PORT:-3002}"
else
  echo "==> Starting gateway…"
  bash "$ROOT/scripts/gateway.sh" &
  GW_PID=$!
  bash "$ROOT/scripts/wait-gateway.sh"
  echo "==> Gateway ready"
fi

free_web_port

echo "==> Starting web UI on http://127.0.0.1:${WEB_PORT}"
exec env VITE_PROXY_TARGET="http://127.0.0.1:${PYAI_GATEWAY_PORT:-3002}" \
  pnpm --filter @notewise/web dev
