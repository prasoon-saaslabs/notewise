from __future__ import annotations

import logging
from typing import Any

from app.pyai.client import PyAIError, pyai_request

log = logging.getLogger("pyai.cast")


async def speak(text: str, *, voice: str | None = None, clone_id: str | None = None) -> bytes | None:
    """Return audio bytes from Cast (or Clone if clone_id set). Never logs the text at debug with secrets."""
    body: dict[str, Any] = {
        "model": "pyai-cast" if not clone_id else "pyai-clone",
        "input": text,
        "voice": voice or "alloy",
    }
    if clone_id:
        body["voice_id"] = clone_id
    try:
        result = await pyai_request("POST", "/audio/speech", json=body, timeout=60.0)
    except PyAIError as e:
        log.warning("Cast failed: %s", e)
        return None
    if isinstance(result, dict) and result.get("audio"):
        import base64

        try:
            return base64.b64decode(result["audio"])
        except Exception:
            return None
    return None
