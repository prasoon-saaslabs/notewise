import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@notewise/ui";
import { Calendar, RefreshCw, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import { PageMotion } from "../../components/PageMotion";
import { formatWhen, isUpcoming, minsUntil } from "../../lib/calendarFormat";

export function UpcomingPage() {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
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

  const events = (q.data?.events ?? []).filter((ev) => isUpcoming(ev.startAt));

  return (
    <PageMotion className="nw-page-surface h-full min-h-0 overflow-auto p-3 md:p-5">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[var(--nw-accent-dark)]">
              <Sparkles className="h-4 w-4" />
              <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em]">
                Upcoming calls
              </span>
            </div>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-[var(--nw-ink)]">
              Prep with your meeting brain
            </h1>
            <p className="m-0 mt-1 max-w-xl text-sm text-[var(--nw-ink-3)]">
              Review context, open follow-ups, and notes before each call. Recording starts only when
              you choose.
            </p>
          </div>
          {user?.calendarConnected ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={syncing}
              onClick={() => {
                setSyncing(true);
                void api
                  .syncCalendar()
                  .then(() => q.refetch())
                  .finally(() => setSyncing(false));
              }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              Sync
            </Button>
          ) : null}
        </header>

        {!user?.calendarConnected ? (
          <aside className="rounded-2xl border border-dashed border-[var(--nw-border)] bg-white px-5 py-8 text-center text-sm text-[var(--nw-ink-3)]">
            Connect Google on the{" "}
            <Link to="/login" className="font-semibold text-[var(--nw-accent-dark)] underline">
              sign-in page
            </Link>{" "}
            to sync your calendar and unlock AI prep briefs.
          </aside>
        ) : events.length === 0 ? (
          <aside className="rounded-2xl border border-[var(--nw-border)] bg-white px-5 py-8 text-center text-sm text-[var(--nw-ink-3)]">
            No upcoming meetings in the next two weeks.
          </aside>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {events.map((ev) => (
              <li key={ev.id}>
                <Link
                  to={`/upcoming/${ev.id}`}
                  className="block rounded-2xl border border-[var(--nw-border)] bg-white p-4 transition hover:border-[var(--nw-accent)] hover:shadow-[0_8px_24px_rgb(14_116_144_/_0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 text-base font-semibold text-[var(--nw-ink)]">{ev.title}</p>
                      <p className="m-0 mt-1 flex items-center gap-1.5 text-xs text-[var(--nw-ink-3)]">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatWhen(ev.startAt)}
                        {minsUntil(ev.startAt) > 0
                          ? ` · in ${minsUntil(ev.startAt)} min`
                          : " · soon"}
                      </p>
                      {ev.attendees?.length ? (
                        <p className="m-0 mt-2 truncate text-[0.65rem] text-[var(--nw-ink-4)]">
                          {ev.attendees
                            .slice(0, 5)
                            .map((a) => a.name || a.email)
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--nw-accent-soft)] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-accent-dark)]">
                      Prep
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageMotion>
  );
}
