#!/usr/bin/env bash
# Configure PAT-based GitHub auth for THIS repo only.
# Does not change global gh login or git credentials elsewhere.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CREDS_FILE="$REPO_ROOT/.git/gh-credentials"
PAT_FILE="$REPO_ROOT/.git/gh-pat"
GITHUB_USER="${GITHUB_USER:-prasoon-aihub}"
REPO_SLUG="${REPO_SLUG:-prasoon-aihub/notewise}"

cd "$REPO_ROOT"

read_pat() {
  if [ -n "${NOTEWISE_GITHUB_PAT:-}" ]; then
    printf '%s' "${NOTEWISE_GITHUB_PAT}"
    return
  fi
  if [ -f "${PAT_FILE}" ]; then
    cat "${PAT_FILE}"
    return
  fi
  if [ -f "${CREDS_FILE}" ]; then
    sed -n 's#https://[^:]*:\([^@]*\)@github.com.*#\1#p' "${CREDS_FILE}" | head -1
    return
  fi
  echo "Create a PAT: https://github.com/settings/tokens" >&2
  echo "  - Fine-grained: repo access to ${REPO_SLUG} only (Contents: Read and write)" >&2
  echo "  - Classic: scope 'repo' on the ${GITHUB_USER} account" >&2
  echo "" >&2
  printf 'Paste GitHub PAT: ' >&2
  local pat
  read -rs pat
  echo "" >&2
  if [ -z "${pat}" ]; then
    echo "Error: empty PAT." >&2
    exit 1
  fi
  printf 'Save PAT to .git/gh-pat for this repo? [y/N] ' >&2
  local save
  read -r save
  if [[ "${save}" =~ ^[Yy]$ ]]; then
    printf '%s' "${pat}" >"${PAT_FILE}"
    chmod 600 "${PAT_FILE}"
    echo "Saved to .git/gh-pat (local, never committed)." >&2
  fi
  printf '%s' "${pat}"
}

write_credentials() {
  local pat="$1"
  # Host-only entry: this repo uses its own credential store file, so we do not
  # need useHttpPath (which breaks when Git appends ".git" to the remote path).
  printf 'https://%s:%s@github.com\n' "${GITHUB_USER}" "${pat}" >"${CREDS_FILE}"
  chmod 600 "${CREDS_FILE}"
}

PAT="$(read_pat)"
write_credentials "${PAT}"

git config --local remote.origin.url "https://github.com/${REPO_SLUG}.git"
# Use only this repo's credential file — skip macOS keychain / global gh helpers.
git config --local --replace-all credential.helper "store --file=${CREDS_FILE}"
git config --local --unset-all credential.useHttpPath 2>/dev/null || true

echo ""
echo "✓ PAT auth configured for https://github.com/${REPO_SLUG}"
echo "  Git credentials: .git/gh-credentials (local only)"
echo "  Optional PAT cache: .git/gh-pat (local only)"
echo "  Global gh / other repos: unchanged"
echo ""
echo "Test: git push -u origin main"
echo "gh CLI:  ./scripts/gh-repo.sh pr view"
