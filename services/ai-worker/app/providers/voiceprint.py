"""Lightweight speaker embeddings (MFCC) for You vs Others matching."""

from __future__ import annotations

import json
import logging
import os
import wave
from pathlib import Path
from typing import List, Optional, Sequence, Tuple

import numpy as np

logger = logging.getLogger(__name__)

YOU_THRESHOLD = float(os.environ.get("YOU_MATCH_THRESHOLD", "0.72"))


def _read_wav_mono(path: Path) -> Tuple[np.ndarray, int]:
    with wave.open(str(path), "rb") as wf:
        sr = wf.getframerate()
        n = wf.getnframes()
        channels = wf.getnchannels()
        width = wf.getsampwidth()
        raw = wf.readframes(n)

    if width == 2:
        audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    elif width == 4:
        audio = np.frombuffer(raw, dtype=np.int32).astype(np.float32) / 2147483648.0
    else:
        audio = np.frombuffer(raw, dtype=np.uint8).astype(np.float32)
        audio = (audio - 128.0) / 128.0

    if channels > 1:
        audio = audio.reshape(-1, channels).mean(axis=1)
    return audio, sr


def _resample(audio: np.ndarray, sr: int, target_sr: int = 16000) -> np.ndarray:
    if sr == target_sr or len(audio) == 0:
        return audio
    ratio = target_sr / float(sr)
    n = max(1, int(len(audio) * ratio))
    x_old = np.linspace(0.0, 1.0, num=len(audio), endpoint=False)
    x_new = np.linspace(0.0, 1.0, num=n, endpoint=False)
    return np.interp(x_new, x_old, audio).astype(np.float32)


def embed_wav(path: str) -> List[float]:
    audio, sr = _read_wav_mono(Path(path))
    audio = _resample(audio, sr, 16000)
    if len(audio) < 1600:
        # Too short — pad
        audio = np.pad(audio, (0, 1600 - len(audio)))

    audio = audio - float(audio.mean())
    n_fft = 512
    hop = 256
    n_mfcc = 20
    frames = []
    for i in range(0, max(1, len(audio) - n_fft), hop):
        frame = audio[i : i + n_fft]
        if len(frame) < n_fft:
            frame = np.pad(frame, (0, n_fft - len(frame)))
        windowed = frame * np.hanning(n_fft).astype(np.float32)
        mag = np.abs(np.fft.rfft(windowed)) + 1e-10
        log_mag = np.log(mag[: n_fft // 2])
        # DCT-II via orthonormal matrix
        n = len(log_mag)
        n_c = min(n_mfcc, n)
        dct = np.zeros((n_c, n), dtype=np.float32)
        for k in range(n_c):
            dct[k] = np.cos(np.pi / n * (np.arange(n) + 0.5) * k)
        dct[0] *= 1.0 / np.sqrt(2.0)
        dct *= np.sqrt(2.0 / n)
        mfcc = dct @ log_mag
        frames.append(mfcc)

    arr = np.asarray(frames, dtype=np.float32)
    emb = np.concatenate([arr.mean(axis=0), arr.std(axis=0)])
    norm = float(np.linalg.norm(emb) + 1e-8)
    return (emb / norm).astype(np.float32).tolist()


def cosine_sim(a: Sequence[float], b: Sequence[float]) -> float:
    va = np.asarray(a, dtype=np.float32)
    vb = np.asarray(b, dtype=np.float32)
    if va.size == 0 or vb.size == 0 or va.size != vb.size:
        return 0.0
    denom = float(np.linalg.norm(va) * np.linalg.norm(vb) + 1e-8)
    return float(np.dot(va, vb) / denom)


def save_embedding(vector: Sequence[float], path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps({"vector": list(vector)}), encoding="utf-8")


def load_embedding(path: Optional[str]) -> Optional[List[float]]:
    if not path or not Path(path).exists():
        return None
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        vec = data.get("vector")
        if isinstance(vec, list) and vec:
            return [float(x) for x in vec]
    except Exception:  # noqa: BLE001
        return None
    return None


def label_segments_against_you(
    segments: list[dict],
    audio_wav: str,
    you_embedding: Optional[Sequence[float]],
) -> list[dict]:
    """Attach speaker/kind using enrollment match when available."""
    import subprocess
    import tempfile
    import shutil

    if not you_embedding:
        # No enrollment — keep chronological Speakers without forcing all to You.
        out = []
        for i, seg in enumerate(segments):
            out.append(
                {
                    **seg,
                    "speaker": "You" if i == 0 else f"Speaker {(i % 2) + 1}",
                    "kind": "you" if i == 0 else "other",
                }
            )
        return out

    labeled: list[dict] = []
    tmp = tempfile.mkdtemp(prefix="nw-seg-")
    try:
        for i, seg in enumerate(segments):
            start = max(0.0, float(seg.get("startMs", 0)) / 1000.0)
            end = max(start + 0.2, float(seg.get("endMs", start * 1000 + 1000)) / 1000.0)
            clip = os.path.join(tmp, f"seg-{i}.wav")
            cmd = [
                "ffmpeg",
                "-y",
                "-i",
                audio_wav,
                "-ss",
                f"{start:.3f}",
                "-to",
                f"{end:.3f}",
                "-ar",
                "16000",
                "-ac",
                "1",
                clip,
            ]
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            kind = "other"
            speaker = "Other"
            if proc.returncode == 0 and os.path.exists(clip) and os.path.getsize(clip) > 1000:
                try:
                    emb = embed_wav(clip)
                    sim = cosine_sim(you_embedding, emb)
                    if sim >= YOU_THRESHOLD:
                        kind = "you"
                        speaker = "You"
                    else:
                        kind = "other"
                        speaker = "Other"
                except Exception as exc:  # noqa: BLE001
                    logger.warning("segment embed failed: %s", exc)
            labeled.append({**seg, "speaker": speaker, "kind": kind, "youScore": None})
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return labeled
