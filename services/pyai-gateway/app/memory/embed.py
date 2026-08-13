from __future__ import annotations

import hashlib
import math
import re
import struct
from uuid import uuid4

from app.store.models import CitedClaim, TranscriptTurn

_WORD = re.compile(r"[a-z0-9']+")
DIM = 128


def tokenize(text: str) -> list[str]:
    return _WORD.findall((text or "").lower())


def embed_text(text: str) -> bytes:
    vec = [0.0] * DIM
    toks = tokenize(text)
    grams = list(toks)
    joined = "".join(toks)
    for i in range(max(0, len(joined) - 2)):
        grams.append(joined[i : i + 3])
    for g in grams:
        h = int(hashlib.blake2b(g.encode(), digest_size=8).hexdigest(), 16)
        idx = h % DIM
        sign = 1.0 if (h >> 8) & 1 else -1.0
        vec[idx] += sign
    n = math.sqrt(sum(v * v for v in vec)) or 1.0
    vec = [v / n for v in vec]
    return struct.pack(f"{DIM}f", *vec)


def unpack(blob: bytes) -> list[float]:
    if not blob:
        return [0.0] * DIM
    n = len(blob) // 4
    return list(struct.unpack(f"{n}f", blob[: n * 4]))


def cosine(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    n = min(len(a), len(b))
    return sum(a[i] * b[i] for i in range(n))


def overlap_score(claim: str, line: str) -> float:
    cw = set(tokenize(claim))
    lw = set(tokenize(line))
    if not cw or not lw:
        return 0.0
    return len(cw & lw) / len(cw)


def attach_line_ids(
    claims: list[CitedClaim],
    turns: list[TranscriptTurn],
    *,
    min_score: float = 0.28,
) -> list[CitedClaim]:
    out: list[CitedClaim] = []
    for c in claims:
        ids = list(c.lineIds)
        start = c.startMs
        if not ids:
            scored = sorted(
                turns,
                key=lambda t: overlap_score(c.text, t.text),
                reverse=True,
            )
            picked = [t for t in scored[:3] if overlap_score(c.text, t.text) >= min_score]
            ids = [t.id for t in picked]
            if picked:
                start = picked[0].startMs
        valid = {t.id for t in turns}
        ids = [i for i in ids if i in valid]
        out.append(c.model_copy(update={"lineIds": ids, "startMs": start}))
    return out


def chunk_turns(turns: list[TranscriptTurn], size: int = 4) -> list[tuple[str, list[str], str]]:
    chunks: list[tuple[str, list[str], str]] = []
    buf: list[TranscriptTurn] = []
    for t in turns:
        if not (t.text or "").strip():
            continue
        buf.append(t)
        if len(buf) >= size:
            ids = [x.id for x in buf]
            text = " ".join(x.text for x in buf)
            chunks.append((str(uuid4()), ids, text))
            buf = buf[-1:]
    if buf:
        ids = [x.id for x in buf]
        text = " ".join(x.text for x in buf)
        chunks.append((str(uuid4()), ids, text))
    return chunks
