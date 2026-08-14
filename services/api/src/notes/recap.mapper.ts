import type { NotesPayload, TranscriptTurn } from "../store/data.store";

export function freshRecapCallId(base: string): string {
  const stem = (base || "call").trim() || "call";
  const suffix = Math.random().toString(16).slice(2, 14).padEnd(12, "0");
  return `${stem}-r${suffix}`.slice(0, 128);
}

export type RecapUtterance = {
  speaker_role: "agent" | "customer";
  text: string;
  offset_s: number;
  duration_s: number;
};

const NOTE_PREFIX =
  "NOTE TAKER CONTEXT — Use these live notes together with the transcript. " +
  "Produce a detailed executive summary, concrete action items with owners when " +
  "mentioned, takeaways, and open questions. Prefer action items from both the " +
  "notes and any commitments in speech.\n\nLive notes:\n";

export function transcriptToUtterances(
  turns: TranscriptTurn[],
): RecapUtterance[] {
  return turns
    .filter((t) => (t.text || "").trim())
    .map((t) => {
      const start = Math.max(0, (t.startMs || 0) / 1000);
      const end = Math.max(start, (t.endMs || 0) / 1000);
      return {
        speaker_role: t.kind === "you" ? "agent" : "customer",
        text: t.text.trim(),
        offset_s: start,
        duration_s: Math.max(0.1, end - start),
      };
    });
}

export function foldUserNotesIntoUtterances(
  utterances: RecapUtterance[],
  userNotes?: string | null,
): RecapUtterance[] {
  const notes = (userNotes || "").trim();
  if (!notes) return utterances.slice();
  const block = `${NOTE_PREFIX}${notes}`;
  if (utterances.length === 0) {
    return [
      { speaker_role: "agent", text: block, offset_s: 0, duration_s: 0.1 },
    ];
  }
  const [first, ...rest] = utterances;
  return [{ ...first, text: `${block}\n\n${first.text}`.trim() }, ...rest];
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function collectActions(raw: unknown): NotesPayload["actions"] {
  if (!Array.isArray(raw)) return [];
  const actions: NonNullable<NotesPayload["actions"]> = [];
  for (const a of raw) {
    if (typeof a === "string" && a.trim()) {
      actions.push({ text: a.trim() });
      continue;
    }
    if (!a || typeof a !== "object") continue;
    const row = a as Record<string, unknown>;
    const text = asText(row.task) || asText(row.text) || asText(row.action);
    if (text) actions.push({ text, owner: asText(row.owner) || undefined });
  }
  return actions;
}

function collectLines(
  record: Record<string, unknown>,
  keys: string[],
): string[] {
  const out: string[] = [];
  for (const key of keys) {
    const val = record[key];
    if (!Array.isArray(val)) continue;
    for (const item of val) {
      if (typeof item === "string" && item.trim()) out.push(item.trim());
      else if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        const t = asText(row.text) || asText(row.decision) || asText(row.step);
        if (t) out.push(t);
      }
    }
  }
  return out;
}

export function mapRecapToNotes(recap: Record<string, unknown>): NotesPayload {
  const record = (recap.record as Record<string, unknown> | undefined) ?? {};
  const title =
    asText(recap.headline) || asText(record.tldr) || asText(record.headline);
  const summary = asText(record.summary) || asText(record.summary_draft);
  return {
    title: title || undefined,
    executiveSummary: summary || undefined,
    takeaways: collectLines(record, [
      "decisions",
      "next_steps",
      "takeaways",
      "key_points",
    ]),
    actions: collectActions(record.action_items ?? record.actions),
    openQuestions: collectLines(record, ["open_questions", "questions"]),
    risks: [],
  };
}
