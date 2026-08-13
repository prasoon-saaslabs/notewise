#!/usr/bin/env bash
# Ensure bundled gateway matches production OAuth requirements (desktop loopback).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGED="$ROOT/apps/desktop/src-tauri/resources/pyai-gateway"
AUTH="$STAGED/app/routes/auth.py"
CONFIG="$STAGED/app/config.py"

fail() {
  echo "FAIL  $1" >&2
  exit 1
}

[[ -f "$AUTH" ]] || fail "staged auth.py missing — run: make stage-gateway"
[[ -f "$CONFIG" ]] || fail "staged config.py missing — run: make stage-gateway"

grep -q 'client: str = Query' "$AUTH" || fail "staged gateway missing client=desktop OAuth param"
grep -q 'put_oauth_state' "$AUTH" || fail "staged gateway missing persisted OAuth state"
grep -q 'auth_callback_redirect' "$CONFIG" || fail "staged gateway missing loopback redirect helper"
grep -q '17654' "$CONFIG" || fail "staged gateway missing OAuth loopback port default"

echo "PASS  staged gateway includes desktop OAuth loopback support"
