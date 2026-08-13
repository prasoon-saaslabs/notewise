from __future__ import annotations

import logging
import re
import time
from datetime import datetime, timezone
from uuid import uuid4

from app.memory.embed import attach_line_ids, overlap_score
from app.pyai.llm import chat_json
from app.store.models import (
    ActionItem,
    CitedClaim,
    NotesPayload,
    RetryRecord,
    RunStatus,
    TranscriptTurn,
)

log = logging.getLogger("harness")

MAX_RETRIES = 3
BUDGET_TOKENS = 80_000
BUDGET_USD = 1.0
BUDGET_MS = 120_000


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def notes_to_claims(notes: NotesPayload, meeting_id: str) -> list[CitedClaim]:
    claims: list[CitedClaim] = []

    def add(text: str, typ: str, *, owner: str | None = None, due: str | None = None, line_ids: list[str] | None = None):
        t = (text or "").strip()
        if not t:
            return
        claims.append(
            CitedClaim(
                id=str(uuid4()),
                type=typ,  # type: ignore[arg-type]
                text=t,
                owner=owner,
                due=due,
                lineIds=list(line_ids or []),
                meetingId=meeting_id,
            )
        )

    if notes.executiveSummary:
        add(notes.executiveSummary.split("\n")[0][:400], "summary")
    for d in notes.decisions or []:
        add(d.text, "decision", line_ids=d.lineIds, owner=d.owner, due=d.due)
    for o in notes.objections or []:
        add(o.text, "objection", line_ids=o.lineIds)
    for t in notes.takeaways or []:
        add(t, "takeaway")
    for a in notes.actions or []:
        add(a.text, "action", owner=a.owner, due=a.due, line_ids=a.lineIds)
    for q in notes.openQuestions or []:
        add(q, "question")
    if notes.followUpEmail:
        add(notes.followUpEmail[:500], "email")
    for c in notes.claims or []:
        claims.append(c.model_copy(update={"meetingId": meeting_id}))
    return claims


def heuristic_verify(claim: CitedClaim, turns: list[TranscriptTurn]) -> bool:
    if not claim.lineIds:
        return False
    by_id = {t.id: t for t in turns}
    cited = " ".join(by_id[i].text for i in claim.lineIds if i in by_id)
    if not cited.strip():
        return False
    return overlap_score(claim.text, cited) >= 0.22 or len(claim.text) < 40


async def llm_verify(claim: CitedClaim, turns: list[TranscriptTurn]) -> bool | None:
    by_id = {t.id: t for t in turns}
    lines = [by_id[i] for i in claim.lineIds if i in by_id]
    if not lines:
        return False
    evidence = "\n".join(f"[{t.id}] {t.text}" for t in lines)
    try:
        data = await chat_json(
            "You are a strict evidence verifier. Reply JSON {\"supported\": true|false}. "
            "supported is true only if the cited lines actually support the claim. "
            "No extra context.",
            f"CLAIM:\n{claim.text}\n\nCITED LINES:\n{evidence}",
            timeout=20.0,
        )
    except Exception as e:
        log.info("verifier LLM skipped: %s", e)
        return None
    if not data:
        return None
    return bool(data.get("supported"))


async def gate_claims(
    claims: list[CitedClaim],
    turns: list[TranscriptTurn],
    *,
    started: float,
    tokens_used: int = 0,
) -> tuple[list[CitedClaim], list[CitedClaim], list[RetryRecord], RunStatus]:
    retries: list[RetryRecord] = []
    shipped: list[CitedClaim] = []
    blocked: list[CitedClaim] = []

    attached = attach_line_ids(claims, turns)
    valid_ids = {t.id for t in turns}

    for attempt in range(1, MAX_RETRIES + 1):
        elapsed_ms = int((time.monotonic() - started) * 1000)
        if elapsed_ms > BUDGET_MS:
            for c in attached:
                if c not in shipped and c not in blocked:
                    blocked.append(c.model_copy(update={"blocked": True, "blockReason": "deadline"}))
            status = _status("deadline", shipped, blocked, retries, tokens_used, elapsed_ms)
            return shipped, blocked, retries, status
        if tokens_used > BUDGET_TOKENS:
            status = _status("failed", shipped, blocked, retries, tokens_used, elapsed_ms)
            return shipped, blocked, retries, status

        pending = [c for c in attached if c.id not in {x.id for x in shipped} and c.id not in {x.id for x in blocked}]
        if not pending:
            break

        still: list[CitedClaim] = []
        for c in pending:
            if not c.lineIds or any(i not in valid_ids for i in c.lineIds):
                still.append(c)
                continue
            ok = heuristic_verify(c, turns)
            if ok:
                llm = await llm_verify(c, turns)
                tokens_used += 400
                if llm is False:
                    still.append(c)
                    continue
                shipped.append(c.model_copy(update={"blocked": False}))
            else:
                still.append(c)

        if not still:
            break
        retries.append(RetryRecord(attempt=attempt, reason="unsupported_or_uncited", at=_now()))
        attached = attach_line_ids(still, turns, min_score=0.18)
        if attempt == MAX_RETRIES:
            for c in attached:
                blocked.append(
                    c.model_copy(update={"blocked": True, "blockReason": "no_transcript_support"})
                )

    elapsed_ms = int((time.monotonic() - started) * 1000)
    if blocked and shipped:
        exit_name = "partial"
    elif blocked and not shipped:
        exit_name = "failed"
    else:
        exit_name = "shipped"
    status = _status(exit_name, shipped, blocked, retries, tokens_used, elapsed_ms)
    return shipped, blocked, retries, status


