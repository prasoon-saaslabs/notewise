#!/usr/bin/env bash
# Stage PyAI gateway + venv into Tauri resources for DMG bundling.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
GW_SRC="$ROOT/services/pyai-gateway"
STAGE="$ROOT/apps/desktop/src-tauri/resources/pyai-gateway"
BIN_DIR="$ROOT/apps/desktop/src-tauri/binaries"
ARCH="$(uname -m)"
TARGET="aarch64-apple-darwin"
if [[ "$ARCH" == "x86_64" ]]; then
  TARGET="x86_64-apple-darwin"
fi
LAUNCHER="$BIN_DIR/notewise-gateway-$TARGET"

echo "==> Staging PyAI gateway to $STAGE"
rm -rf "$STAGE"
mkdir -p "$STAGE" "$BIN_DIR"

rsync -a \
  --exclude '.venv' \
  --exclude '.data' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.env' \
  "$GW_SRC/" "$STAGE/"

if [[ ! -d "$GW_SRC/.venv" ]]; then
  echo "Creating gateway venv..."
  python3 -m venv "$GW_SRC/.venv"
  "$GW_SRC/.venv/bin/pip" install -q -r "$GW_SRC/requirements.txt"
fi

echo "==> Copying venv (this may take a moment)..."
rsync -a "$GW_SRC/.venv/" "$STAGE/.venv/"

cat > "$LAUNCHER" <<'LAUNCHER_EOF'
#!/usr/bin/env bash
set -euo pipefail

PORT="${PYAI_GATEWAY_PORT:-3002}"
HOST="${PYAI_GATEWAY_HOST:-127.0.0.1}"
DATA_DIR="${NOTEWISE_PYAI_DATA_DIR:-$HOME/Library/Application Support/Notewise/data}"
RESOURCE_DIR="${NOTEWISE_RESOURCE_DIR:-}"

if [[ -z "$RESOURCE_DIR" || ! -d "$RESOURCE_DIR/pyai-gateway" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  if [[ -d "$SCRIPT_DIR/../Resources/pyai-gateway" ]]; then
    RESOURCE_DIR="$(cd "$SCRIPT_DIR/../Resources" && pwd)"
  elif [[ -d "$SCRIPT_DIR/../../Resources/pyai-gateway" ]]; then
    RESOURCE_DIR="$(cd "$SCRIPT_DIR/../../Resources" && pwd)"
  fi
fi

GW_ROOT="$RESOURCE_DIR/pyai-gateway"
PY="$GW_ROOT/.venv/bin/python"

if [[ ! -x "$PY" ]]; then
  echo "Notewise gateway: Python runtime missing at $PY" >&2
  exit 1
fi

mkdir -p "$DATA_DIR"
export NOTEWISE_PYAI_DATA_DIR="$DATA_DIR"
export PYAI_GATEWAY_PORT="$PORT"
export PYAI_GATEWAY_HOST="$HOST"

# Optional user config (PYAI_API_KEY etc.) — never log contents
if [[ -f "$DATA_DIR/gateway.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$DATA_DIR/gateway.env"
  set +a
fi

cd "$GW_ROOT"
exec "$PY" -m uvicorn app.main:app --host "$HOST" --port "$PORT" --log-level info --no-access-log
LAUNCHER_EOF

chmod +x "$LAUNCHER"
echo "==> Gateway launcher: $LAUNCHER"
echo "==> Done. Resources size: $(du -sh "$STAGE" | cut -f1)"
