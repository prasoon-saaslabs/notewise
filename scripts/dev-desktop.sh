#!/usr/bin/env bash
# Desktop dev: reuse or start repo gateway, then Tauri (same stack as web dev).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NOTEWISE_REPO_ROOT="$ROOT"

GW_PID=""
cleanup() {
  if [[ -n "$GW_PID" ]]; then
    kill "$GW_PID" 2>/dev/null || true
    wait "$GW_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if [[ ! -x "$ROOT/services/pyai-gateway/.venv/bin/python" ]]; then
  echo "Run once: make setup" >&2
  exit 1
fi

if pgrep -f '/Applications/Notewise.app/' >/dev/null 2>&1; then
  echo "==> WARNING: /Applications/Notewise.app is still running (menu bar)."
  echo "    Quit it (tray → Quit Notewise) before desktop dev, or it will steal port 3002."
fi

if curl -sf "http://127.0.0.1:${PYAI_GATEWAY_PORT:-3002}/health" >/dev/null 2>&1; then
  echo "==> Gateway already running — desktop dev will attach to it"
else
  echo "==> Starting repo gateway (same as make run)…"
  bash "$ROOT/scripts/gateway.sh" &
  GW_PID=$!
  bash "$ROOT/scripts/wait-gateway.sh"
  echo "==> Gateway ready"
fi

echo "==> Starting Notewise desktop (Tauri dev)"
echo "    API key: services/pyai-gateway/.env  or  onboarding UI"
cd "$ROOT/apps/desktop"
exec env NOTEWISE_REPO_ROOT="$ROOT" pnpm tauri:dev
