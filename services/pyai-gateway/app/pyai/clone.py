from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.pyai.client import PyAIError, pyai_request

log = logging.getLogger("pyai.clone")


async def enroll_voice(sample_path: Path) -> str | None:
    if not sample_path.exists():
        return None
    try:
        result = await pyai_request(
            "POST",
            "/audio/voices",
            files={"file": (sample_path.name, sample_path.read_bytes(), "audio/wav")},
            timeout=60.0,
        )
    except PyAIError as e:
        log.warning("Clone enroll failed: %s", e)
        return None
    if isinstance(result, dict):
        return str(result.get("id") or result.get("voice_id") or "") or None
    return None


async def list_voices() -> list[dict[str, Any]]:
    try:
        result = await pyai_request("GET", "/audio/voices", timeout=20.0)
    except PyAIError:
        return []
    if isinstance(result, list):
        return [x for x in result if isinstance(x, dict)]
    if isinstance(result, dict):
        data = result.get("data") or result.get("voices") or []
        return [x for x in data if isinstance(x, dict)]
    return []
