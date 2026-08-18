from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

from app.audio_playback import delete_playback
from app.modes import get_mode
from app.meeting_filters import is_test_meeting
from app.pyai.speakers import apply_manual_bind
from app.store.file_store import store
from app.store.margin import write_margin_folder

router = APIRouter(prefix="/meetings", tags=["meetings"])


class BindSpeakerBody(BaseModel):
    speaker: str
    asYou: bool = True


class UpdateMeetingBody(BaseModel):
    title: str | None = None
    userNotes: str | None = None
    modeId: str | None = None


def _summary(m) -> dict:
    return {
        "id": m.id,
        "title": m.title,
        "status": m.status,
        "source": m.source,
        "backend": getattr(m, "backend", None) or "pyai",
        "createdAt": m.createdAt,
        "durationSec": m.durationSec,
        "snippet": m.snippet,
    }


def _detail(m) -> dict:
    audio_url = f"/meetings/{m.id}/audio" if m.audioPath else None
    return {
        **_summary(m),
        "transcript": [
            t.model_dump() if hasattr(t, "model_dump") else t for t in m.transcript
        ],
        "notes": m.notes.model_dump()
        if m.notes and hasattr(m.notes, "model_dump")
        else m.notes,
        "userNotes": m.userNotesDraft,
        "audioUrl": audio_url,
        "meetingUrl": m.meetingUrl,
        "botProvider": m.botProvider,
        "botMessage": m.botMessage,
        "platform": m.platform,
        "botId": m.botId,
        "marginPath": m.marginPath,
        "error": m.error,
        "speakerBinding": m.speakerBinding,
        "modeId": getattr(m, "modeId", None),
        "entityIds": getattr(m, "entityIds", None) or [],
        "runStatus": m.notes.runStatus.model_dump() if m.notes and m.notes.runStatus else None,
        "droppedCount": m.notes.droppedCount if m.notes else 0,
    }


@router.get("")
async def list_meetings():
    return [_summary(m) for m in store.list_meetings() if not is_test_meeting(m)]


@router.get("/{meeting_id}")
async def get_meeting(meeting_id: str):
    m = store.get_meeting(meeting_id)
    if not m:
        raise HTTPException(404, "Meeting not found")
    return _detail(m)


@router.patch("/{meeting_id}")
async def update_meeting(meeting_id: str, body: UpdateMeetingBody):
    m = store.get_meeting(meeting_id)
    if not m:
        raise HTTPException(404, "Meeting not found")
    fields: dict = {}
    if body.title is not None:
        title = body.title.strip()
        if not title:
            raise HTTPException(400, "Title cannot be empty")
        if len(title) > 200:
            raise HTTPException(400, "Title too long")
        fields["title"] = title
        # Keep notes.title in sync when present
        if m.notes:
            notes = m.notes.model_dump() if hasattr(m.notes, "model_dump") else dict(m.notes)
            notes["title"] = title
            fields["notes"] = notes
    if body.userNotes is not None:
        fields["userNotesDraft"] = body.userNotes.strip()[:20_000]
    if body.modeId is not None:
        mode = get_mode(body.modeId.strip() or None)
        fields["modeId"] = mode["id"]
    if not fields:
        return _detail(m)
    updated = store.update_meeting(meeting_id, **fields)
    assert updated
    write_margin_folder(updated, user_notes=updated.userNotesDraft)
    return _detail(updated)


@router.get("/{meeting_id}/audio")
async def get_audio(meeting_id: str):
    m = store.get_meeting(meeting_id)
    if not m or not m.audioPath:
        raise HTTPException(404, "Audio not available for this meeting")
    path = Path(m.audioPath)
    if not path.is_file():
        raise HTTPException(404, "Audio file missing")
    return FileResponse(path, media_type="audio/wav", filename=f"{meeting_id}.wav")


@router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: str):
    if not store.delete_meeting(meeting_id):
        raise HTTPException(404, "Meeting not found")
    delete_playback(meeting_id)
    return Response(status_code=204)


@router.post("/{meeting_id}/bind-speaker")
async def bind_speaker(meeting_id: str, body: BindSpeakerBody):
    """Path C: one-tap “This is me” — re-label transcript turns by display speaker name."""
    m = store.get_meeting(meeting_id)
    if not m:
        raise HTTPException(404, "Meeting not found")

    binding = apply_manual_bind(
        m.speakerBinding or {},
        body.speaker,
        as_you=body.asYou,
    )
    turns = []
    for t in m.transcript:
        if body.asYou:
            kind = "you" if t.speaker == body.speaker else "other"
        else:
            kind = "other" if t.speaker == body.speaker else t.kind
        turns.append(
            {
                "id": t.id,
                "speaker": "You" if kind == "you" else ("Other" if kind == "other" else t.speaker),
                "kind": kind,
                "text": t.text,
                "startMs": t.startMs,
                "endMs": t.endMs,
            }
        )

    updated = store.update_meeting(
        meeting_id,
        transcript=turns,
        speakerBinding=binding,
    )
    assert updated
    write_margin_folder(updated, user_notes=updated.userNotesDraft)
    return {"ok": True, "meeting": _detail(updated)}
