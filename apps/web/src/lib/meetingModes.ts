import type { MeetingMode } from "@notewise/api-client";

/** Shown when /modes is unreachable — keeps all templates visible offline. */
export const FALLBACK_MEETING_MODES: MeetingMode[] = [
  { id: "general", name: "General" },
  { id: "sales-discovery", name: "Sales discovery", pack_id: "notewise_sales_discovery" },
  { id: "1-1", name: "1:1", pack_id: "notewise_1_1" },
  { id: "standup", name: "Standup", pack_id: "notewise_standup" },
  { id: "investor-call", name: "Investor call", pack_id: "notewise_investor_call" },
];

export const DEFAULT_MEETING_MODE_ID = "general";

export const MEETING_MODE_HINTS: Record<string, string> = {
  general: "PyAI default — summary, actions, takeaways",
  "sales-discovery": "Objections, budget, next steps",
  "1-1": "Blockers, career, manager recap",
  standup: "Yesterday / today / blockers",
  "investor-call": "Ask, traction, round timing",
};

export function mergeMeetingModes(fetched: MeetingMode[]): MeetingMode[] {
  const byId = new Map<string, MeetingMode>();
  for (const mode of FALLBACK_MEETING_MODES) {
    byId.set(mode.id, mode);
  }
  for (const mode of fetched) {
    byId.set(mode.id, { ...byId.get(mode.id), ...mode });
  }
  return FALLBACK_MEETING_MODES.map((m) => byId.get(m.id)!);
}

export function modeHint(modeId: string | null | undefined): string {
  if (!modeId) return MEETING_MODE_HINTS.general;
  return MEETING_MODE_HINTS[modeId] ?? "Summary, actions, objections";
}
