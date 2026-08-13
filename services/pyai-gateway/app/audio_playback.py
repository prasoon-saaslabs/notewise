from __future__ import annotations

import logging
import shutil
from pathlib import Path

from app.config import settings

log = logging.getLogger("audio_playback")


def playback_path(meeting_id: str) -> Path:
    return settings.data_dir / "playback" / f"{meeting_id}.wav"


def persist_playback(meeting_id: str, wav_source: Path) -> str | None:
    """Copy finalized WAV for library playback (deleted with the meeting)."""
    if not wav_source.exists():
        return None
    try:
        size = wav_source.stat().st_size
    except OSError:
        return None
    if size <= 44:
        return None
    dest = playback_path(meeting_id)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(wav_source, dest)
    log.info("playback saved meeting=%s bytes=%s", meeting_id, size)
    return str(dest)


def delete_playback(meeting_id: str) -> None:
    path = playback_path(meeting_id)
    if path.exists():
        try:
            path.unlink()
        except OSError as e:
            log.warning("playback delete failed meeting=%s: %s", meeting_id, e)
