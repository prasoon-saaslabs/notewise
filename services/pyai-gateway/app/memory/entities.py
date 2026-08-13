from __future__ import annotations

import logging
import re
from uuid import uuid4

from app.store.file_store import store
from app.store.models import Commitment, Entity, NotesPayload, TranscriptTurn

log = logging.getLogger("memory.entities")

_COMPANY = re.compile(
    r"\b([A-Z][A-Za-z0-9&'-]*(?:\s+[A-Z][A-Za-z0-9&'-]*){0,3})\s+"
    r"(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Labs|Systems|Software|AI)\b"
)
_PERSON = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b")
_STOP = {
    "I",
    "We",
    "You",
    "The",
    "This",
    "That",
    "And",
    "But",
    "Okay",
    "Yeah",
    "Hi",
    "Hello",
    "Thanks",
    "Today",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Speaker",
    "Other",
    "Meeting",
}


def extract_and_link(
    meeting_id: str,
    turns: list[TranscriptTurn],
    notes: NotesPayload | None,
    *,
    title: str | None = None,
) -> list[str]:
    found: dict[str, Entity] = {}
    if title:
        _from_title(found, title, meeting_id, turns[0].id if turns else "L1")
    for t in turns:
        if t.kind != "you" and t.speaker and t.speaker not in _STOP:
            parts = t.speaker.strip().split()
            if len(parts) >= 2 and parts[0][0].isupper():
                _upsert(found, kind="person", name=t.speaker.strip(), meeting_id=meeting_id, line_id=t.id)
        for m in _COMPANY.finditer(t.text or ""):
            name = m.group(1).strip()
            if len(name) < 2:
                continue
            _upsert(found, kind="company", name=name, meeting_id=meeting_id, line_id=t.id)
        for m in _PERSON.finditer(t.text or ""):
            name = m.group(1).strip()
            if name in _STOP or len(name.split()) < 2:
                continue
            _upsert(found, kind="person", name=name, meeting_id=meeting_id, line_id=t.id)

    ids = [e.id for e in found.values()]
    if notes:
        _commitments_from_notes(meeting_id, notes, ids)
    return ids


_TITLE_SKIP = {
    "engineering",
    "standup",
    "capture",
    "discovery",
    "pricing",
    "follow-up",
    "followup",
    "call",
    "meeting",
    "seed",
    "conversation",
    "quota",
    "week",
    "with",
}


def _from_title(found: dict[str, Entity], title: str, meeting_id: str, line_id: str) -> None:
    head = re.split(r"[—\-|:]", title, maxsplit=1)[0].strip()
    words = [w for w in re.split(r"\s+", head) if w]
    if not words:
        return
    first = re.sub(r"[^A-Za-z0-9&'-]", "", words[0])
    if not first or not first[0].isupper() or first.lower() in _TITLE_SKIP or first in _STOP:
        return
    rest_ok = len(words) == 1 or words[1].lower().strip(".,") in _TITLE_SKIP
    if rest_ok or len(first) >= 3:
        _upsert(found, kind="company", name=first, meeting_id=meeting_id, line_id=line_id)



def _upsert(
    found: dict[str, Entity],
    *,
    kind: str,
    name: str,
    meeting_id: str,
    line_id: str,
    company: str | None = None,
) -> None:
    existing = store.find_entity(name=name, company=company if kind == "person" else None)
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
    if existing:
        mids = list(dict.fromkeys([*existing.meetingIds, meeting_id]))
        e = existing.model_copy(update={"meetingIds": mids, "updatedAt": now})
    else:
        e = Entity(
            id=str(uuid4()),
            kind=kind,  # type: ignore[arg-type]
            name=name,
            company=company,
            createdAt=now,
            updatedAt=now,
            meetingIds=[meeting_id],
        )
    store.upsert_entity(e)
    store.add_mention(e.id, meeting_id, line_id)
    found[e.id] = e


def _commitments_from_notes(meeting_id: str, notes: NotesPayload, entity_ids: list[str]) -> None:
    if not entity_ids:
        return
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
    eid = entity_ids[0]
    for a in notes.actions or []:
        direction = "us" if (a.owner or "").lower() in ("you", "me", "us", "team") else "them"
        store.upsert_commitment(
            Commitment(
                id=str(uuid4()),
                entityId=eid,
                meetingId=meeting_id,
                direction=direction,  # type: ignore[arg-type]
                text=a.text,
                due=a.due,
                status="open",
                lineId=(a.lineIds[0] if a.lineIds else None),
                createdAt=now,
            )
        )
