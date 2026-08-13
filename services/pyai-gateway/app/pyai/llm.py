from __future__ import annotations

import json
import logging
from typing import Any

from app.pyai.client import PyAIError, pyai_request

log = logging.getLogger("pyai.llm")


async def chat_json(
    system: str,
    user: str,
    *,
    timeout: float = 60.0,
) -> dict[str, Any] | None:
    """OpenAI-compatible chat; returns parsed JSON object or None."""
    payload = {
        "model": "pyai-omni",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }
    try:
        result = await pyai_request(
            "POST",
            "/chat/completions",
            json=payload,
            timeout=timeout,
        )
    except PyAIError as e:
        log.warning("chat_json failed: %s", e)
        return None
    if not isinstance(result, dict):
        return None
    choices = result.get("choices") or []
    if not choices:
        content = result.get("content") or result.get("text")
    else:
        msg = choices[0].get("message") or {}
        content = msg.get("content") or choices[0].get("text")
    if not content:
        return None
    try:
        data = json.loads(content)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")
        if start >= 0 and end > start:
            try:
                data = json.loads(content[start : end + 1])
                return data if isinstance(data, dict) else None
            except json.JSONDecodeError:
                return None
        return None


async def chat_text(system: str, user: str, *, timeout: float = 45.0) -> str | None:
    payload = {
        "model": "pyai-omni",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
    }
    try:
        result = await pyai_request("POST", "/chat/completions", json=payload, timeout=timeout)
    except PyAIError as e:
        log.warning("chat_text failed: %s", e)
        return None
    if not isinstance(result, dict):
        return None
    choices = result.get("choices") or []
    if choices:
        msg = choices[0].get("message") or {}
        return (msg.get("content") or choices[0].get("text") or "").strip() or None
    return (result.get("content") or result.get("text") or "").strip() or None
