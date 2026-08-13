import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";
import type { CalendarEventSummary } from "@notewise/api-client";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { formatWhen, isUpcoming, minsUntil } from "../lib/calendarFormat";

export function UpcomingMeetingsPanel() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["calendar-events", user?.id],
    queryFn: () => api.listCalendarEvents(),
    enabled: Boolean(user?.calendarConnected),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!user?.calendarConnected) return;
    void api.syncCalendar().then(() => q.refetch());
  }, [user?.id, user?.calendarConnected]);

  if (!user) {
    return (
      <aside className="rounded-2xl border border-dashed border-[var(--nw-border)] bg-[rgb(248_250_252)] px-4 py-3 text-sm text-[var(--nw-ink-3)]">
        <Link to="/login" className="font-semibold text-[var(--nw-accent-dark)] underline">
          Sign in
        </Link>{" "}
        for calendar prep and reminders.
      </aside>
    );
  }

  if (!user.calendarConnected) {
    return (
      <aside className="rounded-2xl border border-[var(--nw-border)] bg-white px-4 py-3 text-sm text-[var(--nw-ink-3)]">
        Guest mode — connect Google for upcoming-call prep and brain context.
      </aside>
    );
  }

  const next = (q.data?.events ?? []).find((ev) => isUpcoming(ev.startAt));

  if (!next) {
    return (
      <aside className="rounded-2xl border border-[var(--nw-border)] bg-white px-4 py-3 text-xs text-[var(--nw-ink-4)]">
        No upcoming meetings.{" "}
        <Link to="/upcoming" className="font-semibold text-[var(--nw-accent-dark)] underline">
          View calendar
        </Link>
      </aside>
    );
  }

  return (
    <aside className="rounded-2xl border border-[var(--nw-border)] bg-white p-3">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-[var(--nw-accent-dark)]" />
        <h3 className="m-0 flex-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
          Next up
        </h3>
        <Link
          to="/upcoming"
          className="text-[0.62rem] font-semibold text-[var(--nw-accent-dark)] underline"
        >
          All calls
        </Link>
      </div>
      <NextMeetingCard event={next} />
    </aside>
  );
}

function NextMeetingCard({ event }: { event: CalendarEventSummary }) {
  const mins = minsUntil(event.startAt);

  return (
    <div className="rounded-xl border border-[var(--nw-border)] bg-[rgb(248_250_252)] px-3 py-2.5">
      <p className="m-0 text-sm font-semibold text-[var(--nw-ink)]">{event.title}</p>
      <p className="m-0 mt-0.5 flex items-center gap-1 text-xs text-[var(--nw-ink-3)]">
        <Calendar className="h-3 w-3" />
        {formatWhen(event.startAt)}
        {mins > 0 ? ` · in ${mins} min` : " · soon"}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          to={`/upcoming/${event.id}`}
          className="inline-flex items-center gap-1 rounded-lg bg-[var(--nw-surface-2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--nw-ink-2)] hover:bg-[var(--nw-accent-soft)] hover:text-[var(--nw-accent-dark)]"
        >
          Prep brief <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
