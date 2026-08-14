from __future__ import annotations

import json
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.config import settings
from app.store.models import (
    CalendarEvent,
    Commitment,
    EnrollmentState,
    Entity,
    Meeting,
    NotesPayload,
    RunStatus,
    Session,
    TranscriptTurn,
    User,
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


_SCHEMA = """
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT,
  status TEXT,
  created_at TEXT,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  meeting_id TEXT,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS enrollment (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  kind TEXT,
  name TEXT,
  company TEXT,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS entity_mentions (
  entity_id TEXT,
  meeting_id TEXT,
  line_id TEXT,
  PRIMARY KEY (entity_id, meeting_id, line_id)
);
CREATE TABLE IF NOT EXISTS commitments (
  id TEXT PRIMARY KEY,
  entity_id TEXT,
  meeting_id TEXT,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  meeting_id TEXT,
  line_ids TEXT,
  text TEXT,
  embedding BLOB
);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  meeting_id TEXT,
  exit TEXT,
  created_at TEXT,
  payload TEXT NOT NULL
);
CREATE VIRTUAL TABLE IF NOT EXISTS meetings_fts USING fts5(
  id UNINDEXED,
  title,
  transcript,
  notes
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_secrets (
  user_id TEXT PRIMARY KEY,
  google_refresh_token TEXT
);
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  payload TEXT NOT NULL,
  UNIQUE(user_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_calendar_user_start ON calendar_events(user_id, starts_at);
"""


class SqliteStore:
    def __init__(self, path: Path | None = None) -> None:
        self._lock = threading.RLock()
        self._path = path or settings.sqlite_path
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self._path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA foreign_keys=ON")
        self._conn.executescript(_SCHEMA)
        self._conn.commit()
        self._maybe_import_json()

    def _maybe_import_json(self) -> None:
        json_path = settings.store_path
        if not json_path.exists():
            return
        cur = self._conn.execute("SELECT COUNT(*) AS c FROM meetings")
        if int(cur.fetchone()["c"]) > 0:
            return
        try:
            raw = json.loads(json_path.read_text(encoding="utf-8"))
        except Exception:
            return
        meetings = raw.get("meetings") or {}
        sessions = raw.get("sessions") or {}
        enrollment = raw.get("enrollment") or {}
        with self._lock:
            for mid, m in meetings.items():
                self._put_meeting(Meeting.model_validate(m), index=True)
            for sid, s in sessions.items():
                self._put_session(Session.model_validate(s))
            if enrollment:
                self._put_enrollment(EnrollmentState.model_validate(enrollment))
            self._conn.commit()

    def _put_meeting(self, m: Meeting, *, index: bool = True) -> None:
        payload = m.model_dump_json()
        self._conn.execute(
            "INSERT OR REPLACE INTO meetings (id, title, status, created_at, payload) VALUES (?,?,?,?,?)",
            (m.id, m.title, m.status, m.createdAt, payload),
        )
        if index:
            transcript = " ".join(t.text for t in m.transcript if t.text)
            notes_txt = ""
            if m.notes:
                notes_txt = " ".join(
                    [
                        m.notes.executiveSummary or "",
                        " ".join(m.notes.takeaways or []),
                        " ".join(a.text for a in (m.notes.actions or [])),
                        m.notes.followUpEmail or "",
                    ]
                )
            self._conn.execute("DELETE FROM meetings_fts WHERE id = ?", (m.id,))
            self._conn.execute(
                "INSERT INTO meetings_fts (id, title, transcript, notes) VALUES (?,?,?,?)",
                (m.id, m.title or "", transcript, notes_txt),
            )

    def _put_session(self, s: Session) -> None:
        self._conn.execute(
            "INSERT OR REPLACE INTO sessions (id, meeting_id, payload) VALUES (?,?,?)",
            (s.id, s.meetingId, s.model_dump_json()),
        )

    def _put_enrollment(self, e: EnrollmentState) -> None:
        self._conn.execute(
            "INSERT OR REPLACE INTO enrollment (id, payload) VALUES (1, ?)",
            (e.model_dump_json(),),
        )

    def create_session(
        self,
        *,
        title: str | None = None,
        channel_mode: str = "mono",
        check_in_end_ms: int = 5000,
        mode_id: str | None = None,
        source: str = "local",
        capture_backend: str | None = None,
        user_id: str | None = None,
        calendar_event_id: str | None = None,
        user_notes_draft: str | None = None,
    ) -> tuple[Session, Meeting]:
        with self._lock:
            sid = str(uuid4())
            mid = str(uuid4())
            created = _now()
            meeting = Meeting(
                id=mid,
                title=title or "Untitled meeting",
                status="recording",
                source="desktop" if source == "desktop" else "local",
                backend="pyai",
                createdAt=created,
                sessionId=sid,
                callId=mid,
                checkInEndMs=check_in_end_ms,
                modeId=mode_id,
                captureBackend=capture_backend,
                calendarEventId=calendar_event_id,
                userNotesDraft=user_notes_draft,
            )
            session = Session(
                id=sid,
                meetingId=mid,
                createdAt=created,
                channelMode=(
                    "stereo"
                    if channel_mode == "stereo"
                    else "mix"
                    if channel_mode == "mix"
                    else "mono"
                ),
                checkInEndMs=check_in_end_ms,
                modeId=mode_id,
            )
            self._put_meeting(meeting)
            self._put_session(session)
            if calendar_event_id:
                self._link_calendar_meeting(calendar_event_id, mid)
            self._conn.commit()
            return session, meeting

    def get_session(self, session_id: str) -> Session | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT payload FROM sessions WHERE id = ?", (session_id,)
            ).fetchone()
            return Session.model_validate_json(row["payload"]) if row else None

    def get_meeting(self, meeting_id: str) -> Meeting | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT payload FROM meetings WHERE id = ?", (meeting_id,)
            ).fetchone()
            return Meeting.model_validate_json(row["payload"]) if row else None

    def list_meetings(self) -> list[Meeting]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT payload FROM meetings ORDER BY created_at DESC"
            ).fetchall()
            return [Meeting.model_validate_json(r["payload"]) for r in rows]

    def search_meetings(self, query: str, limit: int = 50) -> list[Meeting]:
        q = (query or "").strip()
        if not q:
            return self.list_meetings()[:limit]
        safe = " ".join(tok for tok in q.replace('"', " ").split() if tok)
        with self._lock:
            try:
                rows = self._conn.execute(
                    """
                    SELECT m.payload FROM meetings_fts f
                    JOIN meetings m ON m.id = f.id
                    WHERE meetings_fts MATCH ?
                    ORDER BY rank
                    LIMIT ?
                    """,
                    (safe, limit),
                ).fetchall()
            except sqlite3.OperationalError:
                rows = []
            if rows:
                return [Meeting.model_validate_json(r["payload"]) for r in rows]
            like = f"%{q.lower()}%"
            rows = self._conn.execute(
                "SELECT payload FROM meetings WHERE lower(title) LIKE ? ORDER BY created_at DESC LIMIT ?",
                (like, limit),
            ).fetchall()
            return [Meeting.model_validate_json(r["payload"]) for r in rows]

    def update_meeting(self, meeting_id: str, **fields: Any) -> Meeting | None:
        with self._lock:
            m = self.get_meeting(meeting_id)
            if not m:
                return None
            data = m.model_dump()
            data.update(fields)
            updated = Meeting.model_validate(data)
            self._put_meeting(updated)
            self._conn.commit()
            return updated

    def update_session(self, session_id: str, **fields: Any) -> Session | None:
        with self._lock:
            s = self.get_session(session_id)
            if not s:
                return None
            data = s.model_dump()
            data.update(fields)
            updated = Session.model_validate(data)
            self._put_session(updated)
            self._conn.commit()
            return updated

    def append_live_final(
        self,
        session_id: str,
        *,
        text: str,
        start_ms: int,
        end_ms: int,
    ) -> None:
        with self._lock:
            s = self.get_session(session_id)
            if not s:
                return
            entry = {
                "text": text,
                "startMs": start_ms,
                "endMs": end_ms,
                "at": _now(),
            }
            s.liveTranscript.append(entry)
            self._put_session(s)
            m = self.get_meeting(s.meetingId)
            if m:
                turn = TranscriptTurn(
                    id=str(uuid4()),
                    speaker="Speaking…",
                    kind="guest",
                    text=text,
                    startMs=start_ms,
                    endMs=end_ms,
                )
                m.transcript.append(turn)
                m.snippet = text[:160]
                self._put_meeting(m)
            self._conn.commit()

    def delete_meeting(self, meeting_id: str) -> bool:
        with self._lock:
            row = self._conn.execute(
                "SELECT 1 FROM meetings WHERE id = ?", (meeting_id,)
            ).fetchone()
            if not row:
                return False
            self._conn.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
            self._conn.execute("DELETE FROM meetings_fts WHERE id = ?", (meeting_id,))
            self._conn.execute("DELETE FROM sessions WHERE meeting_id = ?", (meeting_id,))
            self._conn.execute("DELETE FROM chunks WHERE meeting_id = ?", (meeting_id,))
            self._conn.execute("DELETE FROM runs WHERE meeting_id = ?", (meeting_id,))
            self._conn.execute("DELETE FROM entity_mentions WHERE meeting_id = ?", (meeting_id,))
            self._conn.execute("DELETE FROM commitments WHERE meeting_id = ?", (meeting_id,))
            self._conn.commit()
            return True

    def get_enrollment(self) -> EnrollmentState:
        with self._lock:
            row = self._conn.execute("SELECT payload FROM enrollment WHERE id = 1").fetchone()
            if not row:
                return EnrollmentState()
            return EnrollmentState.model_validate_json(row["payload"])

    def set_enrollment(self, **fields: Any) -> EnrollmentState:
        with self._lock:
            data = self.get_enrollment().model_dump()
            data.update(fields)
            data["updatedAt"] = _now()
            e = EnrollmentState.model_validate(data)
            self._put_enrollment(e)
            self._conn.commit()
            return e

    def clear_enrollment(self) -> None:
        with self._lock:
            self._put_enrollment(EnrollmentState())
            self._conn.commit()

    def put_meeting(self, meeting: Meeting) -> Meeting:
        with self._lock:
            self._put_meeting(meeting)
            self._conn.commit()
            return meeting

    def upsert_entity(self, entity: Entity) -> Entity:
        with self._lock:
            self._conn.execute(
                "INSERT OR REPLACE INTO entities (id, kind, name, company, payload) VALUES (?,?,?,?,?)",
                (entity.id, entity.kind, entity.name, entity.company, entity.model_dump_json()),
            )
            self._conn.commit()
            return entity

    def get_entity(self, entity_id: str) -> Entity | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT payload FROM entities WHERE id = ?", (entity_id,)
            ).fetchone()
            return Entity.model_validate_json(row["payload"]) if row else None

    def list_entities(self) -> list[Entity]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT payload FROM entities ORDER BY name COLLATE NOCASE"
            ).fetchall()
            return [Entity.model_validate_json(r["payload"]) for r in rows]

    def delete_entity(self, entity_id: str) -> bool:
        with self._lock:
            row = self._conn.execute(
                "SELECT 1 FROM entities WHERE id = ?", (entity_id,)
            ).fetchone()
            if not row:
                return False
            self._conn.execute(
                "DELETE FROM entity_mentions WHERE entity_id = ?", (entity_id,)
            )
            self._conn.execute(
                "DELETE FROM commitments WHERE entity_id = ?", (entity_id,)
            )
            self._conn.execute("DELETE FROM entities WHERE id = ?", (entity_id,))
            self._conn.commit()
            return True

    def find_entity(self, *, name: str, company: str | None = None) -> Entity | None:
        name_l = name.strip().lower()
        company_l = (company or "").strip().lower() or None
        name_only: Entity | None = None
        with self._lock:
            rows = self._conn.execute("SELECT payload FROM entities").fetchall()
            for r in rows:
                e = Entity.model_validate_json(r["payload"])
                if e.name.strip().lower() != name_l:
                    continue
                existing_co = (e.company or "").strip().lower() or None
                if company_l and existing_co == company_l:
                    return e
                if not existing_co:
                    name_only = e
                elif not company_l:
                    return e
            return name_only

    def find_entity_by_email(self, email: str) -> Entity | None:
        needle = email.strip().lower()
        if not needle:
            return None
        with self._lock:
            for e in self.list_entities():
                payload_extra = getattr(e, "email", None)
                if payload_extra and str(payload_extra).lower() == needle:
                    return e
                if "@" in needle:
                    local = needle.split("@")[0]
                    if e.name.strip().lower() == local:
                        return e
        return None

    def create_guest_user(self, name: str) -> User:
        user = User(
            id=str(uuid4()),
            name=name.strip() or "Guest",
            provider="guest",
            createdAt=_now(),
            calendarConnected=False,
        )
        return self.put_user(user)

    def put_user(self, user: User) -> User:
        with self._lock:
            self._conn.execute(
                "INSERT OR REPLACE INTO users (id, payload) VALUES (?,?)",
                (user.id, user.model_dump_json()),
            )
            self._conn.commit()
            return user

    def get_user(self, user_id: str) -> User | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT payload FROM users WHERE id = ?", (user_id,)
            ).fetchone()
            return User.model_validate_json(row["payload"]) if row else None

    def get_user_by_email(self, email: str) -> User | None:
        needle = email.strip().lower()
        with self._lock:
            rows = self._conn.execute("SELECT payload FROM users").fetchall()
            for r in rows:
                u = User.model_validate_json(r["payload"])
                if (u.email or "").lower() == needle:
                    return u
        return None

    def set_google_refresh_token(self, user_id: str, token: str | None) -> None:
        with self._lock:
            if not token:
                self._conn.execute(
                    "DELETE FROM user_secrets WHERE user_id = ?", (user_id,)
                )
            else:
                self._conn.execute(
                    "INSERT OR REPLACE INTO user_secrets (user_id, google_refresh_token) VALUES (?,?)",
                    (user_id, token),
                )
            self._conn.commit()

    def get_google_refresh_token(self, user_id: str) -> str | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT google_refresh_token FROM user_secrets WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            return row["google_refresh_token"] if row else None

    def _put_calendar_event(self, ev: CalendarEvent) -> None:
        self._conn.execute(
            "INSERT OR REPLACE INTO calendar_events (id, user_id, external_id, starts_at, payload) VALUES (?,?,?,?,?)",
            (ev.id, ev.userId, ev.externalId, ev.startAt, ev.model_dump_json()),
        )

    def _link_calendar_meeting(self, event_id: str, meeting_id: str) -> None:
        ev = self.get_calendar_event(event_id)
        if not ev:
            return
        updated = ev.model_copy(update={"linkedMeetingId": meeting_id})
        self._put_calendar_event(updated)

    def upsert_calendar_events(self, user_id: str, events: list[CalendarEvent]) -> list[CalendarEvent]:
        with self._lock:
            out: list[CalendarEvent] = []
            for ev in events:
                row = self._conn.execute(
                    "SELECT payload FROM calendar_events WHERE user_id = ? AND external_id = ?",
                    (user_id, ev.externalId),
                ).fetchone()
                if row:
                    existing = CalendarEvent.model_validate_json(row["payload"])
                    ev = ev.model_copy(
                        update={
                            "id": existing.id,
                            "entityIds": existing.entityIds or ev.entityIds,
                            "linkedMeetingId": existing.linkedMeetingId,
                            "reminderFiredAt": existing.reminderFiredAt,
                            "startPromptFiredAt": existing.startPromptFiredAt,
                            "manualNotes": existing.manualNotes,
                        }
                    )
                self._put_calendar_event(ev)
                out.append(ev)
            self._conn.commit()
            return out

    def list_calendar_events(
        self, user_id: str, *, from_iso: str | None = None, to_iso: str | None = None
    ) -> list[CalendarEvent]:
        with self._lock:
            sql = "SELECT payload FROM calendar_events WHERE user_id = ?"
            args: list[Any] = [user_id]
            if from_iso:
                sql += " AND starts_at >= ?"
                args.append(from_iso)
            if to_iso:
                sql += " AND starts_at <= ?"
                args.append(to_iso)
            sql += " ORDER BY starts_at ASC"
            rows = self._conn.execute(sql, args).fetchall()
            return [CalendarEvent.model_validate_json(r["payload"]) for r in rows]

    def get_calendar_event(self, event_id: str) -> CalendarEvent | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT payload FROM calendar_events WHERE id = ?", (event_id,)
            ).fetchone()
            return CalendarEvent.model_validate_json(row["payload"]) if row else None

    def update_calendar_event(self, event_id: str, **fields: Any) -> CalendarEvent | None:
        with self._lock:
            ev = self.get_calendar_event(event_id)
            if not ev:
                return None
            data = ev.model_dump()
            data.update(fields)
            updated = CalendarEvent.model_validate(data)
            self._put_calendar_event(updated)
            self._conn.commit()
            return updated

    def add_mention(self, entity_id: str, meeting_id: str, line_id: str) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT OR IGNORE INTO entity_mentions (entity_id, meeting_id, line_id) VALUES (?,?,?)",
                (entity_id, meeting_id, line_id),
            )
            self._conn.commit()

    def entity_meeting_ids(self, entity_id: str) -> list[str]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT DISTINCT meeting_id FROM entity_mentions WHERE entity_id = ?",
                (entity_id,),
            ).fetchall()
            return [r["meeting_id"] for r in rows]

    def upsert_commitment(self, c: Commitment) -> Commitment:
        with self._lock:
            self._conn.execute(
                "INSERT OR REPLACE INTO commitments (id, entity_id, meeting_id, payload) VALUES (?,?,?,?)",
                (c.id, c.entityId, c.meetingId, c.model_dump_json()),
            )
            self._conn.commit()
            return c

    def list_commitments(
        self, *, entity_id: str | None = None, status: str | None = "open"
    ) -> list[Commitment]:
        with self._lock:
            sql = "SELECT payload FROM commitments"
            args: list[Any] = []
            if entity_id:
                sql += " WHERE entity_id = ?"
                args.append(entity_id)
            rows = self._conn.execute(sql, args).fetchall()
            out = [Commitment.model_validate_json(r["payload"]) for r in rows]
            if status:
                out = [c for c in out if c.status == status]
            return out

    def replace_chunks(
        self, meeting_id: str, chunks: list[tuple[str, list[str], str, bytes]]
    ) -> None:
        with self._lock:
            self._conn.execute("DELETE FROM chunks WHERE meeting_id = ?", (meeting_id,))
            for cid, line_ids, text, blob in chunks:
                self._conn.execute(
                    "INSERT INTO chunks (id, meeting_id, line_ids, text, embedding) VALUES (?,?,?,?,?)",
                    (cid, meeting_id, json.dumps(line_ids), text, blob),
                )
            self._conn.commit()

    def all_chunks(self) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT id, meeting_id, line_ids, text, embedding FROM chunks"
            ).fetchall()
            out = []
            for r in rows:
                out.append(
                    {
                        "id": r["id"],
                        "meetingId": r["meeting_id"],
                        "lineIds": json.loads(r["line_ids"] or "[]"),
                        "text": r["text"] or "",
                        "embedding": r["embedding"] or b"",
                    }
                )
            return out

    def save_run(self, meeting_id: str, status: RunStatus) -> None:
        with self._lock:
            rid = str(uuid4())
            self._conn.execute(
                "INSERT INTO runs (id, meeting_id, exit, created_at, payload) VALUES (?,?,?,?,?)",
                (rid, meeting_id, status.exit, _now(), status.model_dump_json()),
            )
            self._conn.commit()

    def list_runs(self, limit: int = 40) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT id, meeting_id, exit, created_at, payload FROM runs ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
            out = []
            for r in rows:
                payload = json.loads(r["payload"])
                payload["id"] = r["id"]
                payload["meetingId"] = r["meeting_id"]
                payload["createdAt"] = r["created_at"]
                out.append(payload)
            return out

    def db_path(self) -> str:
        return str(self._path)


store = SqliteStore()
