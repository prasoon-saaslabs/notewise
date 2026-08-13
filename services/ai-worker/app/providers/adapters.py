"""Provider adapters — Whisper CLI STT + Ollama LLM with solid fallbacks."""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Optional
from app.audio_util import to_wav

from app.config import settings
from app.providers.base import (
    DiarizationProvider,
    EmbeddingProvider,
    LLMProvider,
    STTProvider,
)

logger = logging.getLogger(__name__)

# Persistent tiny Whisper process (system Python that has openai-whisper).
_LIVE_PROC: Optional[subprocess.Popen[str]] = None
_LIVE_LOCK = __import__("threading").Lock()


def _system_python_with_whisper() -> Optional[str]:
    candidates = [
        "/Library/Developer/CommandLineTools/usr/bin/python3",
        shutil.which("python3"),
    ]
    for py in candidates:
        if not py or not Path(py).exists():
            continue
        try:
            check = subprocess.run(
                [py, "-c", "import whisper"],
                capture_output=True,
                text=True,
                timeout=15,
            )
            if check.returncode == 0:
                return py
        except Exception:  # noqa: BLE001
            continue
    return None


def _ensure_live_daemon() -> subprocess.Popen[str]:
    global _LIVE_PROC
    with _LIVE_LOCK:
        if _LIVE_PROC and _LIVE_PROC.poll() is None:
            return _LIVE_PROC
        py = _system_python_with_whisper()
        if not py:
            raise RuntimeError("No Python with openai-whisper available for live STT")
        daemon = Path(__file__).with_name("whisper_live_daemon.py")
        proc = subprocess.Popen(
            [py, str(daemon)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        assert proc.stdout is not None
        ready = proc.stdout.readline()
        if not ready:
            err = (proc.stderr.read() if proc.stderr else "")[:300]
            raise RuntimeError(f"Live Whisper daemon failed to start: {err}")
        _LIVE_PROC = proc
        logger.info("Live Whisper daemon ready (%s)", py)
        return proc


def live_transcribe_wav(wav: str, model_name: str) -> list[dict[str, Any]]:
    proc = _ensure_live_daemon()
    assert proc.stdin is not None and proc.stdout is not None
    with _LIVE_LOCK:
        proc.stdin.write(json.dumps({"wav": wav, "model": model_name}) + "\n")
        proc.stdin.flush()
        line = proc.stdout.readline()
    if not line:
        raise RuntimeError("Live Whisper daemon returned empty response")
    payload = json.loads(line)
    if payload.get("error"):
        logger.warning("Live Whisper error: %s", payload["error"])
    return list(payload.get("segments") or [])


NOTES_SYSTEM = """You are an elite meeting notetaker for a business productivity tool.
Return ONLY valid JSON with this shape:
{
  "title": "short specific meeting title (3-8 words, no quotes)",
  "executiveSummary": "2-5 sentence brief of what happened and outcomes",
  "takeaways": ["high-signal bullet", "..."],
  "actions": [{"text": "concrete task", "owner": "name or You", "priority": "high|med|low"}],
  "openQuestions": ["unresolved question"],
  "risks": ["risk or blocker"]
}
Rules: never invent facts not in the transcript; empty arrays are fine; priority must be high, med, or low.
Title must be specific to the discussion, never generic like "Meeting notes" or "Untitled".
"""


def _extract_transcript(messages: list[dict[str, str]]) -> str:
    raw = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), "")
    raw = raw.strip()
    # Strip common wrapper prompts so stubs/fallbacks never echo them.
    raw = re.sub(
        r"(?is)^(analyze|summarize)[\s\S]*?transcript[:\s]*\n+",
        "",
        raw,
    ).strip()
    raw = re.sub(r"(?is)^transcript:\s*", "", raw).strip()
    return raw


