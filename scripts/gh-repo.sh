#!/usr/bin/env bash
# Run gh CLI using this repo's PAT (does not switch global gh auth).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PAT_FILE="$REPO_ROOT/.git/gh-pat"
CREDS_FILE="$REPO_ROOT/.git/gh-credentials"

load_pat() {
  if [ -n "${NOTEWISE_GITHUB_PAT:-}" ]; then
    printf '%s' "${NOTEWISE_GITHUB_PAT}"
    return
  fi
  if [ -f "${PAT_FILE}" ]; then
    cat "${PAT_FILE}"
    return
  fi
  if [ -f "${CREDS_FILE}" ]; then
    # Extract token from https://user:TOKEN@github.com/...
    sed -n 's#https://[^:]*:\([^@]*\)@github.com/.*#\1#p' "${CREDS_FILE}" | head -1
    return
  fi
  echo "Run ./scripts/setup-github-auth.sh first (PAT for this repo)." >&2
  exit 1
}

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: https://cli.github.com/" >&2
  exit 1
fi

export GH_TOKEN="$(load_pat)"
if [ -z "${GH_TOKEN}" ]; then
  echo "No PAT found. Run ./scripts/setup-github-auth.sh" >&2
  exit 1
fi

exec gh "$@"
