from __future__ import annotations

from typing import Any

from app.memory.embed import cosine, embed_text, unpack
from app.store.file_store import store
from app.store.models import TranscriptTurn


def retrieve(query: str, *, top_k: int = 8, min_score: float = 0.18) -> list[dict[str, Any]]:
    qv = unpack(embed_text(query))
    scored: list[tuple[float, dict[str, Any]]] = []
    for ch in store.all_chunks():
        score = cosine(qv, unpack(ch["embedding"]))
        if score >= min_score:
            scored.append((score, ch))
    scored.sort(key=lambda x: x[0], reverse=True)
    out = []
    for score, ch in scored[:top_k]:
        meeting = store.get_meeting(ch["meetingId"])
        line_map = {t.id: t for t in (meeting.transcript if meeting else [])}
        lines = [line_map[i] for i in ch["lineIds"] if i in line_map]
        out.append(
            {
                "score": round(score, 4),
                "meetingId": ch["meetingId"],
                "meetingTitle": meeting.title if meeting else None,
                "text": ch["text"],
                "lineIds": ch["lineIds"],
                "citations": [
                    {
                        "meetingId": ch["meetingId"],
                        "meetingTitle": meeting.title if meeting else None,
                        "lineId": t.id,
                        "startMs": t.startMs,
                        "text": t.text,
                        "speaker": t.speaker,
                    }
                    for t in lines
                ],
            }
        )
    return out


def index_meeting(meeting_id: str, turns: list[TranscriptTurn]) -> None:
    from app.memory.embed import chunk_turns, embed_text

    chunks = []
    for cid, line_ids, text in chunk_turns(turns):
        chunks.append((cid, line_ids, text, embed_text(text)))
    store.replace_chunks(meeting_id, chunks)
