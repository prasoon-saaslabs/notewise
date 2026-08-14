#!/usr/bin/env bash
# Stage PyAI gateway + portable vendor deps into Tauri resources for DMG bundling.
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
  --exclude 'vendor' \
  --exclude '.data' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.env' \
  --exclude 'oauth.env' \
  "$GW_SRC/" "$STAGE/"

# Ship Google OAuth client config with the DMG (not the PyAI user key).
# Login page enables Google only when GOOGLE_CLIENT_ID + SECRET are present.
OAUTH_OUT="$STAGE/oauth.env"
: > "$OAUTH_OUT"
if [[ -f "$GW_SRC/.env" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    case "$line" in
      GOOGLE_CLIENT_ID=*|GOOGLE_CLIENT_SECRET=*|GOOGLE_REDIRECT_URI=*|GOOGLE_SCOPES=*|AUTH_JWT_SECRET=*)
        printf '%s\n' "$line" >> "$OAUTH_OUT"
        ;;
    esac
  done < "$GW_SRC/.env"
fi
if grep -q '^GOOGLE_CLIENT_ID=.\+' "$OAUTH_OUT" && grep -q '^GOOGLE_CLIENT_SECRET=.\+' "$OAUTH_OUT"; then
  echo "==> Staged Google OAuth client for desktop sign-in"
else
  echo "==> WARNING: GOOGLE_CLIENT_ID/SECRET missing in services/pyai-gateway/.env"
  echo "    DMG Google login will stay disabled. See docs/USAGE.md#google-calendar-setup"
fi

if [[ ! -d "$GW_SRC/.venv" ]]; then
  echo "Creating gateway venv..."
  python3 -m venv "$GW_SRC/.venv"
  "$GW_SRC/.venv/bin/pip" install -q -r "$GW_SRC/requirements.txt"
fi

VENV_PY="$GW_SRC/.venv/bin/python"
if [[ ! -x "$VENV_PY" ]]; then
  echo "Missing gateway venv at $GW_SRC/.venv — run: make setup" >&2
  exit 1
fi

PYVER="$("$VENV_PY" -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')"
SITE_PACKAGES="$GW_SRC/.venv/lib/python${PYVER}/site-packages"
if [[ ! -d "$SITE_PACKAGES" ]]; then
  echo "Missing site-packages at $SITE_PACKAGES" >&2
  exit 1
fi

echo "==> Copying vendor site-packages (python${PYVER})..."
mkdir -p "$STAGE/vendor"
rsync -a "$SITE_PACKAGES/" "$STAGE/vendor/"
printf '%s\n' "$PYVER" > "$STAGE/.python-version"
cp "$ROOT/apps/desktop/scripts/find-gateway-python.sh" "$STAGE/find-gateway-python.sh"

cat > "$LAUNCHER" <<'LAUNCHER_EOF'
#!/usr/bin/env bash
set -euo pipefail

PORT="${PYAI_GATEWAY_PORT:-3002}"
HOST="${PYAI_GATEWAY_HOST:-127.0.0.1}"
DATA_DIR="${NOTEWISE_PYAI_DATA_DIR:-$HOME/Library/Application Support/com.notewise.app/data}"
RESOURCE_DIR="${NOTEWISE_RESOURCE_DIR:-}"
GW_ROOT="${NOTEWISE_GATEWAY_ROOT:-}"
LOG_FILE="${NOTEWISE_GATEWAY_LOG:-$DATA_DIR/gateway-sidecar.log}"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >>"$LOG_FILE"
}

resolve_gw_root() {
  if [[ -n "$GW_ROOT" && -d "$GW_ROOT/app" ]]; then
    echo "$GW_ROOT"
    return 0
  fi

  local candidate
  for candidate in \
    "$RESOURCE_DIR/pyai-gateway" \
    "$RESOURCE_DIR/resources/pyai-gateway"; do
    if [[ -n "$RESOURCE_DIR" && -d "$candidate/app" ]]; then
      echo "$candidate"
      return 0
    fi
  done

  local script_dir base
  script_dir="$(cd "$(dirname "$0")" && pwd)"
  for base in "$script_dir/../Resources" "$script_dir/../../Resources"; do
    for candidate in "$base/pyai-gateway" "$base/resources/pyai-gateway"; do
      if [[ -d "$candidate/app" ]]; then
        echo "$(cd "$candidate" && pwd)"
        return 0
      fi
    done
  done

  return 1
}

mkdir -p "$DATA_DIR"
: >>"$LOG_FILE"

if ! GW_ROOT="$(resolve_gw_root)"; then
  log "ERROR gateway bundle missing (resource_dir=${RESOURCE_DIR:-unset})"
  echo "Notewise gateway: bundle missing under Resources" >&2
  exit 1
fi

# GUI apps often only see /usr/bin/python3 (3.9). Prefer Homebrew + exact ABI.
export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH:-/usr/bin:/bin}"

FINDER="$GW_ROOT/find-gateway-python.sh"
if [[ ! -f "$FINDER" ]]; then
  log "ERROR missing find-gateway-python.sh under $GW_ROOT"
  echo "Notewise gateway: python finder missing from bundle" >&2
  exit 1
fi
# shellcheck source=apps/desktop/scripts/find-gateway-python.sh
source "$FINDER"

REQUIRED=""
if [[ -f "$GW_ROOT/.python-version" ]]; then
  REQUIRED="$(tr -d '[:space:]' < "$GW_ROOT/.python-version")"
fi

if ! PY="$(find_gateway_python "$REQUIRED")"; then
  log "ERROR python ${REQUIRED:-3.10+} not found (need Homebrew, not Xcode 3.9)"
  echo "Notewise gateway: Python ${REQUIRED:-3.10+} not found. Install with: brew install python@${REQUIRED:-3.12}" >&2
  exit 1
fi

VENDOR="$GW_ROOT/vendor"
if [[ ! -d "$VENDOR" ]]; then
  log "ERROR vendor deps missing at $VENDOR"
  echo "Notewise gateway: vendor deps missing at $VENDOR" >&2
  exit 1
fi

export NOTEWISE_PYAI_DATA_DIR="$DATA_DIR"
export NOTEWISE_DESKTOP_GATEWAY=1
export PYAI_GATEWAY_PORT="$PORT"
export PYAI_GATEWAY_HOST="$HOST"
export PYTHONPATH="${VENDOR}:${GW_ROOT}"
export PYTHONNOUSERSITE=1
unset PYTHONHOME

if [[ -f "$GW_ROOT/oauth.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$GW_ROOT/oauth.env"
  set +a
fi
if [[ -f "$DATA_DIR/gateway.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$DATA_DIR/gateway.env"
  set +a
fi

log "starting gateway gw_root=$GW_ROOT py=$("$PY" --version 2>&1 | tr '\n' ' ') port=$PORT"

cd "$GW_ROOT"
exec "$PY" -m uvicorn app.main:app --host "$HOST" --port "$PORT" --log-level info --no-access-log >>"$LOG_FILE" 2>&1
LAUNCHER_EOF

chmod +x "$LAUNCHER"
echo "==> Gateway launcher: $LAUNCHER"
echo "==> Done. Resources size: $(du -sh "$STAGE" | cut -f1)"
