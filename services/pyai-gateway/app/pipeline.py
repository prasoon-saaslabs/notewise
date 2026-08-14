from __future__ import annotations

import logging
import shutil
import time
from pathlib import Path
from typing import Any

from app.audio_playback import delete_playback, persist_playback
from app.audio_util import ensure_wav_for_job, wav_duration_sec
from app.config import settings
from app.harness import (
    apply_gated_notes,
    extract_structured,
    gate_claims,
    notes_to_claims,
)
from app.memory.entities import extract_and_link
from app.memory.retrieve import index_meeting
from app.modes import get_mode
from app.pyai.client import PyAIError
from app.pyai.hear_jobs import (
    create_transcription_job,
    extract_segments,
    sync_transcribe,
    wait_for_job,
)
from app.pyai.recap import (
    map_recap_to_notes,
    segments_to_utterances,
    submit_utterances,
    wait_for_recap,
)
from app.pyai.trace import record_run
from app.notes_builder import (
    build_notes_from_transcript,
    is_placeholder_title,
    merge_recap_with_user_notes,
    suggest_meeting_title,
)
from app.pyai.speakers import bind_speakers
from app.store.file_store import store
from app.store.margin import write_margin_folder
from app.store.models import NotesPayload, TranscriptTurn

log = logging.getLogger("pyai.pipeline")


