from __future__ import annotations

import logging
from typing import Any

from app.pyai.client import PyAIError, pyai_request

log = logging.getLogger("pyai.trace")


async def record_run(call_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    try:
        result = await pyai_request(
            "POST",
            f"/trace/calls/{call_id}/events",
            json=payload,
            timeout=15.0,
        )
        return result if isinstance(result, dict) else {"ok": True}
    except PyAIError as e:
        log.info("Trace ingest skipped: %s", e)
        return None


async def get_call(call_id: str) -> dict[str, Any] | None:
    try:
        result = await pyai_request("GET", f"/trace/calls/{call_id}", timeout=15.0)
        return result if isinstance(result, dict) else None
    except PyAIError:
        return None