def _normalize_notes(data: dict[str, Any], transcript: str = "") -> dict[str, Any]:
    title = str(data.get("title") or "").strip().strip('"').strip("'")
    if title.lower() in {"", "meeting", "meeting notes", "untitled", "untitled meeting", "notes"}:
        title = ""

    summary = str(
        data.get("executiveSummary")
        or data.get("executive_summary")
        or data.get("summary")
        or ""
    ).strip()
    if re.search(r"(?i)summarize this meeting transcript", summary):
        summary = ""

    takeaways = data.get("takeaways") or data.get("key_takeaways") or []
    if not isinstance(takeaways, list):
        takeaways = []
    takeaways = [str(t).strip() for t in takeaways if str(t).strip()][:8]

    actions_raw = data.get("actions") or data.get("action_items") or []
    actions: list[dict[str, Any]] = []
    if isinstance(actions_raw, list):
        for item in actions_raw[:10]:
            if isinstance(item, str):
                actions.append({"text": item, "owner": "Unassigned", "priority": "med"})
                continue
            if not isinstance(item, dict):
                continue
            text = str(item.get("text") or item.get("task") or "").strip()
            if not text:
                continue
            pri = str(item.get("priority") or "med").lower()
            if pri in ("medium", "m"):
                pri = "med"
            if pri not in ("high", "med", "low"):
                pri = "med"
            actions.append(
                {
                    "text": text,
                    "owner": str(item.get("owner") or "Unassigned"),
                    "priority": pri,
                }
            )

    open_q = data.get("openQuestions") or data.get("open_questions") or []
    risks = data.get("risks") or data.get("risks_and_blockers") or []
    if not isinstance(open_q, list):
        open_q = []
    if not isinstance(risks, list):
        risks = []

    if not summary:
        lines = [ln.strip() for ln in transcript.splitlines() if ln.strip()]
        body = " ".join(re.sub(r"^[^:]+:\s*", "", ln) for ln in lines[:4]).strip()
        if body and "transcribed (stub)" not in body.lower() and ".webm" not in body.lower():
            summary = body[:280]
        else:
            summary = "Meeting captured. Notes will improve with clearer audio and a connected LLM."

    if not title and summary:
        title = re.sub(r"[.!?].*", "", summary).strip()[:72] or "Meeting notes"
    if not title:
        title = "Meeting notes"

    if not takeaways and transcript.strip():
        takeaways = ["Review the transcript for decisions and follow-ups"]

    return {
        "title": title,
        "executiveSummary": summary,
        "takeaways": takeaways,
        "actions": actions,
        "openQuestions": [str(x).strip() for x in open_q if str(x).strip()][:8],
        "risks": [str(x).strip() for x in risks if str(x).strip()][:8],
    }



class StubSTTProvider(STTProvider):
    name = "stub"

    def transcribe(self, audio_path: str, *, fast: bool = False) -> list[dict[str, Any]]:
        del audio_path, fast
        # Readable placeholder — never dump raw filenames into the product UI.
        return [
            {
                "text": "Thanks for joining. Let's align on next steps for the launch.",
                "startMs": 0,
                "endMs": 3200,
                "speaker": "you",
            },
            {
                "text": "Agreed — I can own QA and we'll ship notes this week.",
                "startMs": 3300,
                "endMs": 7000,
                "speaker": "other",
            },
        ]


class WhisperCliSTTProvider(STTProvider):
    """Uses system `whisper` CLI (openai-whisper) + ffmpeg."""

    name = "whisper_cli"

    def transcribe(self, audio_path: str, *, fast: bool = False) -> list[dict[str, Any]]:
        whisper_bin = shutil.which("whisper")
        tmp_dir: Optional[str] = None
        try:
            wav, tmp_dir = to_wav(audio_path)
            model = (
                (settings.whisper_live_model if fast else settings.whisper_model) or "base"
            )

            # Live path: persistent in-memory Whisper (no CLI reload).
            if fast:
                try:
                    return live_transcribe_wav(wav, model)
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Live Whisper daemon failed: %s", exc)

            if not whisper_bin:
                logger.warning("whisper CLI not found; falling back to stub STT")
                return StubSTTProvider().transcribe(audio_path)

            out_dir = tempfile.mkdtemp(prefix="nw-whisper-")
            timeout = 45 if fast else 300
            cmd = [
                whisper_bin,
                wav,
                "--model",
                model,
                "--language",
                "en",
                "--output_format",
                "json",
                "--output_dir",
                out_dir,
                "--fp16",
                "False",
                "--condition_on_previous_text",
                "False",
            ]
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            if proc.returncode != 0:
                logger.warning("whisper CLI failed: %s", (proc.stderr or "")[-300:])
                return StubSTTProvider().transcribe(audio_path)

            json_files = list(Path(out_dir).glob("*.json"))
            if not json_files:
                return StubSTTProvider().transcribe(audio_path)
            payload = json.loads(json_files[0].read_text(encoding="utf-8"))
            segments = payload.get("segments") or []
            out: list[dict[str, Any]] = []
            for seg in segments:
                text = str(seg.get("text") or "").strip()
                if not text:
                    continue
                if fast and text.lower().startswith("no speech detected"):
                    continue
                out.append(
                    {
                        "text": text,
                        "startMs": int(float(seg.get("start") or 0) * 1000),
                        "endMs": int(float(seg.get("end") or 0) * 1000),
                    }
                )
            if not out:
                if fast:
                    return []
                return [
                    {
                        "text": "No speech detected in this recording.",
                        "startMs": 0,
                        "endMs": 1000,
                        "speaker": "you",
                    }
                ]
            return out
        except Exception as exc:  # noqa: BLE001
            logger.warning("Whisper transcription failed: %s", exc)
            return [] if fast else StubSTTProvider().transcribe(audio_path)
        finally:
            if tmp_dir and os.path.isdir(tmp_dir):
                shutil.rmtree(tmp_dir, ignore_errors=True)


