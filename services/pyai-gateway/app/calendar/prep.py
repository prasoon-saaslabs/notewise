from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from app.memory.brief import build_brief
from app.memory.retrieve import retrieve
from app.pyai.llm import chat_text
from app.store.file_store import store
from app.store.models import CalendarEvent, User

log = logging.getLogger("calendar.prep")


async def build_event_prep(user: User, event: CalendarEvent) -> dict[str, Any]:
    """AI-ready pre-meeting brief: brain retrieval + entity briefs + optional LLM rollup."""
    event = _ensure_entity_links(event)
    entity_briefs: list[dict[str, Any]] = []
    for eid in event.entityIds[:5]:
        brief = build_brief(eid)
        if brief.get("error"):
            continue
        entity_briefs.append(brief)

    query_parts = [event.title]
    for att in event.attendees[:6]:
        if att.name:
            query_parts.append(att.name)
        if att.email:
            query_parts.append(att.email.split("@")[0])
    hits = retrieve(" ".join(query_parts), top_k=6, min_score=0.28)

    prior_actions: list[str] = []
    prior_summary: list[str] = []
    for brief in entity_briefs:
        if brief.get("lastMeeting", {}).get("recap"):
            prior_summary.append(str(brief["lastMeeting"]["recap"]))
        for c in brief.get("openCommitments") or []:
            prior_actions.append(str(c.get("text") or ""))
        for o in brief.get("unresolvedObjections") or []:
            prior_summary.append(f"Objection: {o.get('text')}")

    ai_summary = None
    if prior_summary or prior_actions or hits:
        try:
            ai_summary = await chat_text(
                "Write a concise pre-meeting brief (max 120 words): summary, open actions, "
                "and 2 suggested talking points. No fluff.",
                f"MEETING: {event.title}\nATTENDEES: {', '.join(a.name or a.email or '?' for a in event.attendees[:8])}\n"
                f"PRIOR NOTES:\n" + "\n".join(prior_summary[:6])
                + "\nOPEN ACTIONS:\n" + "\n".join(prior_actions[:8])
                + "\nRETRIEVAL:\n" + "\n".join(h["text"][:200] for h in hits[:4]),
                timeout=25.0,
            )
        except Exception as e:
            log.info("prep LLM skipped: %s", e)

    return {
        "eventId": event.id,
        "title": event.title,
        "startAt": event.startAt,
        "endAt": event.endAt,
        "meetUrl": event.meetUrl,
        "attendees": [a.model_dump() for a in event.attendees],
        "entityIds": event.entityIds,
        "entityBriefs": entity_briefs,
        "retrievalHits": hits[:6],
        "suggestedSummary": ai_summary,
        "suggestedActions": [t for t in prior_actions if t][:8],
        "manualNotes": event.manualNotes,
        "linkedMeetingId": event.linkedMeetingId,
    }


def _ensure_entity_links(event: CalendarEvent) -> CalendarEvent:
    from app.calendar.google import link_event_entities

    return link_event_entities(event)


def events_needing_reminder(
    user_id: str,
    *,
    minutes_before: int = 10,
    window_minutes: int = 2,
) -> list[CalendarEvent]:
    now = datetime.now(timezone.utc)
    lo = now + timedelta(minutes=minutes_before - window_minutes)
    hi = now + timedelta(minutes=minutes_before + window_minutes)
    out: list[CalendarEvent] = []
    for ev in store.list_calendar_events(user_id, from_iso=now.isoformat()):
        if ev.reminderFiredAt:
            continue
        try:
            start = datetime.fromisoformat(ev.startAt.replace("Z", "+00:00"))
        except ValueError:
            continue
        if lo <= start <= hi:
            out.append(ev)
    return out


def events_starting_now(user_id: str, *, grace_minutes: int = 2) -> list[CalendarEvent]:
    now = datetime.now(timezone.utc)
    out: list[CalendarEvent] = []
    for ev in store.list_calendar_events(user_id, from_iso=(now - timedelta(hours=1)).isoformat()):
        if ev.startPromptFiredAt:
            continue
        try:
            start = datetime.fromisoformat(ev.startAt.replace("Z", "+00:00"))
            end = datetime.fromisoformat(ev.endAt.replace("Z", "+00:00"))
        except ValueError:
            continue
        if start - timedelta(minutes=grace_minutes) <= now <= end:
            out.append(ev)
    return out
