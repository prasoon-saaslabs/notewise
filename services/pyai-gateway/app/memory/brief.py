from __future__ import annotations

from typing import Any

from app.store.file_store import store


def build_brief(entity_id: str) -> dict[str, Any]:
    entity = store.get_entity(entity_id)
    if not entity:
        return {"error": "not_found"}
    mids = store.entity_meeting_ids(entity_id) or entity.meetingIds
    meetings = [store.get_meeting(mid) for mid in mids]
    meetings = [m for m in meetings if m]
    meetings.sort(key=lambda m: m.createdAt, reverse=True)
    last = meetings[0] if meetings else None
    commitments = store.list_commitments(entity_id=entity_id, status="open")
    objections: list[dict[str, Any]] = []
    for m in meetings:
        if not m.notes:
            continue
        for o in m.notes.objections or []:
            objections.append(
                {
                    "text": o.text,
                    "meetingId": m.id,
                    "meetingTitle": m.title,
                    "startMs": o.startMs,
                    "lineIds": o.lineIds,
                }
            )
    agenda = []
    if commitments:
        agenda.append("Review open commitments")
    if objections:
        agenda.append("Revisit unresolved objections")
    if last and last.notes and last.notes.openQuestions:
        agenda.extend(last.notes.openQuestions[:3])
    if not agenda:
        agenda = ["Catch up on last conversation", "Confirm next steps"]
    return {
        "entity": entity.model_dump(),
        "lastMeeting": {
            "id": last.id,
            "title": last.title,
            "createdAt": last.createdAt,
            "recap": last.notes.executiveSummary if last and last.notes else None,
        }
        if last
        else None,
        "openCommitments": [c.model_dump() for c in commitments],
        "unresolvedObjections": objections[:8],
        "suggestedAgenda": agenda[:6],
        "meetingCount": len(meetings),
    }
