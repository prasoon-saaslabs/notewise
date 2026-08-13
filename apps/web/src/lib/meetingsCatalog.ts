import {
  createApiClient,
  type MeetingBackend,
  type MeetingDetail,
  type MeetingSummary,
  type NotesPayload,
} from "@notewise/api-client";
import { resolveApiBase } from "./backend";
import { isDesktopPyaiOnly } from "./desktopMode";

const PYAI_URL = "http://127.0.0.1:3002";

const PLACEHOLDER_TITLE =
  /^(recording…?|recording\.\.\.|untitled( meeting)?|meeting notes|new meeting|setup smoke|test|capture · .+|quick sync|[a-z]{3} sync)$/i;

const STOPWORDS = new Set(
  `
  a an the and or but if in on at to for of is are was were be been being
  have has had do does did will would could should may might must can
  this that these those i we you they he she it my our your their
  with from about into over after before just also very really so then
  than too there here what when where which who how not no yes ok okay
  um uh hey hi hello yeah yep well got get getting going go went
  discussion covered turns meeting meetings notes note call calls today
  tomorrow week next last some any something anything everything stuff
  kind sort thing things one two three need needs needed want wants
  like make made making talk talking spoke speak speaking said say
  thinking know looking check checking checked right actually basically
  `.trim().split(/\s+/),
);

export type CatalogMeeting = MeetingSummary & {
  backend: MeetingBackend;
};

function client(url: string) {
  return createApiClient(url);
}

export function apiBaseForBackend(backend: MeetingBackend): string {
  if (isDesktopPyaiOnly()) return PYAI_URL;
  const NEST_URL = "http://127.0.0.1:3001";
  return backend === "pyai" ? PYAI_URL : NEST_URL;
}

export function clientForBackend(backend: MeetingBackend) {
  return client(apiBaseForBackend(backend));
}

export function isPlaceholderTitle(title?: string | null): boolean {
  if (!title?.trim()) return true;
  return PLACEHOLDER_TITLE.test(title.trim());
}

const TEST_TITLES = new Set([
  "voice ask",
  "setup smoke",
  "test",
  "test call",
  "new meeting",
  "recording",
  "recording…",
]);

/** Hide sample imports, voice-hotkey shells, and other junk from the library. */
export function isTestMeeting(
  meeting: Pick<MeetingSummary, "title" | "source" | "snippet"> & {
    transcript?: unknown[];
    callId?: string | null;
  },
): boolean {
  const title = (meeting.title || "").trim().toLowerCase();
  if (TEST_TITLES.has(title) || title.startsWith("voice ask")) return true;
  if (meeting.source === "sample") return true;
  if (meeting.callId?.startsWith("ask-")) return true;
  const txLen = Array.isArray(meeting.transcript) ? meeting.transcript.length : 0;
  if (!txLen && (title === "quick sync" || title === "untitled" || title === "untitled meeting")) {
    return true;
  }
  return false;
}

/** Compress prose into a Title-Case 2–3 word topic. */
export function shortMeetingTitle(text: string, maxWords = 3): string | null {
  const first = text.split(/(?<=[.!?])\s+|\n+/)[0]?.trim() || text.trim();
  const cleaned = first
    .replace(/^(um+|uh+|yeah|yes|ok(ay)?|so|well|like|hey|hi|hello)\b[\s,.-]*/i, "")
    .trim();
  const words = (cleaned.match(/[A-Za-z][A-Za-z0-9'/-]*/g) || []).filter(
    (w) => w.length > 2 && !STOPWORDS.has(w.toLowerCase()),
  );
  if (!words.length) return null;
  const picked = words.slice(0, maxWords);
  return picked
    .map((w) => (w.length <= 4 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

/** Prefer a compact 2–3 word topic from title / notes / snippet. */
export function displayMeetingTitle(
  meeting: Pick<MeetingSummary, "title" | "snippet" | "createdAt"> & {
    notes?: NotesPayload | null;
  },
): string {
  const candidates = [
    meeting.notes?.title,
    meeting.title,
    meeting.notes?.executiveSummary,
    meeting.snippet,
  ];
  for (const raw of candidates) {
    if (!raw?.trim() || isPlaceholderTitle(raw)) continue;
    const short = shortMeetingTitle(raw);
    if (short) return short;
  }

  try {
    const d = new Date(meeting.createdAt);
    if (!Number.isNaN(d.getTime())) {
      return `${d.toLocaleString(undefined, { month: "short" })} Sync`;
    }
  } catch {
    /* ignore */
  }
  return "Quick Sync";
}

/** Merge meeting libraries. Desktop ships PyAI-only. */
export async function listAllMeetings(): Promise<CatalogMeeting[]> {
  if (isDesktopPyaiOnly()) {
    const rows = await client(PYAI_URL).listMeetings();
    const merged = rows.map(
      (m): CatalogMeeting => ({
        ...m,
        backend: "pyai",
      }),
    );
    const filtered = merged.filter((m) => !isTestMeeting(m));
    filtered.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return filtered;
  }

  const NEST_URL = "http://127.0.0.1:3001";
  const active = resolveApiBase().replace(/\/$/, "");
  const targets = new Map<MeetingBackend, string>();

  targets.set("nest", NEST_URL);
  targets.set("pyai", PYAI_URL);

  if (active && active !== "/api" && ![NEST_URL, PYAI_URL].includes(active)) {
    const kind: MeetingBackend = /:3002\b|pyai/i.test(active) ? "pyai" : "nest";
    targets.set(kind, active);
  }

  const settled = await Promise.allSettled(
    [...targets.entries()].map(async ([backend, url]) => {
      const rows = await client(url).listMeetings();
      return rows.map(
        (m): CatalogMeeting => ({
          ...m,
          backend: m.backend === "pyai" || m.backend === "nest" ? m.backend : backend,
        }),
      );
    }),
  );

  const merged: CatalogMeeting[] = [];
  const seen = new Set<string>();
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const m of result.value) {
      const key = `${m.backend}:${m.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(m);
    }
  }

  const filtered = merged.filter((m) => !isTestMeeting(m));
  filtered.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return filtered;
}

export async function getCatalogMeeting(
  id: string,
  backendHint?: MeetingBackend | null,
): Promise<MeetingDetail & { backend: MeetingBackend }> {
  if (isDesktopPyaiOnly()) {
    const meeting = await client(PYAI_URL).getMeeting(id);
    return { ...meeting, backend: "pyai" };
  }

  const NEST_URL = "http://127.0.0.1:3001";
  const order: MeetingBackend[] = backendHint
    ? [backendHint, backendHint === "pyai" ? "nest" : "pyai"]
    : ["pyai", "nest"];

  let lastErr: Error | null = null;
  for (const backend of order) {
    try {
      const meeting = await clientForBackend(backend).getMeeting(id);
      return {
        ...meeting,
        backend: meeting.backend === "pyai" || meeting.backend === "nest" ? meeting.backend : backend,
      };
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr ?? new Error("Meeting not found");
}
