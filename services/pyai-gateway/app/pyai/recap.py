from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.config import settings
from app.modes import pack_id_for_mode
from app.pyai.client import PyAIError, pyai_request
from app.pyai.recap_utterances import fold_user_notes_into_utterances
from app.store.models import ActionItem, NotesPayload

log = logging.getLogger("pyai.recap")

_config_ensured = False


async def ensure_recap_config() -> None:
    global _config_ensured
    if _config_ensured or not settings.recap_enabled:
        return
    try:
        await pyai_request(
            "PUT",
            "/recap/config",
            json={
                "enabled": True,
                "default_pack_id": settings.recap_pack_id,
            },
        )
        _config_ensured = True
        log.info("Recap config enabled pack=%s", settings.recap_pack_id)
    except PyAIError as e:
        # Sandbox keys may lack recap:configure — continue with submit/poll.
        log.warning("Recap config update skipped: %s %s", e, e.body)


async def submit_utterances(
    call_id: str,
    utterances: list[dict[str, Any]],
    *,
    customer_name: str | None = None,
    user_notes: str | None = None,
    pack_id: str | None = None,
    mode_id: str | None = None,
) -> dict[str, Any]:
    await ensure_recap_config()
    if pack_id is not None:
        resolved_pack = pack_id.strip() or None
    else:
        resolved_pack = pack_id_for_mode(mode_id)
    payload_utterances = fold_user_notes_into_utterances(utterances, user_notes)
    payload: dict[str, Any] = {
        "call_direction": "inbound",
        "utterances": payload_utterances,
    }
    if resolved_pack:
        payload["pack_id"] = resolved_pack
    if customer_name:
        payload["customer_name"] = customer_name
    log.info(
        "Recap submit call_id=%s pack_id=%s mode_id=%s utterances=%d",
        call_id,
        resolved_pack or "(pyai-default)",
        mode_id,
        len(payload_utterances),
    )
    result = await pyai_request("POST", f"/recap/calls/{call_id}", json=payload)
    return result if isinstance(result, dict) else {"call_id": call_id}


async def get_recap(call_id: str) -> dict[str, Any]:
    result = await pyai_request("GET", f"/recap/calls/{call_id}")
    if not isinstance(result, dict):
        raise PyAIError("Unexpected Recap response")
    return result


async def wait_for_recap(
    call_id: str,
    *,
    timeout_s: float = 300.0,
    interval_s: float = 2.0,
) -> dict[str, Any]:
    deadline = asyncio.get_event_loop().time() + timeout_s
    while True:
        recap = await get_recap(call_id)
        status = (recap.get("status") or "").lower()
        if status in ("complete", "completed"):
            return recap
        if status in ("failed", "error"):
            raise PyAIError(
                f"Recap failed for {call_id}: {recap.get('error') or status}",
                body=str(recap)[:2000],
            )
        if asyncio.get_event_loop().time() > deadline:
            raise PyAIError(f"Recap timed out: {call_id}")
        await asyncio.sleep(interval_s)


def map_recap_to_notes(recap: dict[str, Any]) -> NotesPayload:
    record = recap.get("record") or {}
    headline = recap.get("headline") or record.get("tldr") or record.get("headline")
    summary = record.get("summary") or record.get("summary_draft") or ""
    actions_raw = record.get("action_items") or record.get("actions") or []
    actions: list[ActionItem] = []
    for a in actions_raw:
        if isinstance(a, str):
            actions.append(ActionItem(text=a))
        elif isinstance(a, dict):
            actions.append(
                ActionItem(
                    text=str(a.get("task") or a.get("text") or a.get("action") or ""),
                    owner=a.get("owner"),
                    priority=None,
                )
            )
    takeaways: list[str] = []
    for key in ("decisions", "next_steps", "takeaways", "key_points"):
        val = record.get(key)
        if isinstance(val, list):
            for item in val:
                if isinstance(item, str) and item.strip():
                    takeaways.append(item.strip())
                elif isinstance(item, dict):
                    t = item.get("text") or item.get("decision") or item.get("step")
                    if t:
                        takeaways.append(str(t))
    questions = record.get("open_questions") or record.get("questions") or []
    open_q = [str(q) for q in questions] if isinstance(questions, list) else []

    return NotesPayload(
        title=str(headline).strip() if headline else None,
        executiveSummary=str(summary).strip() if summary else None,
        takeaways=takeaways,
        actions=[a for a in actions if a.text],
        openQuestions=open_q,
        risks=[],
    )


def segments_to_utterances(
    segments: list[dict[str, Any]],
    *,
    you_speaker: str | None = None,
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for seg in segments:
        sp = str(seg.get("speaker") or "")
        role = "agent" if you_speaker and sp == you_speaker else "customer"
        if seg.get("kind") == "you" or sp.lower() in ("you", "channel_0"):
            role = "agent"
        start = float(seg.get("start_s") or 0)
        end = float(seg.get("end_s") or start)
        dur = float(seg.get("duration_s") or max(0.1, end - start))
        out.append(
            {
                "speaker_role": role,
                "text": seg["text"],
                "offset_s": start,
                "duration_s": dur,
            }
        )
    return out
