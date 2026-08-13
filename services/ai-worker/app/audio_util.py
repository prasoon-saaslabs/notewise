"""Audio conversion helpers for the AI worker."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional, Tuple


def to_wav(audio_path: str) -> Tuple[str, Optional[str]]:
    """Convert any browser/media file to 16k mono wav. Returns (wav_path, temp_dir_or_None)."""
    src = Path(audio_path)
    if not src.exists():
        raise FileNotFoundError(f"Audio not found: {audio_path}")

    if src.suffix.lower() == ".wav":
        return str(src), None

    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg is required to convert browser audio (webm/mp4) to wav")

    tmp = tempfile.mkdtemp(prefix="nw-audio-")
    wav = os.path.join(tmp, "audio.wav")
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(src),
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        wav,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if proc.returncode != 0 or not os.path.exists(wav):
        raise RuntimeError(f"ffmpeg failed: {(proc.stderr or '')[-400:]}")
    return wav, tmp
