from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

from app.config import settings
from app.store.models import Meeting, NotesPayload, TranscriptTurn


def _slug(title: str) -> str:
    s = re.sub(r"[^\w\s-]", "", title or "meeting").strip().lower()
    s = re.sub(r"[-\s]+", "-", s)
    return (s[:60] or "meeting").strip("-")


def write_margin_folder(
    meeting: Meeting,
    *,
    user_notes: str | None = None,
) -> Path:
    """Write ~/Margin/YYYY-MM-DD-title/{transcript,notes,summary,run}.md"""
    day = datetime.now().strftime("%Y-%m-%d")
    folder = settings.margin_dir / f"{day}-{_slug(meeting.title)}"
    folder.mkdir(parents=True, exist_ok=True)

    (folder / "transcript.md").write_text(
        _transcript_md(meeting.transcript),
        encoding="utf-8",
    )
    notes_body = user_notes or meeting.userNotesDraft or ""
    (folder / "notes.md").write_text(
        notes_body.strip() + ("\n" if notes_body.strip() else ""),
        encoding="utf-8",
    )
    (folder / "summary.md").write_text(
        _summary_md(meeting.notes),
        encoding="utf-8",
    )
    run = {
        "meetingId": meeting.id,
        "callId": meeting.callId,
        "title": meeting.title,
        "status": meeting.status,
        "createdAt": meeting.createdAt,
        "source": meeting.source,
        "backend": "pyai",
        "modeId": meeting.modeId,
        "runStatus": meeting.notes.runStatus.model_dump() if meeting.notes and meeting.notes.runStatus else None,
        "droppedCount": meeting.notes.droppedCount if meeting.notes else 0,
    }
    (folder / "run.json").write_text(json.dumps(run, indent=2), encoding="utf-8")
    return folder


def _transcript_md(turns: list[TranscriptTurn]) -> str:
    if not turns:
        return "# Transcript\n\n_(empty)_\n"
    lines = ["# Transcript", ""]
    for t in turns:
        label = t.speaker or ("You" if t.kind == "you" else "Other")
        lines.append(f"**{label}**: {t.text}")
        lines.append("")
    return "\n".join(lines)


def _summary_md(notes: NotesPayload | None) -> str:
    if not notes:
        return "# Summary\n\n_(pending)_\n"
    lines = ["# Summary", ""]
    if notes.title:
        lines.append(f"**{notes.title}**")
        lines.append("")
    if notes.executiveSummary:
        lines.append(notes.executiveSummary)
        lines.append("")
    if notes.takeaways:
        lines.append("## Takeaways")
        for t in notes.takeaways:
            lines.append(f"- {t}")
        lines.append("")
    if notes.actions:
        lines.append("## Action items")
        for a in notes.actions:
            owner = f" (@{a.owner})" if a.owner else ""
            due = f" due {a.due}" if a.due else ""
            chip = f" [{a.startMs}ms]" if a.startMs is not None else ""
            lines.append(f"- {a.text}{owner}{due}{chip}")
        lines.append("")
    if notes.decisions:
        lines.append("## Decisions")
        for d in notes.decisions:
            chip = f" [{d.startMs}ms]" if d.startMs is not None else ""
            lines.append(f"- {d.text}{chip}")
        lines.append("")
    if notes.objections:
        lines.append("## Objections")
        for o in notes.objections:
            chip = f" [{o.startMs}ms]" if o.startMs is not None else ""
            lines.append(f"- {o.text}{chip}")
        lines.append("")
    if notes.followUpEmail:
        lines.append("## Follow-up email")
        lines.append(notes.followUpEmail)
        lines.append("")
    if notes.droppedCount:
        lines.append(f"_{notes.droppedCount} claims dropped (no transcript support)._")
        lines.append("")
    if notes.openQuestions:
        lines.append("## Open questions")
        for q in notes.openQuestions:
            lines.append(f"- {q}")
        lines.append("")
    return "\n".join(lines)
