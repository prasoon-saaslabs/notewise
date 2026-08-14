#!/usr/bin/env bash
# Resolve a Python interpreter that can import vendored gateway deps.
# macOS GUI apps often have a PATH that only includes /usr/bin/python3 (3.9),
# which cannot load current uvicorn / pydantic wheels.
#
# Usage: find_gateway_python [major.minor]
# Prints the interpreter path on success.

find_gateway_python() {
  local required="${1:-}"
  local bin mm major minor
  local -a versions candidates

  if [[ -n "$required" ]]; then
    versions=("$required")
  else
    versions=(3.14 3.13 3.12 3.11 3.10)
  fi

  candidates=()
  for mm in "${versions[@]}"; do
    candidates+=(
      "/opt/homebrew/bin/python${mm}"
      "/opt/homebrew/opt/python@${mm}/bin/python${mm}"
      "/opt/homebrew/opt/python@${mm}/bin/python3"
      "/usr/local/bin/python${mm}"
      "/usr/local/opt/python@${mm}/bin/python${mm}"
    )
    if command -v "python${mm}" >/dev/null 2>&1; then
      candidates+=("$(command -v "python${mm}")")
    fi
  done
  candidates+=(
    /opt/homebrew/bin/python3
    /usr/local/bin/python3
  )
  if command -v python3 >/dev/null 2>&1; then
    candidates+=("$(command -v python3)")
  fi
  candidates+=(/usr/bin/python3)

  local seen=""
  for bin in "${candidates[@]}"; do
    [[ -n "$bin" && -x "$bin" ]] || continue
    case " $seen " in
      *" $bin "*) continue ;;
    esac
    seen+=" $bin"
    mm="$("$bin" -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null)" || continue
    IFS=. read -r major minor <<<"$mm"
    if (( major < 3 || (major == 3 && minor < 10) )); then
      continue
    fi
    if [[ -n "$required" && "$mm" != "$required" ]]; then
      continue
    fi
    echo "$bin"
    return 0
  done
  return 1
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  set -euo pipefail
  if ! find_gateway_python "${1:-}"; then
    echo "No compatible Python ${1:-3.10+} found (Homebrew: brew install python@${1:-3.12})" >&2
    exit 1
  fi
fi
