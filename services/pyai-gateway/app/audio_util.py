from __future__ import annotations

import struct
import wave
from pathlib import Path


def write_pcm16_wav(
    path: Path,
    pcm: bytes,
    *,
    sample_rate: int = 16000,
    channels: int = 1,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm)


def concat_files(paths: list[Path], dest: Path) -> Path:
    """Concatenate binary chunk files (webm/m4a) as-is for storage; prefer WAV when possible."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("wb") as out:
        for p in paths:
            if p.exists():
                out.write(p.read_bytes())
    return dest


def pcm_files_to_wav(pcm_paths: list[Path], dest: Path, *, sample_rate: int = 16000) -> Path:
    buf = bytearray()
    for p in pcm_paths:
        if p.exists():
            buf.extend(p.read_bytes())
    write_pcm16_wav(dest, bytes(buf), sample_rate=sample_rate)
    return dest


def ensure_wav_for_job(session_audio: Path, pcm_sidecar: Path | None, dest: Path) -> Path:
    """
    Prefer PCM sidecar (from live Hear capture) → real WAV.
    Else keep the original container extension (webm/m4a) — never label webm as .wav.
    """
    if pcm_sidecar and pcm_sidecar.exists() and pcm_sidecar.stat().st_size > 0:
        wav_dest = dest if dest.suffix.lower() == ".wav" else dest.with_suffix(".wav")
        return pcm_files_to_wav([pcm_sidecar], wav_dest)

    if session_audio.suffix.lower() == ".wav":
        wav_dest = dest if dest.suffix.lower() == ".wav" else dest.with_suffix(".wav")
        wav_dest.write_bytes(session_audio.read_bytes())
        return wav_dest

    # recording.bin is usually concatenated webm/m4a chunks from the browser
    suffix = session_audio.suffix.lower()
    if suffix in ("", ".bin"):
        head = session_audio.read_bytes()[:16] if session_audio.exists() else b""
        suffix = ".webm" if head.startswith(b"\x1aE\xdf\xa3") or b"webm" in head[:64] else ".webm"
    out = dest.with_suffix(suffix)
    out.write_bytes(session_audio.read_bytes())
    return out


def interleave_stereo_pcm(left: bytes, right: bytes) -> bytes:
    """Interleave two mono PCM16 streams (pad shorter). Channel 0=You, 1=Other."""
    n = max(len(left), len(right))
    # pad to even
    if n % 2:
        n += 1
    left = left.ljust(n, b"\x00")
    right = right.ljust(n, b"\x00")
    out = bytearray(n * 2)
    for i in range(0, n, 2):
        out[i * 2 : i * 2 + 2] = left[i : i + 2]
        out[i * 2 + 2 : i * 2 + 4] = right[i : i + 2]
    return bytes(out)


def wav_duration_sec(path: Path) -> float | None:
    try:
        with wave.open(str(path), "rb") as wf:
            return wf.getnframes() / float(wf.getframerate() or 1)
    except Exception:
        return None


def read_wav_info(path: Path) -> tuple[int, int, int]:
    with wave.open(str(path), "rb") as wf:
        return wf.getnchannels(), wf.getframerate(), wf.getsampwidth()
