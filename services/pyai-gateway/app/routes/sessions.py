from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, WebSocket
from pydantic import BaseModel, Field

from app.auth.deps import get_optional_user
from app.config import settings
from app.modes import get_mode, pack_id_for_mode
from app.pipeline import finalize_session
from app.pyai.hear_stream import proxy_hear_stream
from app.store.file_store import store
from app.store.margin import write_margin_folder
from app.store.models import User

log = logging.getLogger("routes.sessions")
router = APIRouter(prefix="/sessions", tags=["sessions"])


class CreateSessionBody(BaseModel):
    source: str = "local"
    title: str | None = None
    name: str | None = None
    userNotes: str | None = None
    channelMode: str | None = None
    checkInEndMs: int | None = Field(default=None, ge=0, le=60_000)
    modeId: str | None = None
    calendarEventId: str | None = None

    def resolved_title(self) -> str | None:
        for raw in (self.name, self.title):
            if raw and raw.strip():
                return raw.strip()[:200]
        return None


class LiveTurnIn(BaseModel):
    text: str
    startMs: int | None = 0
    endMs: int | None = 0
    speaker: str | None = None


class FinalizeBody(BaseModel):
    userNotes: str | None = None
    # Browser-side live captions as last-resort transcript fallback
    liveTurns: list[LiveTurnIn] | None = None


@router.post("")
async def create_session(
    body: CreateSessionBody | None = None,
    user: User | None = Depends(get_optional_user),
):
    body = body or CreateSessionBody()
    title = body.resolved_title()
    calendar_event_id = body.calendarEventId
    if calendar_event_id and user:
        ev = store.get_calendar_event(calendar_event_id)
        if ev and ev.userId == user.id:
            if not title:
                title = ev.title
            if ev.manualNotes and not body.resolved_title():
                pass
    user_notes = body.userNotes.strip()[:20_000] if body.userNotes else None
    if user_notes == "":
        user_notes = None
    session, meeting = store.create_session(
        title=title,
        channel_mode=body.channelMode or "mono",
        check_in_end_ms=body.checkInEndMs if body.checkInEndMs is not None else 5000,
        mode_id=body.modeId,
        source=body.source or "local",
        calendar_event_id=calendar_event_id,
        user_notes_draft=user_notes,
    )
    if calendar_event_id and user:
        ev = store.get_calendar_event(calendar_event_id)
        if ev and ev.entityIds:
            store.update_meeting(meeting.id, entityIds=ev.entityIds)
    if user_notes:
        refreshed = store.get_meeting(meeting.id)
        if refreshed:
            write_margin_folder(refreshed, user_notes=user_notes)
    return {"sessionId": session.id, "meetingId": meeting.id}


@router.post("/{session_id}/chunks")
async def upload_chunk(
    session_id: str,
    file: UploadFile = File(...),
    sequence: str = Form("0"),
):
    session = store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    seq = int(sequence or 0)
    dest_dir = settings.uploads_dir / session_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    ext = "webm"
    if file.content_type and "mp4" in file.content_type:
        ext = "m4a"
    elif file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1]
    path = dest_dir / f"chunk-{seq:05d}.{ext}"
    data = await file.read()
    path.write_bytes(data)
    paths = list(session.audioPaths) + [str(path)]
    store.update_session(session_id, chunkCount=session.chunkCount + 1, audioPaths=paths)
    return {"ok": True, "sequence": seq}


@router.post("/{session_id}/live")
async def live_transcribe_stub(
    session_id: str,
    file: UploadFile = File(...),
):
    """
    Legacy Nest contract: accept a blob. On PyAI path, live STT is via WS.
    Persist PCM/audio bytes if client still posts blobs; return empty text.
    """
    session = store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    data = await file.read()
    _ = data
    return {"text": "", "segments": [], "hint": "use /sessions/{id}/hear WebSocket for live Hear"}


@router.post("/{session_id}/pcm")
async def upload_pcm(
    session_id: str,
    file: UploadFile = File(...),
):
    """Optional: append raw PCM16 for batch finalize without MediaRecorder chunks."""
    session = store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    dest = settings.uploads_dir / session_id / "live.pcm"
    dest.parent.mkdir(parents=True, exist_ok=True)
    data = await file.read()
    with dest.open("ab") as f:
        f.write(data)
    return {"ok": True, "bytes": len(data)}


@router.post("/{session_id}/finalize")
async def finalize(session_id: str, body: FinalizeBody | None = None):
    session = store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    user_notes = body.userNotes if body else None
    live_turns = None
    if body and body.liveTurns:
        live_turns = [t.model_dump() for t in body.liveTurns]
    result = await finalize_session(
        session_id,
        user_notes=user_notes,
        live_turns=live_turns,
    )
    return result


@router.websocket("/{session_id}/hear")
async def hear_ws(websocket: WebSocket, session_id: str):
    await proxy_hear_stream(websocket, session_id)


@router.post("/{session_id}/check-in")
async def set_check_in(session_id: str, body: dict[str, Any]):
    """Record check-in window end (ms from meeting start) for Path C You-bind."""
    session = store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    end_ms = int(body.get("checkInEndMs") or body.get("endMs") or 5000)
    store.update_session(session_id, checkInEndMs=end_ms)
    store.update_meeting(session.meetingId, checkInEndMs=end_ms)
    return {"ok": True, "checkInEndMs": end_ms}


class ScratchBody(BaseModel):
    userNotes: str = ""


class SessionModeBody(BaseModel):
    modeId: str = Field(min_length=1, max_length=64)


@router.patch("/{session_id}/mode")
async def set_session_mode(session_id: str, body: SessionModeBody):
    """Update capture mode mid-session so finalize/regenerate use the right Recap pack."""
    session = store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    mode = get_mode(body.modeId.strip())
    store.update_session(session_id, modeId=mode["id"])
    store.update_meeting(session.meetingId, modeId=mode["id"])
    pack_id = pack_id_for_mode(mode["id"])
    log.info(
        "session mode updated session=%s meeting=%s mode=%s pack=%s",
        session_id,
        session.meetingId,
        mode["id"],
        pack_id,
    )
    return {"ok": True, "modeId": mode["id"], "packId": pack_id}


@router.post("/{session_id}/notes")
async def save_scratch(session_id: str, body: ScratchBody):
    session = store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    store.update_meeting(session.meetingId, userNotesDraft=body.userNotes)
    return {"ok": True}
