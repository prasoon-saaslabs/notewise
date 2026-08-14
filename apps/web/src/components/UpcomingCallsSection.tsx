import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { formatWhen, formatTimeUntil, isUpcoming } from "../lib/calendarFormat";

type HeaderCopy = {
  eyebrow: string;
  title: string;
  description: string;
  showEyebrow?: boolean;
};

const HEADER_COPY = {
  simple: {
    eyebrow: "Calendar prep",
    title: "Upcoming meets",
    description: "Review AI briefs and notes before each meeting.",
    showEyebrow: false,
  },
  default: {
    eyebrow: "Upcoming Meetings",
    title: "Prep with your meeting brain",
    description:
      "Review context, open follow-ups, and notes before each call. Recording starts only when you choose.",
    showEyebrow: true,
  },
} satisfies Record<"simple" | "default", HeaderCopy>;

type Props = {
  initialVisibleCount?: number;
  collapsible?: boolean;
  /** When set, "Show N more" navigates here instead of expanding inline. */
  showAllHref?: string;
  headerAction?: ReactNode;
  variant?: keyof typeof HEADER_COPY;
};

export function UpcomingCallsSection({
  initialVisibleCount = 2,
  collapsible = false,
  showAllHref,
  headerAction,
  variant = "default",
}: Props) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const copy = HEADER_COPY[variant];
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
  const hiddenCount = Math.max(0, events.length - initialVisibleCount);
  const expandInline = collapsible && !showAllHref;
  const visibleEvents =
    collapsible && (showAllHref || !expanded)
      ? events.slice(0, initialVisibleCount)
      : events;

  return (
    <section className="mb-6">
      <header className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {copy.showEyebrow !== false ? (
              <div className="mb-1 flex items-center gap-2 text-[var(--nw-accent-dark)]">
                <Sparkles className="h-4 w-4" />
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em]">
                  {copy.eyebrow}
                </span>
              </div>
            ) : null}
            <h2 className="m-0 text-2xl font-bold tracking-tight text-[var(--nw-ink)]">
              {copy.title}
            </h2>
            <p className="m-0 mt-1 max-w-xl text-sm text-[var(--nw-ink-3)]">
              {copy.description}
            </p>
          </div>
          {headerAction ? (
            <div className="flex shrink-0 flex-col items-end gap-2">
              {headerAction}
            </div>
          ) : null}
        </div>
      </header>

      {!user?.calendarConnected ? (
        <aside className="rounded-2xl border border-dashed border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-5 py-8 text-center text-sm text-[var(--nw-ink-3)]">
          Connect Google on{" "}
          <Link
            to="/profile"
            className="font-semibold text-[var(--nw-accent-dark)] underline"
          >
            Profile
          </Link>{" "}
          to sync your calendar and unlock AI prep briefs.
        </aside>
      ) : events.length === 0 ? (
        <aside className="rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-5 py-8 text-center text-sm text-[var(--nw-ink-3)]">
          No upcoming meetings in the next two weeks.
        </aside>
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {visibleEvents.map((ev) => {
              const until = formatTimeUntil(ev.startAt);
              return (
                <li key={ev.id}>
                  <Link
                    to={`/upcoming/${ev.id}`}
                    className="block rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] p-4 transition hover:border-[var(--nw-accent)] hover:shadow-[0_8px_24px_rgb(var(--nw-accent-rgb)_/_0.08)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="m-0 text-base font-semibold text-[var(--nw-ink)]">
                          {ev.title}
                        </p>
                        <p className="m-0 mt-1 flex items-center gap-1.5 text-xs text-[var(--nw-ink-3)]">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatWhen(ev.startAt)}
                          {until ? ` · in ${until}` : " · soon"}
                        </p>
                        {ev.attendees?.some((a) => a.name?.trim()) ? (
                          <p className="m-0 mt-2 truncate text-[0.65rem] text-[var(--nw-ink-4)]">
                            {ev.attendees
                              .map((a) => a.name?.trim())
                              .filter(Boolean)
                              .slice(0, 5)
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
              );
            })}
          </ul>
          {(expandInline || showAllHref) && hiddenCount > 0 ? (
            showAllHref ? (
              <Link
                to={showAllHref}
                className="mt-3 flex w-full items-center justify-center rounded-xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-3 py-2.5 text-xs font-semibold text-[var(--nw-ink-2)] transition hover:border-[var(--nw-accent)] hover:text-[var(--nw-accent-dark)]"
              >
                Show {hiddenCount} more
              </Link>
            ) : (
              <button
                type="button"
                className="mt-3 flex w-full items-center justify-center rounded-xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-3 py-2.5 text-xs font-semibold text-[var(--nw-ink-2)] transition hover:border-[var(--nw-accent)] hover:text-[var(--nw-accent-dark)]"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Show less" : `Show ${hiddenCount} more`}
              </button>
            )
          ) : null}
        </>
      )}
    </section>
  );
}
