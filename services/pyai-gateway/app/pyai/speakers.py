from __future__ import annotations

from typing import Any
from uuid import uuid4

from app.store.models import TranscriptTurn


def bind_speakers(
    segments: list[dict[str, Any]],
    *,
    mode: str,
    check_in_end_ms: int = 5000,
    binding: dict[str, str] | None = None,
) -> tuple[list[TranscriptTurn], dict[str, str]]:
    """
    Map Hear segments → TranscriptTurn with You/Other.

    - channel mode: channel_0 / channel 0 → You, channel_1 → Other
    - diarize mode: speaker overlapping check-in window → You (Path C)
    - optional binding: { raw_speaker_id: "you"|"other" }
    """
    binding = dict(binding or {})
    check_in_end_s = max(0, check_in_end_ms) / 1000.0

    if mode == "mix":
        turns: list[TranscriptTurn] = []
        for seg in segments:
            start_ms = int(float(seg.get("start_s") or 0) * 1000)
            end_ms = int(float(seg.get("end_s") or start_ms / 1000) * 1000)
            sp = str(seg.get("speaker") or "speaker_0")
            binding.setdefault(sp, "guest")
            turns.append(
                TranscriptTurn(
                    id=str(uuid4()),
                    speaker="Speaker",
                    kind="guest",
                    text=seg["text"],
                    startMs=start_ms,
                    endMs=end_ms,
                )
            )
        return turns, binding

    if mode == "channel":
        for seg in segments:
            ch = seg.get("channel")
            sp = str(seg.get("speaker") or "")
            if ch == 0 or sp in ("channel_0", "0") or sp.endswith("_0"):
                binding[sp] = "you"
            elif ch == 1 or sp in ("channel_1", "1") or sp.endswith("_1"):
                binding[sp] = "other"
            elif sp not in binding:
                binding[sp] = "you" if "0" in sp else "other"
    else:
        # Path C: first speaker with speech overlapping check-in window = You
        if not any(v == "you" for v in binding.values()):
            you_id: str | None = None
            for seg in segments:
                start = float(seg.get("start_s") or 0)
                end = float(seg.get("end_s") or start)
                if start < check_in_end_s and end > 0:
                    you_id = str(seg.get("speaker") or "speaker_0")
                    break
            if you_id is None and segments:
                you_id = str(segments[0].get("speaker") or "speaker_0")
            if you_id:
                binding[you_id] = "you"
                for seg in segments:
                    sp = str(seg.get("speaker") or "")
                    if sp and sp not in binding:
                        binding[sp] = "other"

    turns: list[TranscriptTurn] = []
    speaker_labels: dict[str, str] = {}
    other_n = 0
    for seg in segments:
        sp = str(seg.get("speaker") or "speaker_0")
        kind_raw = binding.get(sp, "other")
        kind: str
        if kind_raw == "you":
            kind = "you"
            label = "You"
        else:
            kind = "other"
            if sp not in speaker_labels:
                other_n += 1
                speaker_labels[sp] = f"Speaker {other_n}" if other_n > 1 or kind_raw != "you" else "Other"
                # Prefer "Other" when only one non-you speaker
            label = speaker_labels.get(sp, "Other")
        # Simplify: single other → "Other"
        start_ms = int(float(seg.get("start_s") or 0) * 1000)
        end_ms = int(float(seg.get("end_s") or start_ms / 1000) * 1000)
        turns.append(
            TranscriptTurn(
                id=str(uuid4()),
                speaker="You" if kind == "you" else label,
                kind=kind,  # type: ignore[arg-type]
                text=seg["text"],
                startMs=start_ms,
                endMs=end_ms,
            )
        )

    # Collapse Speaker N → Other when only one other speaker
    others = {t.speaker for t in turns if t.kind == "other"}
    if len(others) == 1:
        only = next(iter(others))
        turns = [
            t.model_copy(update={"speaker": "Other"}) if t.kind == "other" else t
            for t in turns
        ] if only.startswith("Speaker") or only != "Other" else turns
        # Always normalize single other to "Other"
        turns = [
            t.model_copy(update={"speaker": "Other"}) if t.kind == "other" else t
            for t in turns
        ]

    return turns, binding


def apply_manual_bind(
    binding: dict[str, str],
    raw_speaker: str,
    *,
    as_you: bool = True,
) -> dict[str, str]:
    out = dict(binding)
    if as_you:
        for k in list(out):
            if out[k] == "you":
                out[k] = "other"
        out[raw_speaker] = "you"
    else:
        out[raw_speaker] = "other"
    return out
