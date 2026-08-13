from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.pipeline import regenerate_notes
from app.store.file_store import store

router = APIRouter(prefix="/notes", tags=["notes"])


class RegenerateBody(BaseModel):
    userNotes: str | None = None


@router.get("/{meeting_id}")
async def get_notes(meeting_id: str):
    m = store.get_meeting(meeting_id)
    if not m:
        raise HTTPException(404, "Meeting not found")
    return m.notes.model_dump() if m.notes else None


@router.post("/{meeting_id}/regenerate")
async def regenerate(meeting_id: str, body: RegenerateBody | None = None):
    m = store.get_meeting(meeting_id)
    if not m:
        raise HTTPException(404, "Meeting not found")
    try:
        result = await regenerate_notes(
            meeting_id,
            user_notes=body.userNotes if body else None,
        )
        return result
    except Exception as e:
        raise HTTPException(502, str(e)) from e
