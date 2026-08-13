from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.memory.entities import extract_and_link
from app.memory.retrieve import index_meeting
from app.store.file_store import store
from app.store.models import Meeting, NotesPayload, TranscriptTurn

router = APIRouter(prefix="/samples", tags=["samples"])

_SAMPLES = Path(__file__).resolve().parents[4] / "samples"
if not _SAMPLES.exists():
    _SAMPLES = Path(__file__).resolve().parents[2] / "samples"


@router.get("")
async def list_samples():
    if not _SAMPLES.exists():
        return []
    out = []
    for p in sorted(_SAMPLES.glob("*.json")):
        data = json.loads(p.read_text(encoding="utf-8"))
        out.append({"id": p.stem, "title": data.get("title") or p.stem, "modeId": data.get("modeId")})
    return out


@router.post("/{sample_id}/import")
async def import_sample(sample_id: str):
    path = _SAMPLES / f"{sample_id}.json"
    if not path.exists():
        raise HTTPException(404, "Sample not found")
    data = json.loads(path.read_text(encoding="utf-8"))
    mid = str(uuid4())
    turns = [TranscriptTurn.model_validate(t) if not isinstance(t, TranscriptTurn) else t for t in data.get("transcript") or []]
    # ensure ids
    fixed = []
    for i, t in enumerate(turns):
        d = t.model_dump()
        d["id"] = d.get("id") or f"L{i+1}"
        fixed.append(TranscriptTurn.model_validate(d))
    notes = None
    if data.get("notes"):
        notes = NotesPayload.model_validate(data["notes"])
    meeting = Meeting(
        id=mid,
        title=data.get("title") or sample_id,
        status="ready",
        source="sample",
        backend="pyai",
        createdAt=data.get("createdAt") or __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        transcript=fixed,
        notes=notes,
        snippet=(fixed[0].text[:160] if fixed else None),
        modeId=data.get("modeId"),
        durationSec=data.get("durationSec"),
    )
    store.put_meeting(meeting)
    index_meeting(mid, fixed)
    if notes:
        extract_and_link(mid, fixed, notes, title=meeting.title)
    for ent in data.get("entities") or []:
        from app.store.models import Entity

        name = str(ent.get("name") or "").strip()
        if not name:
            continue
        kind_s = "person" if str(ent.get("kind") or "") == "person" else "company"
        existing = store.find_entity(name=name, company=ent.get("company"))
        now = meeting.createdAt
        if existing:
            mids = list(dict.fromkeys([*existing.meetingIds, mid]))
            store.upsert_entity(existing.model_copy(update={"meetingIds": mids, "updatedAt": now}))
            store.add_mention(existing.id, mid, fixed[0].id if fixed else "L1")
        else:
            e = Entity(
                id=str(uuid4()),
                kind=kind_s,  # type: ignore[arg-type]
                name=name,
                company=ent.get("company"),
                createdAt=now,
                updatedAt=now,
                meetingIds=[mid],
            )
            store.upsert_entity(e)
            store.add_mention(e.id, mid, fixed[0].id if fixed else "L1")
    return {"meetingId": mid, "title": meeting.title}
