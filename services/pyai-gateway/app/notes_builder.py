from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Iterable

from app.store.models import ActionItem, NotesPayload, TranscriptTurn

_ACTION_HINT = re.compile(
    r"\b("
    r"todo|action|follow[- ]?up|need to|needs to|needed to|should|must|"
    r"will send|will share|will update|will call|will schedule|"
    r"i'?ll|we'?ll|let'?s|please|remind|schedule|assign|owner|due|"
    r"next step|action item|send|share|update|prepare|draft|review|"
    r"reach out|circle back|ping|follow through|deliver|ship"
    r")\b",
    re.I,
)
_COMMITMENT = re.compile(
    r"\b(i|we|i'?ll|we'?ll|let'?s|going to|gonna|need to|should|must|"
    r"have to|will|can you|could you|please)\b.{0,80}\b("
    r"send|share|update|schedule|call|email|write|prepare|review|"
    r"fix|ship|deliver|follow|check|confirm|assign|draft|meet"
    r")\b",
    re.I,
)
_QUESTION_HINT = re.compile(r"\?{1,}|\b(open question|unclear|tbd|blocker|how do we|what about)\b", re.I)
_PLACEHOLDER_TITLE = re.compile(
    r"^(recording…?|recording\.\.\.|untitled( meeting)?|meeting notes|new meeting|setup smoke|test|capture · .+)$",
    re.I,
)
_FILLER_START = re.compile(
    r"^(um+|uh+|yeah|yes|ok(ay)?|so|well|like|hey|hi|hello|hmm+)\b[\s,.-]*",
    re.I,
)
_WORD = re.compile(r"[A-Za-z][A-Za-z0-9'/-]*")
_BULLET = re.compile(r"^[-*•]\s*(\[[ xX]\])?\s*")
_STOPWORDS = frozenset(
    """
    a an the and or but if in on at to for of is are was were be been being
    have has had do does did will would could should may might must can
    this that these those i we you they he she it my our your their
    with from about into over after before just also very really so then
    than too there here what when where which who how not no yes ok okay
    um uh hey hi hello yeah yep well got get getting going go went
    discussion covered turns meeting meetings notes note call calls today
    tomorrow week next last some any something anything everything stuff
    kind sort thing things one two three need needs needed want wants
    like let's let make made making talk talking spoke speak speaking
    said say saying think thinking know knew knowing look looking
    check checking checked right actually basically maybe perhaps
    your live folded these outcomes during
    """.split()
)


def is_placeholder_title(title: str | None) -> bool:
    if not title or not str(title).strip():
        return True
    return bool(_PLACEHOLDER_TITLE.match(str(title).strip()))


def suggest_meeting_title(
    turns: list[TranscriptTurn] | list,
    *,
    preferred: str | None = None,
    user_notes: str | None = None,
    takeaways: list[str] | None = None,
    summary: str | None = None,
    created_at: str | None = None,
) -> str:
    """
    2–3 word topic title from summary / notes / transcript.
    Ignores placeholders like "Recording…".
    """
    sources: list[str] = []

    if preferred and not is_placeholder_title(preferred):
        short = _topic_phrase(preferred)
        if short:
            return short
        sources.append(preferred)

    if summary and summary.strip():
        sources.append(summary.strip())

    user = (user_notes or "").strip()
    for line in _user_lines(user):
        if _ACTION_HINT.search(line) or _QUESTION_HINT.search(line):
            continue
        if len(line) >= 6:
            sources.append(line)

    for t in takeaways or []:
        if t and t.strip():
            sources.append(t.strip())

    texts: list[str] = []
    for turn in turns:
        text = getattr(turn, "text", None)
        if text is None and isinstance(turn, dict):
            text = turn.get("text")
        if text and str(text).strip():
            texts.append(str(text).strip())

    ranked = sorted(texts, key=lambda t: (min(len(t), 120), len(t)), reverse=True)
    sources.extend(ranked[:6])
    if texts:
        sources.append(texts[0])

    for src in sources:
        phrase = _topic_phrase(src)
        if phrase:
            return phrase

    return _dated_fallback(created_at)