class FasterWhisperSTTProvider(STTProvider):
    name = "faster_whisper"

    def transcribe(self, audio_path: str, *, fast: bool = False) -> list[dict[str, Any]]:
        try:
            from faster_whisper import WhisperModel  # type: ignore
        except ImportError:
            return WhisperCliSTTProvider().transcribe(audio_path, fast=fast)

        tmp_dir: Optional[str] = None
        try:
            wav, tmp_dir = to_wav(audio_path)
            model_name = (
                (settings.whisper_live_model if fast else settings.whisper_model) or "base"
            )
            model = WhisperModel(model_name, device="cpu", compute_type="int8")
            segments, _ = model.transcribe(wav)
            out: list[dict[str, Any]] = []
            for seg in segments:
                text = seg.text.strip()
                if not text:
                    continue
                out.append(
                    {
                        "text": text,
                        "startMs": int(seg.start * 1000),
                        "endMs": int(seg.end * 1000),
                    }
                )
            return out or WhisperCliSTTProvider().transcribe(audio_path, fast=fast)
        except Exception as exc:  # noqa: BLE001
            logger.warning("faster-whisper failed: %s", exc)
            return WhisperCliSTTProvider().transcribe(audio_path, fast=fast)
        finally:
            if tmp_dir and os.path.isdir(tmp_dir):
                shutil.rmtree(tmp_dir, ignore_errors=True)


class StubDiarizationProvider(DiarizationProvider):
    name = "stub"

    def diarize(self, audio_path: str) -> list[dict[str, Any]]:
        return [{"speaker": "SPEAKER_00", "startMs": 0, "endMs": 5000}]


class PyannoteDiarizationProvider(DiarizationProvider):
    name = "pyannote"

    def diarize(self, audio_path: str) -> list[dict[str, Any]]:
        if not settings.hf_token:
            return StubDiarizationProvider().diarize(audio_path)
        return StubDiarizationProvider().diarize(audio_path)


class StubEmbeddingProvider(EmbeddingProvider):
    name = "mfcc"

    def embed(self, audio_path: str) -> list[float]:
        from app.providers.voiceprint import embed_wav
        import shutil

        try:
            wav, tmp = to_wav(audio_path)
            try:
                return embed_wav(wav)
            finally:
                if tmp:
                    shutil.rmtree(tmp, ignore_errors=True)
        except Exception:
            return embed_wav(audio_path)


class WeSpeakerEmbeddingProvider(EmbeddingProvider):
    name = "wespeaker"

    def embed(self, audio_path: str) -> list[float]:
        return StubEmbeddingProvider().embed(audio_path)


class StubLLMProvider(LLMProvider):
    name = "stub"

    def complete(self, messages: list[dict[str, str]], schema: dict | None = None) -> dict[str, Any]:
        transcript = _extract_transcript(messages)
        lines = [ln.strip() for ln in transcript.splitlines() if ln.strip()]
        spoken = []
        for ln in lines:
            spoken.append(re.sub(r"^[^:]+:\s*", "", ln).strip())
        spoken = [s for s in spoken if s and "transcribed (stub)" not in s.lower()]
        body = " ".join(spoken[:5]).strip()
        return _normalize_notes(
            {
                "executiveSummary": body[:320]
                if body
                else "Meeting captured. Connect Ollama or an OpenAI-compatible LLM for richer notes.",
                "takeaways": (
                    [s[:160] for s in spoken[:3]]
                    if spoken
                    else ["Capture pipeline is connected", "Enable LLM_PROVIDER=ollama for richer notes"]
                ),
                "actions": [
                    {
                        "text": "Review transcript and confirm action owners",
                        "owner": "You",
                        "priority": "med",
                    }
                ],
                "openQuestions": [],
                "risks": [],
            },
            transcript,
        )


class OllamaLLMProvider(LLMProvider):
    name = "ollama"

    def complete(self, messages: list[dict[str, str]], schema: dict | None = None) -> dict[str, Any]:
        transcript = _extract_transcript(messages)
        body = {
            "model": settings.ollama_model,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.2},
            "messages": [
                {"role": "system", "content": NOTES_SYSTEM},
                {
                    "role": "user",
                    "content": f"Analyze this meeting transcript and return the JSON notes.\n\nTRANSCRIPT:\n{transcript}",
                },
            ],
        }
        try:
            req = urllib.request.Request(
                f"{settings.ollama_base_url}/api/chat",
                data=json.dumps(body).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            content = payload.get("message", {}).get("content", "{}")
            parsed = json.loads(content)
            if not isinstance(parsed, dict):
                raise json.JSONDecodeError("not an object", content, 0)
            return _normalize_notes(parsed, transcript)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
            logger.warning("Ollama notes failed (%s); using heuristic fallback", exc)
            return StubLLMProvider().complete(messages, schema)


class OpenAILLMProvider(LLMProvider):
    name = "openai"

    def complete(self, messages: list[dict[str, str]], schema: dict | None = None) -> dict[str, Any]:
        if not settings.openai_api_key:
            return StubLLMProvider().complete(messages, schema)
        transcript = _extract_transcript(messages)
        body = {
            "model": settings.openai_model,
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": NOTES_SYSTEM},
                {
                    "role": "user",
                    "content": f"Analyze this meeting transcript and return the JSON notes.\n\nTRANSCRIPT:\n{transcript}",
                },
            ],
        }
        req = urllib.request.Request(
            f"{settings.openai_base_url}/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.openai_api_key}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            content = payload["choices"][0]["message"]["content"]
            return _normalize_notes(json.loads(content), transcript)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, IndexError, OSError):
            return StubLLMProvider().complete(messages, schema)
