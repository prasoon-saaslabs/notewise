import type { CalendarEventSummary } from "@notewise/api-client";

export function groupEventsByDay(events: CalendarEventSummary[]) {
  const groups = new Map<string, CalendarEventSummary[]>();
  for (const ev of events) {
    const d = new Date(ev.startAt);
    const key = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
    const list = groups.get(key) ?? [];
    list.push(ev);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([label, items]) => ({
    label,
    items: items.sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    ),
  }));
}

export function formatEventTime(startIso: string, endIso?: string) {
  const d = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date(d.getTime() + 30 * 60_000);
  const fmt = (x: Date) =>
    x.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${fmt(d)} – ${fmt(end)}`;
}

export function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}
