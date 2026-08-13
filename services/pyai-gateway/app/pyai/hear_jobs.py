from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any, Literal

from app.config import settings
from app.pyai.client import PyAIError, pyai_request

log = logging.getLogger("pyai.hear_jobs")

SpeakerMode = Literal["diarize", "channel"]


async def create_transcription_job(
    audio_path: Path,
    *,
    call_id: str,
    mode: SpeakerMode = "diarize",
    pack_id: str | None = None,
    include_recap_fields: bool = True,
) -> dict[str, Any]:
    """POST /v1/transcription/jobs with multipart audio + diarize XOR channel.

    Multipart quirks (from PyAI OpenAPI):
    - `output_formats` is a comma-separated string (e.g. `json`), not a JSON array
    - `diarize` / `channel` are `"true"` / `"false"` strings
    - file part name is `audio`
    """
    data: dict[str, str] = {
        "call_id": call_id,
        "output_formats": "json",
        "diarize": "false",
        "channel": "false",
    }
    if mode == "channel":
        data["channel"] = "true"
    else:
        data["diarize"] = "true"

    if include_recap_fields:
        pack = pack_id or settings.recap_pack_id
        if pack:
            data["pack_id"] = pack

    content = audio_path.read_bytes()
    filename = audio_path.name if audio_path.suffix else "audio.wav"
    ext = audio_path.suffix.lower()
    if ext not in (".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm", ".mp4"):
        filename = "audio.webm"
        ext = ".webm"
    mime = {
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".mp4": "audio/mp4",
        ".flac": "audio/flac",
        ".ogg": "audio/ogg",
        ".webm": "audio/webm",
    }.get(ext, "application/octet-stream")
    files = {
        "audio": (filename, content, mime),
    }
    log.info(
        "Creating Hear job call_id=%s mode=%s bytes=%s fields=%s",
        call_id,
        mode,
        len(content),
        {k: v for k, v in data.items()},
    )
    result = await pyai_request("POST", "/transcription/jobs", data=data, files=files)
    if not isinstance(result, dict):
        raise PyAIError("Unexpected transcription job response")
    return result


async def sync_transcribe(audio_path: Path) -> dict[str, Any]:
    """Fallback: POST /v1/audio/transcriptions (no diarization)."""
    content = audio_path.read_bytes()
    ext = audio_path.suffix.lower() or ".webm"
    mime = {
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".webm": "audio/webm",
    }.get(ext, "application/octet-stream")
    files = {
        "file": (audio_path.name or f"audio{ext}", content, mime),
    }
    data = {"model": "pyai-hear"}
    result = await pyai_request(
        "POST",
        "/audio/transcriptions",
        data=data,
        files=files,
        timeout=180.0,
    )
    if not isinstance(result, dict):
        raise PyAIError("Unexpected sync transcription response")
    return result


async def get_transcription_job(job_id: str) -> dict[str, Any]:
    result = await pyai_request("GET", f"/transcription/jobs/{job_id}")
    if not isinstance(result, dict):
        raise PyAIError("Unexpected job poll response")
    return result


async def wait_for_job(
    job_id: str,
    *,
    timeout_s: float = 600.0,
    interval_s: float = 2.0,
) -> dict[str, Any]:
    deadline = asyncio.get_event_loop().time() + timeout_s
    while True:
        job = await get_transcription_job(job_id)
        status = (job.get("status") or "").lower()
        if status in ("completed", "complete", "succeeded", "done"):
            return job
        if status in ("failed", "error", "cancelled"):
            raise PyAIError(
                f"Transcription job failed: {job.get('error') or status}",
                body=str(job)[:2000],
            )
        if asyncio.get_event_loop().time() > deadline:
            raise PyAIError(f"Transcription job timed out: {job_id}")
        await asyncio.sleep(interval_s)


def extract_segments(job: dict[str, Any]) -> list[dict[str, Any]]:
    """Normalize job result into segment dicts with speaker/text/timing."""
    # Large results may be offloaded
    result = job.get("result") or job.get("output") or job
    segments: list[dict[str, Any]] = []

    if isinstance(result.get("segments"), list):
        for seg in result["segments"]:
            segments.append(_norm_seg(seg))
    elif isinstance(result.get("utterances"), list):
        for u in result["utterances"]:
            segments.append(_norm_seg(u))
    elif isinstance(result.get("channels"), list):
        for ch_i, ch in enumerate(result["channels"]):
            alts = ch.get("alternatives") or [{}]
            words = alts[0].get("words") or []
            if words:
                text = alts[0].get("transcript") or " ".join(
                    w.get("word") or w.get("text") or "" for w in words
                )
                start = words[0].get("start") or words[0].get("start_s") or 0
                end = words[-1].get("end") or words[-1].get("end_s") or start
                segments.append(
                    {
                        "speaker": f"channel_{ch_i}",
                        "channel": ch_i,
                        "text": text.strip(),
                        "start_s": float(start),
                        "end_s": float(end),
                    }
                )
            for utt in ch.get("utterances") or []:
                seg = _norm_seg(utt)
                seg["channel"] = ch_i
                seg["speaker"] = seg.get("speaker") or f"channel_{ch_i}"
                segments.append(seg)
    elif isinstance(result.get("text"), str) and result["text"].strip():
        segments.append(
            {
                "speaker": "speaker_0",
                "text": result["text"].strip(),
                "start_s": 0.0,
                "end_s": float(result.get("duration") or result.get("audio_seconds") or 0),
            }
        )

    transcript = result.get("transcript") or job.get("transcript")
    if not segments and isinstance(transcript, dict):
        for u in transcript.get("utterances") or []:
            segments.append(_norm_seg(u))

    return [s for s in segments if s.get("text")]


def _norm_seg(raw: dict[str, Any]) -> dict[str, Any]:
    import re

    text = (raw.get("text") or raw.get("transcript") or "").strip()
    speaker = (
        raw.get("speaker")
        or raw.get("speaker_role")
        or raw.get("speaker_id")
        or (f"channel_{raw['channel']}" if "channel" in raw else None)
    )
    # Some Hear results embed "[speaker_1] …" in text
    m = re.match(r"^\[(speaker[_\s]?\d+|channel[_\s]?\d+)\]\s*(.*)$", text, re.I)
    if m:
        if not speaker:
            speaker = re.sub(r"\s+", "_", m.group(1).lower())
        text = m.group(2).strip()
    if not speaker:
        speaker = "speaker_0"
    start = raw.get("start_s")
    if start is None:
        start = raw.get("offset_s")
    if start is None:
        start = raw.get("start")
        if start is not None and float(start) > 1000:
            start = float(start) / 1000.0
    if start is None and raw.get("start_ms") is not None:
        start = float(raw["start_ms"]) / 1000.0
    start = float(start or 0)

    end = raw.get("end_s")
    if end is None and raw.get("duration_s") is not None:
        end = start + float(raw["duration_s"])
    if end is None:
        end = raw.get("end")
        if end is not None and float(end) > 1000:
            end = float(end) / 1000.0
    if end is None and raw.get("end_ms") is not None:
        end = float(raw["end_ms"]) / 1000.0
    end = float(end if end is not None else start)

    out: dict[str, Any] = {
        "speaker": str(speaker),
        "text": text,
        "start_s": start,
        "end_s": end,
    }
    if "channel" in raw:
        out["channel"] = raw["channel"]
    if raw.get("duration_s") is not None:
        out["duration_s"] = float(raw["duration_s"])
    return out
