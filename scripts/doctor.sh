#!/usr/bin/env bash
# Environment check for web + desktop dev (PyAI gateway on :3002).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GW="$ROOT/services/pyai-gateway"
PORT="${PYAI_GATEWAY_PORT:-3002}"
HEALTH="http://127.0.0.1:${PORT}/health"

pass=0
warn=0
fail=0
info=0

ok()   { echo "  ok   $1"; pass=$((pass + 1)); }
warn() { echo "  warn $1"; warn=$((warn + 1)); }
bad()  { echo "  fail $1"; fail=$((fail + 1)); }
note() { echo "  note $1"; info=$((info + 1)); }

echo "Notewise doctor"
echo "==============="
echo "repo: $ROOT"
echo

echo "Toolchain"
if command -v python3 >/dev/null; then
  ok "python3 $(python3 --version 2>&1 | awk '{print $2}')"
else
  bad "python3 not found"
fi
command -v node >/dev/null && ok "node $(node -v)" || bad "node missing (need 20+)"
command -v pnpm >/dev/null && ok "pnpm $(pnpm -v)" || bad "pnpm missing (npm i -g pnpm)"
command -v rustc >/dev/null && ok "rustc $(rustc -V | awk '{print $2}')" || warn "rustc missing (optional for web-only)"
command -v cargo >/dev/null && ok "cargo $(cargo -V | awk '{print $2}')" || warn "cargo missing (needed for desktop dev / DMG)"

echo
echo "Gateway (services/pyai-gateway)"
if [[ -x "$GW/.venv/bin/python" ]]; then
  ok "venv present"
else
  bad "venv missing — run: make setup"
fi

if [[ -f "$GW/.env" ]]; then
  if grep -qE '^PYAI_API_KEY=.+$' "$GW/.env" 2>/dev/null; then
    ok "PYAI_API_KEY set in .env"
  else
    warn "PYAI_API_KEY empty — sandbox mint on first run, or add key from api.pyai.com"
  fi
else
  warn "no .env — run: make setup"
fi

if curl -sf "$HEALTH" >/dev/null 2>&1; then
  ok "gateway reachable at :$PORT"
else
  warn "gateway not running — run: make run (terminal 1) before make web / make desktop"
fi

echo
echo "Desktop bundle (DMG only)"
STAGE="$ROOT/apps/desktop/src-tauri/resources/pyai-gateway"
if [[ -d "$STAGE/vendor" ]]; then
  ok "staged vendor deps ($(du -sh "$STAGE/vendor" 2>/dev/null | awk '{print $1}'))"
else
  warn "vendor not staged — run: make stage-gateway before build-dmg"
fi

LAUNCHER="$ROOT/apps/desktop/src-tauri/binaries/notewise-gateway-aarch64-apple-darwin"
if [[ -x "$LAUNCHER" ]]; then
  ok "sidecar launcher present"
else
  warn "sidecar launcher missing — run: make stage-gateway"
fi

echo
if [[ "$(uname -s)" == "Darwin" ]]; then
  echo "Permissions (macOS)"
  note "Microphone — grant when Notewise prompts (Settings → Privacy → Microphone)"
  note "Screen Recording — optional; captures meeting audio without tab sharing"
  note "doctor cannot read Notewise TCC state from the shell (permissions are per-app)"
else
  echo "Permissions"
  note "macOS desktop permissions apply on Darwin only"
fi

echo
if [[ "$info" -gt 0 ]]; then
  echo "Summary: $pass ok, $warn warn, $fail fail ($info note)"
else
  echo "Summary: $pass ok, $warn warn, $fail fail"
fi
[[ "$fail" -eq 0 ]]
