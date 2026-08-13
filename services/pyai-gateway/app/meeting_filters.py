from __future__ import annotations

from app.store.models import Meeting

_TEST_TITLES = frozenset(
    {
        "voice ask",
        "setup smoke",
        "test",
        "test call",
        "new meeting",
        "recording",
        "recording…",
    }
)


def is_test_meeting(meeting: Meeting) -> bool:
    """Hide ephemeral / sample / junk meetings from the library."""
    title = (meeting.title or "").strip().lower()
    if title in _TEST_TITLES or title.startswith("voice ask"):
        return True
    if meeting.source == "sample":
        return True
    call_id = meeting.callId or ""
    if str(call_id).startswith("ask-"):
        return True
    # Empty voice-hotkey shells with no transcript
    if not meeting.transcript and title in {"quick sync", "untitled", "untitled meeting"}:
        return True
    return False
