from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx

from app.config import settings
from app.store.file_store import store
from app.store.models import CalendarAttendee, CalendarEvent, User

log = logging.getLogger("calendar.google")

GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_CALENDAR = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

MEET_RE = re.compile(r"https://meet\.google\.com/[a-z0-9-]+", re.I)


def google_configured() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret)


def google_auth_url(*, state: str) -> str:
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": settings.google_scopes,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
        "include_granted_scopes": "true",
    }
    return f"{GOOGLE_AUTH}?{urlencode(params)}"


async def exchange_code(code: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            GOOGLE_TOKEN,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        res.raise_for_status()
        return res.json()


async def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            GOOGLE_TOKEN,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        res.raise_for_status()
        return res.json()


async def fetch_userinfo(access_token: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.get(
            GOOGLE_USERINFO,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        res.raise_for_status()
        return res.json()


def _parse_rfc3339(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _extract_meet_url(item: dict[str, Any]) -> str | None:
    for key in ("hangoutLink", "conferenceData"):
        val = item.get(key)
        if isinstance(val, str) and MEET_RE.search(val):
            return MEET_RE.search(val).group(0)  # type: ignore[union-attr]
    conf = item.get("conferenceData") or {}
    for ep in conf.get("entryPoints") or []:
        uri = ep.get("uri") or ""
        if MEET_RE.search(uri):
            return MEET_RE.search(uri).group(0)  # type: ignore[union-attr]
    for blob in (item.get("description") or "", item.get("location") or ""):
        m = MEET_RE.search(str(blob))
        if m:
            return m.group(0)
    return None


def _normalize_event(user_id: str, item: dict[str, Any]) -> CalendarEvent | None:
    ext_id = str(item.get("id") or "")
    if not ext_id:
        return None
    start_raw = (item.get("start") or {}).get("dateTime") or (item.get("start") or {}).get("date")
    end_raw = (item.get("end") or {}).get("dateTime") or (item.get("end") or {}).get("date")
    start_dt = _parse_rfc3339(start_raw)
    end_dt = _parse_rfc3339(end_raw)
    if not start_dt or not end_dt:
        return None
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)
    if end_dt.tzinfo is None:
        end_dt = end_dt.replace(tzinfo=timezone.utc)
    attendees = [
        CalendarAttendee(
            email=(a.get("email") or None),
            name=(a.get("displayName") or None),
            responseStatus=(a.get("responseStatus") or None),
        )
        for a in item.get("attendees") or []
    ]
    from uuid import uuid4

    return CalendarEvent(
        id=str(uuid4()),
        userId=user_id,
        externalId=ext_id,
        title=str(item.get("summary") or "Untitled meeting"),
        description=(item.get("description") or None),
        startAt=start_dt.astimezone(timezone.utc).isoformat(),
        endAt=end_dt.astimezone(timezone.utc).isoformat(),
        meetUrl=_extract_meet_url(item),
        htmlLink=(item.get("htmlLink") or None),
        attendees=attendees,
        syncedAt=datetime.now(timezone.utc).isoformat(),
    )


async def fetch_calendar_events(
    access_token: str,
    *,
    time_min: datetime | None = None,
    time_max: datetime | None = None,
) -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc)
    time_min = time_min or now - timedelta(hours=1)
    time_max = time_max or now + timedelta(days=14)
    params = {
        "singleEvents": "true",
        "orderBy": "startTime",
        "timeMin": time_min.isoformat().replace("+00:00", "Z"),
        "timeMax": time_max.isoformat().replace("+00:00", "Z"),
        "maxResults": "50",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.get(
            GOOGLE_CALENDAR,
            params=params,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        res.raise_for_status()
        data = res.json()
    return list(data.get("items") or [])


async def sync_user_calendar(user: User) -> list[CalendarEvent]:
    refresh = store.get_google_refresh_token(user.id)
    if not refresh:
        return []
    tokens = await refresh_access_token(refresh)
    access = tokens.get("access_token")
    if not access:
        return []
    raw_items = await fetch_calendar_events(access)
    events: list[CalendarEvent] = []
    for item in raw_items:
        if item.get("status") == "cancelled":
            continue
        ev = _normalize_event(user.id, item)
        if ev:
            events.append(ev)
    return store.upsert_calendar_events(user.id, events)


def link_event_entities(event: CalendarEvent) -> CalendarEvent:
    """Map attendee emails to brain entities for retrieval context."""
    entity_ids: list[str] = []
    for att in event.attendees:
        if not att.email:
            continue
        ent = store.find_entity_by_email(att.email)
        if ent and ent.id not in entity_ids:
            entity_ids.append(ent.id)
    if entity_ids == event.entityIds:
        return event
    updated = store.update_calendar_event(event.id, entityIds=entity_ids)
    return updated or event
