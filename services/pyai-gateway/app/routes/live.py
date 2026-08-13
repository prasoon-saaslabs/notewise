from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.memory.embed import cosine, embed_text, unpack
from app.memory.retrieve import retrieve
from app.pyai.llm import chat_text
from app.store.file_store import store

router = APIRouter(tags=["live"])

COPILOT_BUDGET = 6
SIM_THRESHOLD = 0.42


class CopilotBody(BaseModel):
    meetingId: str
    utterance: str = Field(min_length=2, max_length=2000)
    agenda: list[str] = Field(default_factory=list)


class VoiceAskBody(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    speak: bool = True
    clone: bool = False


@router.post("/copilot/hint")
async def copilot_hint(body: CopilotBody):
    meeting = store.get_meeting(body.meetingId)
    if not meeting:
        raise HTTPException(404, "Meeting not found")
    session = store.get_session(meeting.sessionId or "")
    used = session.copilotCalls if session else 0
    if used >= COPILOT_BUDGET:
        return {"skipped": True, "reason": "budget"}

    hits = retrieve(body.utterance, top_k=4, min_score=SIM_THRESHOLD)
    qv = unpack(embed_text(body.utterance))
    best = 0.0
    if hits:
        best = float(hits[0]["score"])
    hint = None
    kind = "none"
    if best >= SIM_THRESHOLD and hits:
        prior = hits[0]
        text = await chat_text(
            "Write one quiet copilot hint (max 40 words) reminding the user how they handled this before. Cite nothing extra.",
            f"LIVE: {body.utterance}\nPRIOR: {prior['text']}",
            timeout=20.0,
        )
        hint = text or prior["text"][:220]
        kind = "repeated-objection"
        if session:
            store.update_session(session.id, copilotCalls=used + 1)
    agenda_hits = []
    for item in body.agenda:
        if cosine(qv, unpack(embed_text(item))) >= 0.35:
            agenda_hits.append(item)
    commitment = None
    low = body.utterance.lower()
    if any(w in low for w in ("i'll", "i will", "we will", "we'll send", "i can send")):
        commitment = body.utterance.strip()
        kind = kind if kind != "none" else "commitment"
    return {
        "skipped": hint is None and not agenda_hits and not commitment,
        "kind": kind,
        "hint": hint,
        "prior": hits[0] if hits else None,
        "agendaCoverage": agenda_hits,
        "commitment": commitment,
        "budgetUsed": used + (1 if hint else 0),
        "budgetMax": COPILOT_BUDGET,
    }


@router.post("/voice/ask")
async def voice_ask(body: VoiceAskBody):
    from app.routes.memory import AskBody, ask
    from app.pyai.cast import speak
    import base64

    result = await ask(AskBody(question=body.question))
    spoken = " ".join(b["text"] for b in result.get("answer") or [])[:800]
    audio_b64 = None
    if body.speak and spoken:
        clone_id = None
        if body.clone:
            from app.pyai.clone import list_voices

            voices = await list_voices()
            if voices:
                clone_id = str(voices[0].get("id") or voices[0].get("voice_id") or "") or None
        raw = await speak(spoken, clone_id=clone_id)
        if raw:
            audio_b64 = base64.b64encode(raw).decode("ascii")
    return {**result, "spoken": spoken, "audioBase64": audio_b64}
