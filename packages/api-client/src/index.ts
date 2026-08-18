export type HealthResponse = {
  status: "ok" | "degraded";
  api: string;
  worker?: string;
  providers: Record<string, string>;
};

export type MeetingStatus =
  | "recording"
  | "processing"
  | "ready"
  | "failed"
  | "bot_joining"
  | "bot_live";

export type MeetingBackend = "nest" | "pyai";

export type MeetingSummary = {
  id: string;
  title: string;
  status: MeetingStatus;
  source: "local" | "bot" | "desktop" | "sample";
  /** Which API stack produced this meeting. */
  backend?: MeetingBackend;
  createdAt: string;
  durationSec?: number;
  snippet?: string;
};

export type TranscriptTurn = {
  id: string;
  speaker: string;
  kind: "you" | "other" | "guest";
  text: string;
  startMs: number;
  endMs: number;
};

export type NotesPayload = {
  title?: string;
  executiveSummary?: string;
  takeaways?: string[];
  actions?: Array<{
    text: string;
    owner?: string;
    priority?: "high" | "med" | "low";
    due?: string;
    lineIds?: string[];
    startMs?: number;
  }>;
  openQuestions?: string[];
  risks?: string[];
  decisions?: CitedClaim[];
  objections?: CitedClaim[];
  followUpEmail?: string | null;
  claims?: CitedClaim[];
  droppedCount?: number;
  runStatus?: RunStatus | null;
  /** Raw PyAI Recap API response when notes were generated via Recap. */
  pyairesponse?: Record<string, unknown> | null;
};

export type CitedClaim = {
  id: string;
  type: string;
  text: string;
  owner?: string | null;
  due?: string | null;
  lineIds: string[];
  startMs?: number | null;
  meetingId?: string | null;
  blocked?: boolean;
  blockReason?: string | null;
};

export type RunStatus = {
  exit: "shipped" | "partial" | "failed" | "deadline";
  claimsCited: number;
  claimsBlocked: number;
  retries?: Array<{ attempt: number; reason: string; at: string }>;
  tokens: number;
  costUsd: number;
  elapsedMs: number;
  budgetTokens?: number;
  budgetUsd?: number;
  budgetMs?: number;
  modeId?: string | null;
};

export type MeetingDetail = MeetingSummary & {
  transcript: TranscriptTurn[];
  notes: NotesPayload | null;
  /** Typed notes from the capture pane (Margin / PyAI merge input). */
  userNotes?: string | null;
  audioUrl?: string | null;
  meetingUrl?: string;
  botProvider?: "meetingbaas" | "recall" | "simulation";
  botMessage?: string;
  platform?: "google_meet" | "zoom" | "teams" | "unknown";
  botId?: string;
  marginPath?: string | null;
  error?: string | null;
  modeId?: string | null;
  entityIds?: string[];
  runStatus?: RunStatus | null;
  droppedCount?: number;
};

export type EnrollmentStatus = {
  enrolled: boolean;
  samples: number;
  updatedAt?: string;
  hasVoiceprint?: boolean;
  consentAccepted?: boolean;
  consentAt?: string;
};

export type JoinMeetingRequest = {
  meetingUrl: string;
  title?: string;
};

export type JoinMeetingResponse = {
  meetingId: string;
  botId: string;
  status: MeetingStatus;
  mode?: "meetingbaas" | "recall" | "simulation";
  message?: string;
  platform?: string;
};

export type CreateSessionResponse = {
  sessionId: string;
  meetingId: string;
};

export type MeetingMode = { id: string; name: string; pack_id?: string };

export type EntityRecord = {
  id: string;
  kind: "person" | "company";
  name: string;
  company?: string | null;
  meetingIds?: string[];
  topics?: string[];
  openItemCount?: number;
};