async def finalize_session(
    session_id: str,
    *,
    user_notes: str | None = None,
    live_turns: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    session = store.get_session(session_id)
    if not session:
        raise ValueError("Session not found")

    meeting = store.get_meeting(session.meetingId)
    if not meeting:
        raise ValueError("Meeting not found")

    store.update_session(session_id, status="finalizing")
    meeting_updates: dict[str, Any] = {"status": "processing"}
    if user_notes is not None:
        meeting_updates["userNotesDraft"] = user_notes
    store.update_meeting(meeting.id, **meeting_updates)

    upload_dir = settings.uploads_dir / session_id
    chunk_paths = sorted(upload_dir.glob("chunk-*"))
    audio_concat = upload_dir / "recording.bin"
    if chunk_paths:
        from app.audio_util import concat_files

        concat_files(chunk_paths, audio_concat)
    elif (upload_dir / "recording.webm").exists():
        audio_concat = upload_dir / "recording.webm"
    elif (upload_dir / "recording.wav").exists():
        audio_concat = upload_dir / "recording.wav"

    pcm_path = upload_dir / "live.pcm"
    job_audio = upload_dir / "job_audio.wav"
    if audio_concat.exists() or pcm_path.exists():
        src = audio_concat if audio_concat.exists() else pcm_path
        job_audio = ensure_wav_for_job(
            src,
            pcm_path if pcm_path.exists() else None,
            job_audio,
        )
        log.info(
            "finalize audio session=%s bytes=%s (purged after STT)",
            session_id,
            job_audio.stat().st_size if job_audio.exists() else 0,
        )
    else:
        # Fall back to live transcript only (no audio for batch)
        job_audio = Path()
        log.warning("finalize: no audio files for session=%s", session_id)

    mode = "channel" if session.channelMode == "stereo" else "diarize"
    bind_mode = "mix" if session.channelMode == "mix" else mode
    call_id = meeting.callId or meeting.id
    segments: list[dict[str, Any]] = []
    rate_limited = False

    try:
        if job_audio.exists() and job_audio.stat().st_size > 44:
            try:
                segments = await _transcribe_audio(
                    job_audio,
                    call_id=call_id,
                    mode=mode,  # type: ignore[arg-type]
                )
            except PyAIError as e:
                if e.status == 429:
                    rate_limited = True
                log.warning("batch/sync transcribe failed: %s", e)
                segments = []
            except Exception as e:
                log.warning("batch/sync transcribe failed: %s", e)
                segments = []
        # Prefer batch/sync segments; fall back to server live Hear finals
        if not segments:
            for entry in session.liveTranscript:
                text = (entry.get("text") or "").strip()
                if not text:
                    continue
                segments.append(
                    {
                        "speaker": "speaker_0",
                        "text": text,
                        "start_s": (entry.get("startMs") or 0) / 1000.0,
                        "end_s": (entry.get("endMs") or 0) / 1000.0,
                    }
                )
        # Last resort: browser-side live captions sent with finalize
        if not segments and live_turns:
            for i, entry in enumerate(live_turns):
                text = (entry.get("text") or "").strip()
                if not text:
                    continue
                segments.append(
                    {
                        "speaker": entry.get("speaker") or "speaker_0",
                        "text": text,
                        "start_s": (entry.get("startMs") or i * 1000) / 1000.0,
                        "end_s": (entry.get("endMs") or (i + 1) * 1000) / 1000.0,
                    }
                )
        if not segments:
            if rate_limited and not live_turns and not session.liveTranscript:
                raise RuntimeError("PYAI_RATE_LIMIT")
            raise RuntimeError("EMPTY_TRANSCRIPT")

        check_in = session.checkInEndMs or meeting.checkInEndMs or 5000
        turns, binding = bind_speakers(
            segments,
            mode=bind_mode,
            check_in_end_ms=check_in,
            binding=meeting.speakerBinding or {},
        )

        # Prefer Recap via call_id (job-linked); also submit utterances with Margin notes
        you_speaker = next((k for k, v in binding.items() if v == "you"), None)
        utterances = segments_to_utterances(segments, you_speaker=you_speaker)

        notes: NotesPayload
        meeting_mode = get_mode(session.modeId or meeting.modeId)
        started = time.monotonic()
        try:
            await submit_utterances(
                call_id,
                utterances,
                customer_name=meeting.title,
                user_notes=user_notes,
                pack_id=meeting_mode.get("pack_id"),
            )
            recap = await wait_for_recap(call_id)
            notes = merge_recap_with_user_notes(
                map_recap_to_notes(recap),
                user_notes,
                transcript_texts=[t.text for t in turns if t.text],
            )
        except Exception as e:
            log.warning("Recap failed, using local notes builder: %s", e)
            notes = build_notes_from_transcript(
                turns,
                title=meeting.title,
                user_notes=user_notes,
                created_at=meeting.createdAt,
            )
        notes = await _gate_and_remember(
            meeting.id,
            turns,
            notes,
            mode_id=meeting_mode.get("id"),
            started=started,
        )

        duration = None
        if job_audio.exists():
            duration = wav_duration_sec(job_audio)
        if duration is None and turns:
            duration = max(t.endMs for t in turns) / 1000.0

        title = suggest_meeting_title(
            turns,
            preferred=(notes.title if notes else None) or meeting.title,
            user_notes=user_notes,
            takeaways=list(notes.takeaways or []) if notes else None,
            summary=notes.executiveSummary if notes else None,
            created_at=meeting.createdAt,
        )
        if notes and (is_placeholder_title(notes.title) or notes.title != title):
            notes = notes.model_copy(update={"title": title})
        snippet = None
        if notes.executiveSummary:
            snippet = notes.executiveSummary.replace("\n", " ")[:160]
        elif turns:
            snippet = turns[0].text[:160]
        entity_ids = extract_and_link(meeting.id, turns, notes, title=title)
        playback_file = (
            persist_playback(meeting.id, job_audio) if job_audio.exists() else None
        )
        updated = store.update_meeting(
            meeting.id,
            title=title,
            status="ready",
            transcript=[t.model_dump() for t in turns],
            notes=notes.model_dump() if notes else None,
            speakerBinding=binding,
            durationSec=int(duration) if duration else meeting.durationSec,
            snippet=snippet or meeting.snippet,
            audioPath=playback_file,
            userNotesDraft=user_notes if user_notes is not None else meeting.userNotesDraft,
            error=None,
            entityIds=entity_ids,
            modeId=meeting_mode.get("id"),
        )
        assert updated
        folder = write_margin_folder(updated, user_notes=user_notes)
        store.update_meeting(meeting.id, marginPath=str(folder))
        store.update_session(session_id, status="closed")
        _purge_audio(upload_dir)
        return {"meetingId": meeting.id, "status": "ready"}
    except Exception as e:
        log.exception("finalize failed")
        store.update_meeting(meeting.id, status="failed", error=str(e), audioPath=None)
        store.update_session(session_id, status="closed")
        _purge_audio(upload_dir)
        return {"meetingId": meeting.id, "status": "failed", "error": str(e)}


async def _transcribe_audio(
    job_audio: Path,
    *,
    call_id: str,
    mode: str,
) -> list[dict[str, Any]]:
    """Hear batch job with diarize/channel; fall back to sync STT on failure."""
    try:
        job = await create_transcription_job(
            job_audio,
            call_id=call_id,
            mode=mode,  # type: ignore[arg-type]
            include_recap_fields=True,
        )
    except PyAIError as e:
        log.warning("Hear job with recap fields failed (%s); retrying without pack_id", e)
        try:
            job = await create_transcription_job(
                job_audio,
                call_id=call_id,
                mode=mode,  # type: ignore[arg-type]
                include_recap_fields=False,
            )
        except PyAIError as e2:
            log.warning("Hear batch job failed (%s); falling back to sync transcription", e2)
            sync = await sync_transcribe(job_audio)
            text = (sync.get("text") or "").strip()
            if not text:
                return []
            return [
                {
                    "speaker": "speaker_0",
                    "text": text,
                    "start_s": 0.0,
                    "end_s": float(sync.get("duration") or sync.get("audio_seconds") or 0),
                }
            ]

    job_id = str(job.get("id") or job.get("job_id") or "")
    if not job_id:
        raise RuntimeError(f"No job id in response: {job}")
    log.info("Hear job %s mode=%s call_id=%s", job_id, mode, call_id)
    done = await wait_for_job(job_id)
    # Offloaded large results
    if done.get("result_url") and not done.get("result"):
        import httpx

        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.get(done["result_url"])
            res.raise_for_status()
            done = {**done, "result": res.json()}
    return extract_segments(done)


async def regenerate_notes(meeting_id: str, *, user_notes: str | None = None) -> dict[str, Any]:
    meeting = store.get_meeting(meeting_id)
    if not meeting:
        raise ValueError("Meeting not found")
    store.update_meeting(meeting_id, status="processing")
    call_id = meeting.callId or meeting.id
    segments = [
        {
            "speaker": "you" if t.kind == "you" else t.speaker,
            "kind": t.kind,
            "text": t.text,
            "start_s": t.startMs / 1000.0,
            "end_s": t.endMs / 1000.0,
        }
        for t in meeting.transcript
    ]
    you_speaker = next(
        (k for k, v in (meeting.speakerBinding or {}).items() if v == "you"),
        "you",
    )
    utterances = segments_to_utterances(segments, you_speaker=you_speaker)
    notes_text = user_notes if user_notes is not None else meeting.userNotesDraft
    started = time.monotonic()
    try:
        await submit_utterances(
            call_id,
            utterances,
            customer_name=meeting.title,
            user_notes=notes_text,
            pack_id=get_mode(meeting.modeId).get("pack_id"),
        )
        recap = await wait_for_recap(call_id)
        notes = merge_recap_with_user_notes(
            map_recap_to_notes(recap),
            notes_text,
            transcript_texts=[t.text for t in meeting.transcript if getattr(t, "text", None)],
        )
    except Exception as e:
        log.warning("Regenerate Recap failed, using local notes builder: %s", e)
        notes = build_notes_from_transcript(
            meeting.transcript,
            title=meeting.title,
            user_notes=notes_text,
            created_at=meeting.createdAt,
        )
    notes = await _gate_and_remember(
        meeting.id,
        meeting.transcript,
        notes,
        mode_id=meeting.modeId,
        started=started,
    )
    entity_ids = extract_and_link(meeting.id, meeting.transcript, notes, title=meeting.title)
    title = suggest_meeting_title(
        meeting.transcript,
        preferred=(notes.title if notes else None) or meeting.title,
        user_notes=notes_text,
        takeaways=list(notes.takeaways or []) if notes else None,
        summary=notes.executiveSummary if notes else None,
        created_at=meeting.createdAt,
    )
    if notes and (is_placeholder_title(notes.title) or notes.title != title):
        notes = notes.model_copy(update={"title": title})
    updated = store.update_meeting(
        meeting_id,
        title=title,
        notes=notes.model_dump(),
        status="ready",
        userNotesDraft=notes_text,
        entityIds=entity_ids or meeting.entityIds,
    )
    assert updated
    folder = write_margin_folder(updated, user_notes=notes_text)
    store.update_meeting(meeting_id, marginPath=str(folder))
    return {"meetingId": meeting_id, "status": "ready", "notes": notes.model_dump()}


async def _gate_and_remember(
    meeting_id: str,
    turns: list[TranscriptTurn],
    notes: NotesPayload,
    *,
    mode_id: str | None,
    started: float,
) -> NotesPayload:
    notes = extract_structured(notes, turns, meeting_id)
    claims = notes_to_claims(notes, meeting_id)
    shipped, blocked, _retries, status = await gate_claims(
        claims, turns, started=started
    )
    status = status.model_copy(update={"modeId": mode_id})
    gated = apply_gated_notes(notes, shipped, blocked, status)
    store.save_run(meeting_id, status)
    index_meeting(meeting_id, turns)
    try:
        await record_run(
            meeting_id,
            {
                "exit": status.exit,
                "claimsCited": status.claimsCited,
                "claimsBlocked": status.claimsBlocked,
                "tokens": status.tokens,
                "elapsedMs": status.elapsedMs,
            },
        )
    except Exception:
        log.info("Trace record skipped")
    return gated


def _purge_audio(upload_dir: Path) -> None:
    """PRD: do not store audio at rest after the STT hop."""
    if not upload_dir.exists():
        return
    try:
        shutil.rmtree(upload_dir, ignore_errors=True)
    except Exception as e:
        log.warning("audio purge failed: %s", e)
