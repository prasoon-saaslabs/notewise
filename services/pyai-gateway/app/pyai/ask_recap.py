from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

from app.pyai.client import PyAIError
from app.pyai.recap import map_recap_to_notes, submit_utterances, wait_for_recap

log = logging.getLogger("pyai.ask_recap")


async def ask_with_recap(
    question: str,
    hits: list[dict[str, Any]],
    *,
    pack_id: str | None = None,
) -> tuple[list[dict[str, Any]], str]:
    """Grounded Q&A via PyAI Recap (PyAI has no REST chat/completions surface)."""
    if not hits:
        return [], "no_evidence"

    utterances: list[dict[str, Any]] = []
    for i, h in enumerate(hits[:8]):
        cite = (h.get("citations") or [{}])[0]
        text = (cite.get("text") or h.get("text") or "").strip()
        if not text:
            continue
        utterances.append(
            {
                "speaker_role": "customer" if i % 2 else "agent",
                "text": text[:600],
                "offset_s": float(i * 8),
                "duration_s": 6.0,
            }
        )
    if not utterances:
        return [], "no_evidence"

    call_id = f"ask-{uuid4()}"
    question_block = (
        "Answer the user's question using ONLY the utterances in this call. "
        "Be direct and specific. Put the answer in the summary as 2–5 short bullet points. "
        "Do not invent facts not supported by the utterances.\n\n"
        f"QUESTION: {question.strip()}"
    )
    try:
        submitted = await submit_utterances(
            call_id,
            utterances,
            user_notes=question_block,
            pack_id=pack_id,
        )
        recap = await wait_for_recap(
            str(submitted.get("call_id") or call_id),
            timeout_s=75,
            interval_s=2.0,
        )
        notes = map_recap_to_notes(recap)
    except PyAIError as e:
        body = (e.body or "") + str(e)
        if e.status == 403 and "recap:read" in body:
            log.warning("Recap ask blocked (missing recap:read scope)")
            return [], "recap_scope"
        log.warning("Recap ask failed: %s", e)
        return [], "recap_failed"

    lines: list[str] = []
    for t in notes.takeaways or []:
        if t and t.strip():
            lines.append(t.strip())
    if notes.executiveSummary:
        for ln in notes.executiveSummary.splitlines():
            t = ln.strip().lstrip("-•* ").strip()
            if t:
                lines.append(t)

    bullets: list[dict[str, Any]] = []
    for i, t in enumerate(lines[:6]):
        hit = hits[min(i, len(hits) - 1)]
        bullets.append({"text": t, "citations": hit.get("citations") or []})
    if not bullets and notes.executiveSummary:
        bullets.append(
            {
                "text": notes.executiveSummary.strip()[:500],
                "citations": hits[0].get("citations") or [],
            }
        )
    return bullets, "recap"