export type AskResponse = {
  question: string;
  answer: Array<{
    text: string;
    citations: Array<{
      meetingId: string;
      meetingTitle?: string;
      lineId: string;
      startMs: number;
      text: string;
      speaker?: string;
    }>;
  }>;
  hits?: unknown[];
  source?:
    | "recap"
    | "ollama"
    | "retrieval"
    | "recap_scope"
    | "no_evidence"
    | "recap_failed";
  sourceDetail?: string | null;
  spoken?: string;
  audioBase64?: string | null;
};

export type PreCallBrief = {
  entity: EntityRecord;
  lastMeeting?: {
    id: string;
    title: string;
    createdAt: string;
    recap?: string | null;
  } | null;
  openCommitments: Array<{
    id: string;
    text: string;
    direction: string;
    due?: string | null;
  }>;
  unresolvedObjections: Array<{
    text: string;
    meetingId: string;
    meetingTitle?: string;
    startMs?: number;
  }>;
  suggestedAgenda: string[];
  meetingCount: number;
};

export type AuthUser = {
  id: string;
  email?: string | null;
  name: string;
  provider: "google" | "microsoft" | "guest";
  picture?: string | null;
  calendarConnected?: boolean;
  createdAt?: string;
};

export type AuthProviders = {
  google: { enabled: boolean; scopes?: string[] };
  microsoft: { enabled: boolean; reason?: string };
  guest: { enabled: boolean };
};

export type CalendarEventSummary = {
  id: string;
  externalId: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  meetUrl?: string | null;
  htmlLink?: string | null;
  attendees: Array<{
    email?: string | null;
    name?: string | null;
    responseStatus?: string | null;
  }>;
  entityIds?: string[];
  linkedMeetingId?: string | null;
  manualNotes?: string | null;
};

export type CalendarEventPrep = CalendarEventSummary & {
  prep?: EventPrepDetail;
};

export type EventPrepDetail = {
  eventId: string;
  title: string;
  startAt: string;
  endAt: string;
  meetUrl?: string | null;
  attendees: CalendarEventSummary["attendees"];
  entityIds?: string[];
  entityBriefs?: PreCallBrief[];
  retrievalHits?: Array<{ text: string; score?: number; meetingId?: string }>;
  suggestedSummary?: string | null;
  suggestedActions?: string[];
  manualNotes?: string | null;
  linkedMeetingId?: string | null;
};

