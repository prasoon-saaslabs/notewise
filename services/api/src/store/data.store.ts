import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export type MeetingStatus =
  | 'recording'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'bot_joining'
  | 'bot_live';

export type MeetingSource = 'local' | 'bot' | 'desktop';

/** Which API stack produced this meeting (Nest vs parallel PyAI gateway). */
export type MeetingBackend = 'nest' | 'pyai';

export type TranscriptTurn = {
  id: string;
  speaker: string;
  kind: 'you' | 'other' | 'guest';
  text: string;
  startMs: number;
  endMs: number;
};

export type NotesPayload = {
  title?: string;
  executiveSummary?: string;
  takeaways?: string[];
  actions?: Array<{ text: string; owner?: string; priority?: 'high' | 'med' | 'low' }>;
  openQuestions?: string[];
  risks?: string[];
};

export type MeetingRecord = {
  id: string;
  title: string;
  status: MeetingStatus;
  source: MeetingSource;
  /** Always 'nest' for this service; older records may omit → treated as nest. */
  backend?: MeetingBackend;
  createdAt: string;
  durationSec?: number;
  snippet?: string;
  transcript: TranscriptTurn[];
  notes: NotesPayload | null;
  audioUrl?: string | null;
  audioPath?: string | null;
  botId?: string;
  sessionId?: string;
  meetingUrl?: string;
  botProvider?: 'meetingbaas' | 'recall' | 'simulation';
  botMessage?: string;
  platform?: 'google_meet' | 'zoom' | 'teams' | 'unknown';
};

export type SessionRecord = {
  id: string;
  meetingId: string;
  source: MeetingSource;
  createdAt: string;
  chunkCount: number;
  finalized: boolean;
};

export type EnrollmentRecord = {
  enrolled: boolean;
  samples: number;
  updatedAt?: string;
  embeddingPath?: string;
};

type Persisted = {
  meetings: MeetingRecord[];
  sessions: SessionRecord[];
  enrollment: EnrollmentRecord;
};

@Injectable()
export class DataStore {
  private readonly filePath: string;
  private meetings = new Map<string, MeetingRecord>();
  private sessions = new Map<string, SessionRecord>();
  private enrollment: EnrollmentRecord = { enrolled: false, samples: 0 };

  constructor() {
    const dir = process.env.NOTEWISE_DATA_DIR ?? path.join(process.cwd(), '.data');
    fs.mkdirSync(dir, { recursive: true });
    this.filePath = path.join(dir, 'store.json');
    this.load();
  }

  private load() {
    if (!fs.existsSync(this.filePath)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Persisted;
      for (const m of raw.meetings ?? []) this.meetings.set(m.id, m);
      for (const s of raw.sessions ?? []) this.sessions.set(s.id, s);
      if (raw.enrollment) this.enrollment = raw.enrollment;
    } catch {
      // Corrupt store — start fresh; do not log file contents.
    }
  }

  private persist() {
    const payload: Persisted = {
      meetings: [...this.meetings.values()],
      sessions: [...this.sessions.values()],
      enrollment: this.enrollment,
    };
    fs.writeFileSync(this.filePath, JSON.stringify(payload, null, 2));
  }

  listMeetings(): MeetingRecord[] {
    return [...this.meetings.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  getMeeting(id: string) {
    return this.meetings.get(id) ?? null;
  }

  saveMeeting(meeting: MeetingRecord) {
    this.meetings.set(meeting.id, meeting);
    this.persist();
    return meeting;
  }

  deleteMeeting(id: string) {
    const ok = this.meetings.delete(id);
    if (ok) this.persist();
    return ok;
  }

  createSession(source: MeetingSource, title?: string) {
    const meetingId = randomUUID();
    const sessionId = randomUUID();
    const createdAt = new Date().toISOString();
    const meeting: MeetingRecord = {
      id: meetingId,
      title: title?.trim() || 'Untitled meeting',
      status: 'recording',
      source,
      backend: 'nest',
      createdAt,
      transcript: [],
      notes: null,
      sessionId,
    };
    const session: SessionRecord = {
      id: sessionId,
      meetingId,
      source,
      createdAt,
      chunkCount: 0,
      finalized: false,
    };
    this.meetings.set(meetingId, meeting);
    this.sessions.set(sessionId, session);
    this.persist();
    return { session, meeting };
  }

  getSession(id: string) {
    return this.sessions.get(id) ?? null;
  }

  bumpChunk(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.chunkCount += 1;
    this.sessions.set(sessionId, session);
    this.persist();
    return session;
  }

  finalizeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.finalized = true;
    this.sessions.set(sessionId, session);
    const meeting = this.meetings.get(session.meetingId);
    if (meeting) {
      meeting.status = 'processing';
      this.meetings.set(meeting.id, meeting);
    }
    this.persist();
    return { session, meeting };
  }

  getEnrollment() {
    return this.enrollment;
  }

  addEnrollmentSample(embeddingPath?: string) {
    this.enrollment = {
      enrolled: true,
      samples: this.enrollment.samples + 1,
      updatedAt: new Date().toISOString(),
      embeddingPath: embeddingPath ?? this.enrollment.embeddingPath,
    };
    this.persist();
    return this.enrollment;
  }
}
