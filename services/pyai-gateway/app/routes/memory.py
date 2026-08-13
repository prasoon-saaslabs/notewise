from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.memory.brief import build_brief
from app.memory.retrieve import retrieve
from app.pyai.ask_llm import synthesize_with_ollama
from app.pyai.ask_recap import ask_with_recap
from app.store.file_store import store

router = APIRouter(tags=["memory"])


class AskBody(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    entityId: str | None = None


@router.get("/modes")
async def modes():
    from app.modes import list_modes

    return [
        {"id": m["id"], "name": m.get("name") or m["id"], "pack_id": m.get("pack_id")}
        for m in list_modes()
    ]


@router.get("/search")
async def search(q: str = "", limit: int = 40):
    meetings = store.search_meetings(q, limit=min(limit, 100))
    return [
        {
            "id": m.id,
            "title": m.title,
            "status": m.status,
            "createdAt": m.createdAt,
            "snippet": m.snippet,
            "backend": m.backend,
            "source": m.source,
        }
        for m in meetings
    ]


@router.post("/ask")
async def ask(body: AskBody):
    hits = retrieve(body.question, top_k=8)
    if body.entityId:
        mids = set(store.entity_meeting_ids(body.entityId))
        hits = [h for h in hits if h["meetingId"] in mids] or hits

    source = "no_evidence"
    source_detail: str | None = None
    bullets: list[dict] = []

    if hits:
        bullets, source = await ask_with_recap(
            body.question,
            hits,
            pack_id=settings.recap_pack_id,
        )
        if not bullets and source in ("recap_failed", "recap_scope"):
            evidence_lines: list[str] = []
            for h in hits:
                for c in h.get("citations") or []:
                    title = c.get("meetingTitle") or "meeting"
                    evidence_lines.append(f"[{title}] {c.get('text', '')}")
                if not h.get("citations"):
                    evidence_lines.append(h.get("text", "")[:400])
            synthesized = await synthesize_with_ollama(body.question, evidence_lines)
            if synthesized:
                source = "ollama"
                for i, line in enumerate(synthesized.splitlines()):
                    t = line.strip().lstrip("-•* ").strip()
                    if not t:
                        continue
                    hit = hits[min(i, len(hits) - 1)]
                    bullets.append({"text": t, "citations": hit.get("citations") or []})
            elif source == "recap_scope":
                source_detail = (
                    "PyAI key lacks recap:read scope — enable Recap on your key, "
                    "or run Ollama locally (OLLAMA_BASE_URL)."
                )

        if not bullets:
            source = "retrieval" if source != "recap_scope" else source
            if not source_detail and source == "retrieval":
                source_detail = "Showing closest transcript matches (LLM synthesis unavailable)."
            for h in hits[:5]:
                bullets.append(
                    {
                        "text": h["text"][:280],
                        "citations": h.get("citations") or [],
                    }
                )

    return {
        "question": body.question,
        "answer": bullets,
        "hits": hits,
        "source": source,
        "sourceDetail": source_detail,
    }


@router.get("/entities")
async def list_entities():
    return [e.model_dump() for e in store.list_entities()]


@router.get("/entities/{entity_id}")
async def get_entity(entity_id: str):
    e = store.get_entity(entity_id)
    if not e:
        raise HTTPException(404, "Entity not found")
    mids = store.entity_meeting_ids(entity_id) or e.meetingIds
    meetings = []
    for mid in mids:
        m = store.get_meeting(mid)
        if m:
            meetings.append(
                {
                    "id": m.id,
                    "title": m.title,
                    "createdAt": m.createdAt,
                    "snippet": m.snippet,
                    "status": m.status,
                }
            )
    meetings.sort(key=lambda x: x["createdAt"], reverse=True)
    return {
        **e.model_dump(),
        "timeline": meetings,
        "commitments": [c.model_dump() for c in store.list_commitments(entity_id=entity_id)],
    }


@router.get("/entities/{entity_id}/brief")
async def entity_brief(entity_id: str):
    brief = build_brief(entity_id)
    if brief.get("error") == "not_found":
        raise HTTPException(404, "Entity not found")
    return brief
