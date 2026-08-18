from __future__ import annotations

from typing import Any
from uuid import uuid4

def fresh_recap_call_id(base: str) -> str:
    """New Recap call id so regenerate is not rejected as an idempotency conflict.

    POST /v1/recap/calls/{call_id} treats call_id as an idempotency key. A later
    POST with a different utterance payload returns 409.
    """
    stem = (base or "call").strip() or "call"
    return f"{stem}-r{uuid4().hex[:12]}"[:128]


_NOTE_PREFIX = (
    "NOTE TAKER CONTEXT — Use these live notes together with the transcript. "
    "Produce a detailed executive summary, concrete action items with owners when "
    "mentioned, takeaways, and open questions. Prefer action items from both the "
    "notes and any commitments in speech.\n\nLive notes:\n"
)


def fold_user_notes_into_utterances(
    utterances: list[dict[str, Any]],
    user_notes: str | None,
) -> list[dict[str, Any]]:
    """Attach typed notes without inventing a Recap speaker_role.

    Recap only accepts speaker_role agent|customer. Prepend notes to the first
    utterance (or create a single agent utterance when the transcript is empty).
    """
    notes = (user_notes or "").strip()
    if not notes:
        return list(utterances)
    block = f"{_NOTE_PREFIX}{notes}"
    if not utterances:
        return [
            {
                "speaker_role": "agent",
                "text": block,
                "offset_s": 0.0,
                "duration_s": 0.1,
            }
        ]
    first = dict(utterances[0])
    first_text = str(first.get("text") or "")
    first["text"] = f"{block}\n\n{first_text}".strip()
    if first.get("speaker_role") not in ("agent", "customer"):
        first["speaker_role"] = "agent"
    return [first, *[dict(u) for u in utterances[1:]]]