def _topic_phrase(text: str, max_words: int = 3) -> str | None:
    """Reduce prose to a Title-Case 2–3 word topic."""
    raw = (text or "").strip()
    if not raw:
        return None
    part = re.split(r"(?<=[.!?])\s+|;\s+| — |\n+", raw, maxsplit=1)[0].strip()
    part = _FILLER_START.sub("", part).strip()
    words = [w for w in _WORD.findall(part) if w.lower() not in _STOPWORDS and len(w) > 2]
    if not words:
        return None
    picked = words[:max_words]
    if len(picked) == 1 and len(words) >= 2:
        picked = words[:2]
    if len(picked) < 1:
        return None
    return " ".join(_title_case_word(w) for w in picked[:max_words])


def _title_case_word(word: str) -> str:
    if not word:
        return word
    if word.isupper() and len(word) <= 4:
        return word
    return word[0].upper() + word[1:].lower()


def _dated_fallback(created_at: str | None = None) -> str:
    try:
        if created_at:
            dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        else:
            dt = datetime.now(timezone.utc)
        return f"{dt.strftime('%b')} Sync"
    except Exception:
        return "Quick Sync"


def build_notes_from_transcript(
    turns: list[TranscriptTurn],
    *,
    title: str | None = None,
    user_notes: str | None = None,
    created_at: str | None = None,
) -> NotesPayload:
    """
    Local intelligence when PyAI Recap is unavailable.
    Incorporates typed Margin notes into summary, actions, and questions.
    """
    texts = [t.text.strip() for t in turns if t.text and t.text.strip()]
    user = (user_notes or "").strip()

    summary = _executive_summary(texts, user)
    takeaways = _takeaways(texts, user)
    actions = _actions(texts, user)
    questions = _questions(texts, user)

    headline = suggest_meeting_title(
        turns,
        preferred=title,
        user_notes=user,
        takeaways=takeaways,
        summary=summary,
        created_at=created_at,
    )

    return NotesPayload(
        title=headline,
        executiveSummary=summary,
        takeaways=takeaways[:8],
        actions=actions[:12],
        openQuestions=questions[:8],
        risks=[],
    )


def merge_recap_with_user_notes(
    notes: NotesPayload,
    user_notes: str | None,
    *,
    transcript_texts: list[str] | None = None,
) -> NotesPayload:
    """Ensure Recap output still reflects typed notes and fills sparse actions."""
    user = (user_notes or "").strip()
    texts = list(transcript_texts or [])
    extra_actions = _actions(texts, user)
    extra_q = _questions(texts, user)
    takeaways = list(notes.takeaways or [])
    if user and user.splitlines():
        hint = f"From your notes: {user.splitlines()[0].strip()}"
        if hint not in takeaways:
            takeaways = [hint, *takeaways][:8]
    summary = (notes.executiveSummary or "").strip()
    if user:
        block = f"Your notes during the call:\n{user}"
        if block not in summary:
            summary = f"{summary}\n\n{block}".strip() if summary else block
    if not summary and texts:
        summary = _executive_summary(texts, user)

    actions = list(notes.actions or [])
    seen = {a.text.lower() for a in actions}
    for a in extra_actions:
        if a.text.lower() not in seen:
            actions.append(a)
            seen.add(a.text.lower())

    # If Recap returned no actions, synthesize from transcript commitments
    if not actions and texts:
        for a in _actions(texts, ""):
            if a.text.lower() not in seen:
                actions.append(a)
                seen.add(a.text.lower())

    questions = list(notes.openQuestions or [])
    for q in extra_q:
        if q not in questions:
            questions.append(q)

    title = notes.title
    if is_placeholder_title(title) or (title and len(title.split()) > 3):
        title = suggest_meeting_title(
            [],
            preferred=None if is_placeholder_title(title) else title,
            user_notes=user,
            takeaways=takeaways,
            summary=summary,
        )
    return NotesPayload(
        title=title,
        executiveSummary=summary,
        takeaways=takeaways,
        actions=actions[:12],
        openQuestions=questions[:8],
        risks=list(notes.risks or []),
    )


