"""Persist Google OAuth CSRF state across gateway restarts (desktop prod)."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from app.config import settings

_STATE_PATH = settings.data_dir / "oauth_states.json"
_TTL_SEC = 600


def _read() -> dict[str, dict[str, Any]]:
    if not _STATE_PATH.exists():
        return {}
    try:
        raw = json.loads(_STATE_PATH.read_text(encoding="utf-8"))
        if isinstance(raw, dict):
            return raw
    except (OSError, json.JSONDecodeError):
        pass
    return {}


def _write(states: dict[str, dict[str, Any]]) -> None:
    _STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    _STATE_PATH.write_text(json.dumps(states), encoding="utf-8")


def _prune(states: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    now = time.time()
    return {
        key: value
        for key, value in states.items()
        if isinstance(value, dict) and now - float(value.get("created_at", 0)) < _TTL_SEC
    }


def put_oauth_state(state: str, *, user_id: str, client: str) -> None:
    states = _prune(_read())
    states[state] = {
        "user_id": user_id,
        "client": client,
        "created_at": time.time(),
    }
    _write(states)


def pop_oauth_state(state: str) -> dict[str, str] | None:
    states = _prune(_read())
    entry = states.pop(state, None)
    _write(states)
    if not isinstance(entry, dict):
        return None
    return {
        "user_id": str(entry.get("user_id") or ""),
        "client": str(entry.get("client") or "web"),
    }