def _status(
    exit_name: str,
    shipped: list[CitedClaim],
    blocked: list[CitedClaim],
    retries: list[RetryRecord],
    tokens: int,
    elapsed_ms: int,
) -> RunStatus:
    return RunStatus(
        exit=exit_name,  # type: ignore[arg-type]
        claimsCited=len(shipped),
        claimsBlocked=len(blocked),
        retries=retries,
        tokens=tokens,
        costUsd=round(tokens * 0.000002, 6),
        elapsedMs=elapsed_ms,
        budgetTokens=BUDGET_TOKENS,
        budgetUsd=BUDGET_USD,
        budgetMs=BUDGET_MS,
    )


def apply_gated_notes(
    notes: NotesPayload,
    shipped: list[CitedClaim],
    blocked: list[CitedClaim],
    status: RunStatus,
) -> NotesPayload:
    by_type: dict[str, list[CitedClaim]] = {}
    for c in shipped:
        by_type.setdefault(c.type, []).append(c)

    actions = [
        ActionItem(text=c.text, owner=c.owner, due=c.due, lineIds=c.lineIds, startMs=c.startMs)
        for c in by_type.get("action", [])
    ]
    if not actions:
        # keep original actions only if they gained line ids via shipped claims
        actions = [a for a in notes.actions if a.lineIds]

    summary_bits = [c.text for c in by_type.get("summary", [])]
    email_bits = [c.text for c in by_type.get("email", [])]
    return notes.model_copy(
        update={
            "executiveSummary": summary_bits[0] if summary_bits else notes.executiveSummary,
            "takeaways": [c.text for c in by_type.get("takeaway", [])] or notes.takeaways,
            "decisions": by_type.get("decision", []),
            "objections": by_type.get("objection", []),
            "actions": actions or notes.actions,
            "openQuestions": [c.text for c in by_type.get("question", [])] or notes.openQuestions,
            "followUpEmail": email_bits[0] if email_bits else notes.followUpEmail,
            "claims": shipped,
            "droppedCount": len(blocked),
            "runStatus": status,
        }
    )


_EMAIL_HINT = re.compile(r"\b(hi |hello |thanks |follow.?up|dear )\b", re.I)


def extract_structured(notes: NotesPayload, turns: list[TranscriptTurn], meeting_id: str) -> NotesPayload:
    """Promote takeaways that look like objections/decisions when Recap didn't split them."""
    objections = list(notes.objections)
    decisions = list(notes.decisions)
    for t in notes.takeaways or []:
        low = t.lower()
        if any(w in low for w in ("too expensive", "price", "budget", "concern", "worry", "object")):
            objections.append(
                CitedClaim(id=str(uuid4()), type="objection", text=t, meetingId=meeting_id)
            )
        if any(w in low for w in ("decided", "we'll go", "agreed", "going with")):
            decisions.append(
                CitedClaim(id=str(uuid4()), type="decision", text=t, meetingId=meeting_id)
            )
    email = notes.followUpEmail
    if not email:
        for t in notes.takeaways or []:
            if _EMAIL_HINT.search(t) and len(t) > 40:
                email = t
                break
    return notes.model_copy(update={"objections": objections, "decisions": decisions, "followUpEmail": email})
