from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


MeetingStatus = Literal[
    "recording",
    "processing",
    "ready",
    "failed",
    "bot_joining",
    "bot_live",
]

RunExit = Literal["shipped", "partial", "failed", "deadline"]
ClaimType = Literal[
    "decision",
    "objection",
    "action",
    "summary",
    "takeaway",
    "question",
    "email",
]
EntityKind = Literal["person", "company"]


class TranscriptTurn(BaseModel):
    id: str
    speaker: str
    kind: Literal["you", "other", "guest"] = "other"
    text: str
    startMs: int = 0
    endMs: int = 0


class ActionItem(BaseModel):
    text: str
    owner: str | None = None
    priority: Literal["high", "med", "low"] | None = None
    due: str | None = None
    lineIds: list[str] = Field(default_factory=list)
    startMs: int | None = None


class CitedClaim(BaseModel):
    id: str
    type: ClaimType = "takeaway"
    text: str
    owner: str | None = None
    due: str | None = None
    lineIds: list[str] = Field(default_factory=list)
    startMs: int | None = None
    meetingId: str | None = None
    blocked: bool = False
    blockReason: str | None = None


class RetryRecord(BaseModel):
    attempt: int
    reason: str
    at: str


class RunStatus(BaseModel):
    exit: RunExit = "shipped"
    claimsCited: int = 0
    claimsBlocked: int = 0
    retries: list[RetryRecord] = Field(default_factory=list)
    tokens: int = 0
    costUsd: float = 0.0
    elapsedMs: int = 0
    budgetTokens: int = 80_000
    budgetUsd: float = 1.0
    budgetMs: int = 120_000
    modeId: str | None = None


class NotesPayload(BaseModel):
    title: str | None = None
    executiveSummary: str | None = None
    takeaways: list[str] = Field(default_factory=list)
    actions: list[ActionItem] = Field(default_factory=list)
    openQuestions: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    decisions: list[CitedClaim] = Field(default_factory=list)
    objections: list[CitedClaim] = Field(default_factory=list)
    followUpEmail: str | None = None
    claims: list[CitedClaim] = Field(default_factory=list)
    droppedCount: int = 0
    runStatus: RunStatus | None = None


class Meeting(BaseModel):
    id: str
    title: str
    status: MeetingStatus = "recording"
    source: Literal["local", "bot", "desktop", "sample"] = "local"
    backend: Literal["nest", "pyai"] = "pyai"
    createdAt: str
    durationSec: int | None = None
    snippet: str | None = None
    transcript: list[TranscriptTurn] = Field(default_factory=list)
    notes: NotesPayload | None = None
    audioPath: str | None = None
    meetingUrl: str | None = None
    botProvider: str | None = None
    botMessage: str | None = None
    platform: str | None = None
    botId: str | None = None
    sessionId: str | None = None
    callId: str | None = None
    checkInEndMs: int | None = None
    speakerBinding: dict[str, str] = Field(default_factory=dict)
    userNotesDraft: str | None = None
    error: str | None = None
    marginPath: str | None = None
    modeId: str | None = None
    consentAt: str | None = None
    captureBackend: str | None = None
    entityIds: list[str] = Field(default_factory=list)
    calendarEventId: str | None = None


class User(BaseModel):
    id: str
    email: str | None = None
    name: str
    provider: Literal["google", "microsoft", "guest"] = "guest"
    picture: str | None = None
    createdAt: str
    calendarConnected: bool = False


class CalendarAttendee(BaseModel):
    email: str | None = None
    name: str | None = None
    responseStatus: str | None = None


class CalendarEvent(BaseModel):
    id: str
    userId: str
    externalId: str
    title: str
    description: str | None = None
    startAt: str
    endAt: str
    meetUrl: str | None = None
    htmlLink: str | None = None
    attendees: list[CalendarAttendee] = Field(default_factory=list)
    entityIds: list[str] = Field(default_factory=list)
    linkedMeetingId: str | None = None
    reminderFiredAt: str | None = None
    startPromptFiredAt: str | None = None
    manualNotes: str | None = None
    syncedAt: str


class Session(BaseModel):
    id: str
    meetingId: str
    createdAt: str
    status: Literal["open", "finalizing", "closed"] = "open"
    chunkCount: int = 0
    audioPaths: list[str] = Field(default_factory=list)
    liveTranscript: list[dict[str, Any]] = Field(default_factory=list)
    channelMode: Literal["mono", "stereo", "mix"] = "mono"
    checkInEndMs: int = 5000
    modeId: str | None = None
    copilotCalls: int = 0


class EnrollmentState(BaseModel):
    enrolled: bool = False
    samples: int = 0
    updatedAt: str | None = None
    hasVoiceprint: bool = False
    samplePath: str | None = None
    displayName: str | None = None
    consentAccepted: bool = False
    consentAt: str | None = None


class Entity(BaseModel):
    id: str
    kind: EntityKind
    name: str
    company: str | None = None
    createdAt: str
    updatedAt: str
    meetingIds: list[str] = Field(default_factory=list)
    topics: list[str] = Field(default_factory=list)
    openItemCount: int = 0


class Commitment(BaseModel):
    id: str
    entityId: str
    meetingId: str
    direction: Literal["us", "them"] = "us"
    text: str
    due: str | None = None
    status: Literal["open", "done"] = "open"
    lineId: str | None = None
    createdAt: str


class StoreData(BaseModel):
    meetings: dict[str, Meeting] = Field(default_factory=dict)
    sessions: dict[str, Session] = Field(default_factory=dict)
    enrollment: EnrollmentState = Field(default_factory=EnrollmentState)