export class NotewiseApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private authToken: string | null = null;

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  getAuthToken() {
    return this.authToken;
  }

  absoluteUrl(pathOrUrl?: string | null) {
    if (!pathOrUrl) return null;
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    return `${this.baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(this.authToken
          ? { Authorization: `Bearer ${this.authToken}` }
          : {}),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${body || res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  health() {
    return this.request<HealthResponse>("/health");
  }

  listMeetings() {
    return this.request<MeetingSummary[]>("/meetings");
  }

  async getMeeting(id: string) {
    const meeting = await this.request<MeetingDetail>(
      `/meetings/${encodeURIComponent(id)}`,
    );
    return {
      ...meeting,
      audioUrl: this.absoluteUrl(meeting.audioUrl),
    };
  }

  deleteMeeting(id: string) {
    return this.request<void>(`/meetings/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  updateMeeting(
    id: string,
    body: { title?: string; userNotes?: string; modeId?: string },
  ) {
    const payload: { title?: string; userNotes?: string; modeId?: string } = {};
    if (body.title != null) {
      const title = body.title.trim();
      if (!title) return Promise.reject(new Error("Title cannot be empty"));
      payload.title = title;
    }
    if (body.userNotes != null) {
      payload.userNotes = body.userNotes;
    }
    if (body.modeId != null) {
      payload.modeId = body.modeId;
    }
    if (!Object.keys(payload).length) {
      return Promise.reject(new Error("Nothing to update"));
    }
    return this.request<MeetingDetail>(`/meetings/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  createLocalSession(
    title?: string,
    opts?: {
      name?: string;
      userNotes?: string;
      modeId?: string;
      channelMode?: string;
      calendarEventId?: string;
    },
  ) {
    const body: Record<string, string | undefined> = {
      source: "local",
      name: opts?.name,
      title,
      modeId: opts?.modeId,
      channelMode: opts?.channelMode,
      calendarEventId: opts?.calendarEventId,
    };
    if (opts?.userNotes != null && opts.userNotes.trim()) {
      body.userNotes = opts.userNotes;
    }
    return this.request<CreateSessionResponse>("/sessions", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  uploadAudioChunk(sessionId: string, blob: Blob, sequence: number) {
    const form = new FormData();
    const ext = blob.type.includes("mp4") ? "m4a" : "webm";
    form.append("file", blob, `chunk-${sequence}.${ext}`);
    form.append("sequence", String(sequence));
    return this.fetchImpl(
      `${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}/chunks`,
      {
        method: "POST",
        headers: this.authToken
          ? { Authorization: `Bearer ${this.authToken}` }
          : {},
        body: form,
      },
    ).then(async (res) => {
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `Upload failed: ${res.status}${body ? ` — ${body}` : ""}`,
        );
      }
      return res.json() as Promise<{ ok: boolean }>;
    });
  }

  liveTranscribe(sessionId: string, blob: Blob) {
    const form = new FormData();
    const ext = blob.type.includes("mp4") ? "m4a" : "webm";
    form.append("file", blob, `live.${ext}`);
    return this.fetchImpl(
      `${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}/live`,
      {
        method: "POST",
        headers: this.authToken
          ? { Authorization: `Bearer ${this.authToken}` }
          : {},
        body: form,
      },
    ).then(async (res) => {
      if (!res.ok) throw new Error(`Live STT failed: ${res.status}`);
      return res.json() as Promise<{
        text: string;
        segments: Array<{ text: string; startMs: number; endMs: number }>;
      }>;
    });
  }

  finalizeSession(
    sessionId: string,
    opts?: {
      userNotes?: string;
      liveTurns?: Array<{
        text: string;
        startMs?: number;
        endMs?: number;
        speaker?: string;
      }>;
    },
  ) {
    const body: Record<string, unknown> = {};
    if (opts?.userNotes != null) body.userNotes = opts.userNotes;
    if (opts?.liveTurns?.length) body.liveTurns = opts.liveTurns;
    return this.request<{
      meetingId: string;
      status: MeetingStatus;
      error?: string;
    }>(`/sessions/${encodeURIComponent(sessionId)}/finalize`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /** Path C: set check-in window end (ms) for You-bind after diarize (pyai-gateway). */
  setSessionCheckIn(sessionId: string, checkInEndMs: number) {
    return this.request<{ ok: boolean; checkInEndMs: number }>(
      `/sessions/${encodeURIComponent(sessionId)}/check-in`,
      {
        method: "POST",
        body: JSON.stringify({ checkInEndMs }),
      },
    );
  }

  updateSessionMode(sessionId: string, modeId: string) {
    return this.request<{ ok: boolean; modeId: string; packId: string }>(
      `/sessions/${encodeURIComponent(sessionId)}/mode`,
      {
        method: "PATCH",
        body: JSON.stringify({ modeId }),
      },
    );
  }

  /** Upload raw PCM16 for batch finalize (pyai-gateway). */
  uploadPcm(sessionId: string, pcm: Blob) {
    const form = new FormData();
    form.append("file", pcm, "live.pcm");
    return this.fetchImpl(
      `${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}/pcm`,
      {
        method: "POST",
        headers: this.authToken
          ? { Authorization: `Bearer ${this.authToken}` }
          : {},
        body: form,
      },
    ).then(async (res) => {
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `PCM upload failed: ${res.status}${body ? ` — ${body}` : ""}`,
        );
      }
      return res.json() as Promise<{ ok: boolean; bytes: number }>;
    });
  }

  /** One-tap “This is me” bind (pyai-gateway). */
  bindSpeaker(meetingId: string, rawSpeaker: string) {
    return this.request<{ ok: boolean }>(
      `/meetings/${encodeURIComponent(meetingId)}/bind-speaker`,
      {
        method: "POST",
        body: JSON.stringify({ speaker: rawSpeaker, asYou: true }),
      },
    );
  }

  regenerateNotes(
    meetingId: string,
    opts?: { userNotes?: string; modeId?: string },
  ) {
    const body: { userNotes?: string; modeId?: string } = {};
    if (opts?.userNotes != null) body.userNotes = opts.userNotes;
    if (opts?.modeId != null) body.modeId = opts.modeId;
    return this.request<{
      meetingId: string;
      status: MeetingStatus;
      notes?: NotesPayload;
      snippet?: string;
    }>(`/notes/${encodeURIComponent(meetingId)}/regenerate`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  getEnrollment() {
    return this.request<EnrollmentStatus>("/enrollment");
  }

  enrollSample(blob: Blob) {
    const form = new FormData();
    form.append("file", blob, "enroll.webm");
    return this.fetchImpl(`${this.baseUrl}/enrollment/samples`, {
      method: "POST",
      body: form,
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Enrollment failed: ${res.status}`);
      return res.json() as Promise<EnrollmentStatus>;
    });
  }

  joinMeeting(body: JoinMeetingRequest) {
    return this.request<JoinMeetingResponse>("/bots/join", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  stopBot(meetingId: string) {
    return this.request<{ status: MeetingStatus }>(
      `/bots/${encodeURIComponent(meetingId)}/stop`,
      { method: "POST" },
    );
  }

  syncBotMeeting(meetingId: string) {
    return this.request<MeetingDetail>(
      `/bots/${encodeURIComponent(meetingId)}/sync`,
      {
        method: "POST",
      },
    );
  }

  listProviders() {
    return this.request<Record<string, string>>("/providers");
  }

  listModes() {
    return this.request<MeetingMode[]>("/modes");
  }

  searchMeetings(q: string) {
    return this.request<MeetingSummary[]>(`/search?q=${encodeURIComponent(q)}`);
  }

  ask(question: string, entityId?: string) {
    return this.request<AskResponse>("/ask", {
      method: "POST",
      body: JSON.stringify({ question, entityId }),
    });
  }

  voiceAsk(question: string, opts?: { speak?: boolean; clone?: boolean }) {
    return this.request<AskResponse>("/voice/ask", {
      method: "POST",
      body: JSON.stringify({
        question,
        speak: opts?.speak ?? true,
        clone: opts?.clone ?? false,
      }),
    });
  }

  copilotHint(meetingId: string, utterance: string, agenda: string[] = []) {
    return this.request<{
      skipped: boolean;
      kind: string;
      hint?: string | null;
      prior?: { text: string; meetingId: string; citations?: unknown[] };
      agendaCoverage?: string[];
      commitment?: string | null;
      budgetUsed?: number;
      budgetMax?: number;
    }>("/copilot/hint", {
      method: "POST",
      body: JSON.stringify({ meetingId, utterance, agenda }),
    });
  }

  listEntities() {
    return this.request<EntityRecord[]>("/entities");
  }

  createEntity(body: {
    name: string;
    kind?: EntityRecord["kind"];
    company?: string | null;
  }) {
    const name = body.name.trim();
    if (!name) return Promise.reject(new Error("Name is required"));
    return this.request<EntityRecord>("/entities", {
      method: "POST",
      body: JSON.stringify({
        name,
        kind: body.kind ?? "person",
        company: body.company?.trim() || null,
      }),
    });
  }

  deleteEntity(id: string) {
    return this.request<void>(`/entities/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  getEntity(id: string) {
    return this.request<
      EntityRecord & { timeline: MeetingSummary[]; commitments: unknown[] }
    >(`/entities/${encodeURIComponent(id)}`);
  }

  getBrief(entityId: string) {
    return this.request<PreCallBrief>(
      `/entities/${encodeURIComponent(entityId)}/brief`,
    );
  }

  getTrust() {
    return this.request<{
      dbPath: string;
      runs: Array<Record<string, unknown>>;
      dataFlow: Record<string, string>;
    }>("/trust");
  }

  getPrivacy() {
    return this.request<{
      title: string;
      audio: string;
      text: string;
      atRest: string;
      notSent: string[];
      consent: string;
    }>("/privacy");
  }

  acceptConsent() {
    return this.request<{ consentAccepted: boolean; consentAt?: string }>(
      "/enrollment/consent",
      {
        method: "POST",
        body: JSON.stringify({ accepted: true }),
      },
    );
  }

  saveScratch(sessionId: string, userNotes: string) {
    return this.request<{ ok: boolean }>(
      `/sessions/${encodeURIComponent(sessionId)}/notes`,
      {
        method: "POST",
        body: JSON.stringify({ userNotes }),
      },
    );
  }

  listSamples() {
    return this.request<Array<{ id: string; title: string; modeId?: string }>>(
      "/samples",
    );
  }

  importSample(id: string) {
    return this.request<{ meetingId: string; title: string }>(
      `/samples/${encodeURIComponent(id)}/import`,
      { method: "POST" },
    );
  }

  exportMeetingJson(id: string) {
    return this.request<MeetingDetail>(
      `/meetings/${encodeURIComponent(id)}/export.json`,
    );
  }

  async exportMeetingMd(id: string) {
    const res = await this.fetchImpl(
      `${this.baseUrl}/meetings/${encodeURIComponent(id)}/export.md`,
    );
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    return res.text();
  }

  async exportMeetingHtml(id: string) {
    const res = await this.fetchImpl(
      `${this.baseUrl}/meetings/${encodeURIComponent(id)}/export.html`,
      {
        headers: this.authToken
          ? { Authorization: `Bearer ${this.authToken}` }
          : {},
      },
    );
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    return res.text();
  }

  authProviders() {
    return this.request<AuthProviders>("/auth/providers");
  }

  authMe() {
    return this.request<{ authenticated: boolean; user: AuthUser | null }>(
      "/auth/me",
    );
  }

  authGuest(name: string) {
    return this.request<{ token: string; user: AuthUser }>("/auth/guest", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  googleAuthUrl(opts?: { client?: "web" | "desktop" }) {
    const q = opts?.client === "desktop" ? "?client=desktop" : "";
    return this.request<{ url: string }>(`/auth/google/url${q}`);
  }

  listCalendarEvents() {
    return this.request<{
      events: CalendarEventSummary[];
      calendarConnected: boolean;
    }>("/calendar/events");
  }

  syncCalendar() {
    return this.request<{ synced: number; events: CalendarEventSummary[] }>(
      "/calendar/sync",
      {
        method: "POST",
      },
    );
  }

  getCalendarPrep(eventId: string) {
    return this.request<EventPrepDetail>(
      `/calendar/events/${encodeURIComponent(eventId)}/prep`,
    );
  }

  saveCalendarNotes(eventId: string, notes: string) {
    return this.request<{ ok: boolean; manualNotes: string }>(
      `/calendar/events/${encodeURIComponent(eventId)}/notes`,
      { method: "PATCH", body: JSON.stringify({ notes }) },
    );
  }

  pendingCalendarReminders() {
    return this.request<{
      reminders: CalendarEventPrep[];
      starts: CalendarEventPrep[];
    }>("/calendar/reminders/pending");
  }
}

export function createApiClient(baseUrl?: string, fetchImpl?: typeof fetch) {
  const envUrl =
    typeof import.meta !== "undefined"
      ? (import.meta as ImportMeta & { env?: Record<string, string> }).env
          ?.VITE_API_URL
      : undefined;
  const url = (baseUrl || envUrl || "http://localhost:3001").replace(/\/$/, "");
  return new NotewiseApiClient(url, fetchImpl);
}
