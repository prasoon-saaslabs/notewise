from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.deps import require_user
from app.calendar.google import google_configured, sync_user_calendar
from app.calendar.prep import (
    build_event_prep,
    events_needing_reminder,
    events_starting_now,
)
from app.store.file_store import store
from app.store.models import CalendarEvent, User

router = APIRouter(prefix="/calendar", tags=["calendar"])


class ManualNotesBody(BaseModel):
    notes: str = Field(default="", max_length=8000)


class AckBody(BaseModel):
    kind: str = Field(description="reminder | start")


@router.get("/events")
async def list_events(user: User = Depends(require_user)):
    now = datetime.now(timezone.utc)
    events = store.list_calendar_events(
        user.id,
        from_iso=(now - timedelta(hours=1)).isoformat(),
        to_iso=(now + timedelta(days=14)).isoformat(),
    )
    return {
        "events": [_public_event(e) for e in events],
        "calendarConnected": user.calendarConnected and google_configured(),
    }


@router.post("/sync")
async def sync_calendar(user: User = Depends(require_user)):
    if not user.calendarConnected or not google_configured():
        raise HTTPException(400, "Connect Google Calendar to sync events")
    try:
        events = await sync_user_calendar(user)
        return {"synced": len(events), "events": [_public_event(e) for e in events]}
    except Exception as e:
        raise HTTPException(502, f"Calendar sync failed: {e}") from e


@router.get("/events/{event_id}/prep")
async def event_prep(event_id: str, user: User = Depends(require_user)):
    ev = _user_event(user, event_id)
    prep = await build_event_prep(user, ev)
    return prep


@router.patch("/events/{event_id}/notes")
def save_manual_notes(event_id: str, body: ManualNotesBody, user: User = Depends(require_user)):
    _user_event(user, event_id)
    updated = store.update_calendar_event(event_id, manualNotes=body.notes)
    return {"ok": True, "manualNotes": updated.manualNotes if updated else body.notes}


@router.get("/reminders/pending")
async def pending_reminders(user: User = Depends(require_user)):
    """Poll endpoint: 10-min reminders + meeting-start prompts."""
    if not user.calendarConnected:
        return {"reminders": [], "starts": []}
    reminders = events_needing_reminder(user.id)
    starts = events_starting_now(user.id)
    out_reminders = []
    for ev in reminders:
        prep = await build_event_prep(user, ev)
        out_reminders.append({**_public_event(ev), "prep": prep})
        store.update_calendar_event(ev.id, reminderFiredAt=datetime.now(timezone.utc).isoformat())
    out_starts = []
    for ev in starts:
        prep = await build_event_prep(user, ev)
        out_starts.append({**_public_event(ev), "prep": prep})
        store.update_calendar_event(ev.id, startPromptFiredAt=datetime.now(timezone.utc).isoformat())
    return {"reminders": out_reminders, "starts": out_starts}


@router.post("/events/{event_id}/ack")
def ack_event(event_id: str, body: AckBody, user: User = Depends(require_user)):
    _user_event(user, event_id)
    now = datetime.now(timezone.utc).isoformat()
    if body.kind == "reminder":
        store.update_calendar_event(event_id, reminderFiredAt=now)
    elif body.kind == "start":
        store.update_calendar_event(event_id, startPromptFiredAt=now)
    return {"ok": True}


def _user_event(user: User, event_id: str) -> CalendarEvent:
    ev = store.get_calendar_event(event_id)
    if not ev or ev.userId != user.id:
        raise HTTPException(404, "Calendar event not found")
    return ev


def _public_event(ev: CalendarEvent) -> dict[str, Any]:
    return {
        "id": ev.id,
        "externalId": ev.externalId,
        "title": ev.title,
        "description": ev.description,
        "startAt": ev.startAt,
        "endAt": ev.endAt,
        "meetUrl": ev.meetUrl,
        "htmlLink": ev.htmlLink,
        "attendees": [a.model_dump() for a in ev.attendees],
        "entityIds": ev.entityIds,
        "linkedMeetingId": ev.linkedMeetingId,
        "manualNotes": ev.manualNotes,
    }
