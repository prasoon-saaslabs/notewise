#!/usr/bin/env bash
# Canonical PyAI gateway runner — used by make, pnpm, and desktop dev helpers.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GW="${NOTEWISE_GATEWAY_DIR:-$ROOT/services/pyai-gateway}"
PORT="${PYAI_GATEWAY_PORT:-3002}"
HOST="${PYAI_GATEWAY_HOST:-127.0.0.1}"

if [[ ! -d "$GW" ]]; then
  echo "Gateway not found at $GW" >&2
  echo "Run from the notewise repo root, or set NOTEWISE_GATEWAY_DIR." >&2
  exit 1
fi

if [[ ! -x "$GW/.venv/bin/python" ]]; then
  echo "Gateway venv missing at $GW/.venv" >&2
  echo "Run once: make setup" >&2
  exit 1
fi

if [[ -f "$GW/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$GW/.env"
  set +a
fi

cd "$GW"
exec .venv/bin/python -m uvicorn app.main:app \
  --host "$HOST" \
  --port "$PORT" \
  --log-level info \
  --no-access-log