def _executive_summary(texts: list[str], user: str) -> str:
    if not texts and not user:
        return "No speech was captured for this meeting."

    parts: list[str] = []
    if texts:
        joined = " ".join(texts)
        chunks = re.split(r"(?<=[.!?])\s+", joined)
        chunks = [c.strip() for c in chunks if len(c.strip()) > 12]
        if chunks:
            # Lead with outcomes-oriented brief
            body = " ".join(chunks[:5])
            parts.append(
                f"Discussion overview: {body[:1100]}".strip()
            )
        else:
            parts.append(f"Discussion overview: {joined[:900]}")
        if len(texts) >= 2:
            parts.append(
                f"The conversation spanned {len(texts)} spoken turns"
                + (f" and included live notes from the notetaker." if user else ".")
            )
    if user:
        note_lines = _user_lines(user)
        if note_lines:
            bullets = "\n".join(
                f"• {_BULLET.sub('', line).strip()}" for line in note_lines[:10]
            )
            parts.append(f"Notetaker highlights:\n{bullets}")
        else:
            parts.append(f"Notetaker highlights:\n{user}")
    return "\n\n".join(parts)


def _takeaways(texts: list[str], user: str) -> list[str]:
    out: list[str] = []
    for line in _user_lines(user):
        if _QUESTION_HINT.search(line):
            continue
        # Skip pure action lines — they belong in actions
        if _BULLET.match(line) and _ACTION_HINT.search(line):
            continue
        if len(line) >= 8:
            out.append(_BULLET.sub("", line).strip())
    ranked = sorted(texts, key=len, reverse=True)
    for t in ranked:
        if len(t) < 28:
            continue
        clean = t if len(t) <= 160 else t[:157] + "…"
        if clean not in out:
            out.append(clean)
        if len(out) >= 6:
            break
    if not out and texts:
        out.append(texts[0][:160])
    return out


def _actions(texts: Iterable[str], user: str) -> list[ActionItem]:
    items: list[ActionItem] = []

    for line in _user_lines(user):
        cleaned = _BULLET.sub("", line).strip()
        if not cleaned:
            continue
        # Treat checklist / imperative / hint lines from notes as actions
        looks_action = (
            _ACTION_HINT.search(cleaned)
            or _COMMITMENT.search(cleaned)
            or line.lower().startswith(("- [ ]", "* [ ]", "todo", "action"))
            or (
                len(cleaned) >= 8
                and not _QUESTION_HINT.search(cleaned)
                and cleaned[0].isupper()
            )
        )
        if looks_action:
            owner = _guess_owner(cleaned)
            pri = "high" if re.search(r"\b(asap|urgent|today|eod)\b", cleaned, re.I) else "med"
            items.append(ActionItem(text=cleaned, owner=owner, priority=pri))

    for t in texts:
        raw = t.strip()
        if len(raw) < 12 or len(raw) > 240:
            continue
        if _ACTION_HINT.search(raw) or _COMMITMENT.search(raw):
            owner = _guess_owner(raw)
            items.append(ActionItem(text=raw, owner=owner, priority="med"))

    seen: set[str] = set()
    uniq: list[ActionItem] = []
    for a in items:
        key = a.text.lower()
        if key in seen:
            continue
        seen.add(key)
        uniq.append(a)
    return uniq


def _guess_owner(text: str) -> str | None:
    m = re.search(
        r"\b(?:owner|assignee|for|@)\s*[:\-]?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b",
        text,
    )
    if m:
        return m.group(1)
    if re.search(r"\b(i'?ll|i will|my action|i can)\b", text, re.I):
        return "You"
    if re.search(r"\b(we'?ll|we will|let'?s)\b", text, re.I):
        return "Team"
    return None


def _questions(texts: Iterable[str], user: str) -> list[str]:
    out: list[str] = []
    for line in list(_user_lines(user)) + list(texts):
        if _QUESTION_HINT.search(line) and len(line) >= 6:
            out.append(_BULLET.sub("", line).strip())
    seen: set[str] = set()
    uniq: list[str] = []
    for q in out:
        k = q.lower()
        if k in seen:
            continue
        seen.add(k)
        uniq.append(q)
    return uniq


def _user_lines(user: str) -> list[str]:
    if not user:
        return []
    lines = []
    for raw in user.splitlines():
        line = raw.strip()
        if line:
            lines.append(line)
    if len(lines) == 1 and ";" in lines[0]:
        lines = [p.strip() for p in lines[0].split(";") if p.strip()]
    return lines
