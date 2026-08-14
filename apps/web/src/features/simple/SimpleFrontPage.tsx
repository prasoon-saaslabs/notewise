import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, FileText, Plus, Trash2 } from "lucide-react";
import type { MeetingBackend } from "@notewise/api-client";
import { api } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import { useCaptureSession } from "../../capture/CaptureSessionContext";
import { DeleteMeetingModal } from "../../components/DeleteMeetingModal";
import { PageMotion } from "../../components/PageMotion";
import { isUpcoming } from "../../lib/calendarFormat";
import {
  clientForBackend,
  displayMeetingTitle,
  listAllMeetings,
} from "../../lib/meetingsCatalog";
import { formatEventTime, groupEventsByDay, isToday } from "./simpleCalendar";
import { isSimpleSessionInProgress, SIMPLE_NOTE_PATH } from "./simpleCapture";

type DeleteTarget = {
  id: string;
  backend: MeetingBackend;
  title: string;
};

export function SimpleFrontPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const session = useCaptureSession();
  const sessionInProgress = isSimpleSessionInProgress(session);
  const { user } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const calendarQ = useQuery({
    queryKey: ["calendar-events", user?.id],
    queryFn: () => api.listCalendarEvents(),
    enabled: Boolean(user?.calendarConnected),
    refetchInterval: 60_000,
  });

  const meetingsQ = useQuery({
    queryKey: ["meetings", "catalog"],
    queryFn: () => listAllMeetings(),
  });

  useEffect(() => {
    if (!user?.calendarConnected) return;
    void api.syncCalendar().then(() => calendarQ.refetch());
  }, [user?.id, user?.calendarConnected]);

  useEffect(() => {
    if (sessionInProgress) {
      navigate(SIMPLE_NOTE_PATH, { replace: true });
    }
  }, [sessionInProgress, navigate]);

  const upcomingEvents = (calendarQ.data?.events ?? []).filter((ev) =>
    isUpcoming(ev.startAt)
  );
  const dayGroups = groupEventsByDay(upcomingEvents.slice(0, 12));
  const nextEvent = upcomingEvents[0];
  const todayNotes = (meetingsQ.data ?? [])
    .filter((m) => isToday(m.createdAt))
    .slice(0, 6);

  const remove = useMutation({
    mutationFn: ({ id, backend }: DeleteTarget) =>
      clientForBackend(backend).deleteMeeting(id),
    onSuccess: () => {
      setDeleteTarget(null);
      void qc.invalidateQueries({ queryKey: ["meetings", "catalog"] });
    },
  });

  return (
    <PageMotion className="nw-simple-page nw-page-surface flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto px-4 py-5 md:px-8 md:py-7">
        <div className="mx-auto w-full max-w-2xl">
          <header className="mb-6 flex items-start justify-between gap-3">
            <h1 className="m-0 font-[var(--nw-font-display)] text-3xl font-normal tracking-tight text-[var(--nw-ink)] md:text-4xl">
              Coming up
            </h1>
            <Link
              to={SIMPLE_NOTE_PATH}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--nw-radius-pill)] border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-3 py-1.5 text-sm font-medium text-[var(--nw-ink)] transition hover:border-[var(--nw-accent)] hover:text-[var(--nw-accent-dark)]"
            >
              <Plus className="h-4 w-4" />
              {sessionInProgress ? "Continue Meeting" : "New Meeting"}
            </Link>
          </header>

          {!user?.calendarConnected ? (
            <section className="mb-6 rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-4 py-8 text-center">
              <Calendar className="mx-auto mb-2 h-8 w-8 text-[var(--nw-ink-4)]" />
              <p className="m-0 text-sm font-medium text-[var(--nw-ink-2)]">
                Calendar not integrated
              </p>
              <p className="m-0 mt-1 text-xs text-[var(--nw-ink-4)]">
                Connect Google on{" "}
                <Link
                  to="/profile"
                  className="font-semibold text-[var(--nw-accent-dark)] underline"
                >
                  Profile
                </Link>{" "}
                to see upcoming meetings here.
              </p>
            </section>
          ) : dayGroups.length === 0 ? (
            <section className="mb-6 rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-4 py-6 text-sm text-[var(--nw-ink-3)]">
              No upcoming meetings in the next two weeks.
            </section>
          ) : (
            <section className="mb-6 overflow-hidden rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)]">
              {dayGroups.map(({ label, items }, gi) => (
                <div
                  key={label}
                  className={
                    gi > 0 ? "border-t border-[var(--nw-border)]" : undefined
                  }
                >
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        gi === 0
                          ? "bg-[var(--nw-danger)]"
                          : "bg-[var(--nw-ink-4)]"
                      }`}
                    />
                    <span className="text-sm font-semibold text-[var(--nw-ink)]">
                      {label}
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <p className="m-0 px-4 pb-3 text-xs text-[var(--nw-ink-4)]">
                      No more events today.
                    </p>
                  ) : (
                    <ul className="m-0 list-none p-0 pb-2">
                      {items.map((ev) => (
                        <li
                          key={ev.id}
                          className="flex gap-3 px-4 py-2 text-sm text-[var(--nw-ink-2)]"
                        >
                          <span className="w-1 shrink-0 rounded-full bg-[var(--nw-accent)]" />
                          <span className="min-w-0">
                            <span className="font-medium text-[var(--nw-ink)]">
                              {ev.title}
                            </span>
                            <span className="mt-0.5 block text-xs text-[var(--nw-ink-4)]">
                              {formatEventTime(ev.startAt, ev.endAt)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {nextEvent ? (
            <section className="mb-6">
              <h2 className="m-0 mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--nw-ink-4)]">
                Upcoming
              </h2>
              <div className="rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-4 py-3">
                <p className="m-0 text-sm font-semibold text-[var(--nw-ink)]">
                  {nextEvent.title}
                </p>
                {nextEvent.attendees?.length ? (
                  <p className="m-0 mt-1 truncate text-xs text-[var(--nw-ink-4)]">
                    {nextEvent.attendees
                      .slice(0, 4)
                      .map((a) => a.name || a.email)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : null}
                <p className="m-0 mt-1 text-xs text-[var(--nw-ink-3)]">
                  {new Date(nextEvent.startAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="m-0 mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--nw-ink-4)]">
              Today
            </h2>
            {todayNotes.length === 0 ? (
              <p className="m-0 text-sm text-[var(--nw-ink-4)]">
                No notes yet today.
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {todayNotes.map((m) => {
                  const noteTitle = displayMeetingTitle(m);
                  return (
                    <li
                      key={`${m.backend}:${m.id}`}
                      className="group flex items-center rounded-xl transition hover:bg-[var(--nw-surface-2)]"
                    >
                      <Link
                        to={`/simple/note/${m.id}?backend=${m.backend}`}
                        className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-[var(--nw-ink-4)]" />
                        <span className="min-w-0 flex-1 truncate text-sm text-[var(--nw-ink)]">
                          {noteTitle}
                        </span>
                        <span className="shrink-0 text-xs text-[var(--nw-ink-4)]">
                          {new Date(m.createdAt).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </Link>
                      <button
                        type="button"
                        className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--nw-ink-4)] opacity-0 transition hover:bg-[var(--nw-danger-soft)] hover:text-[var(--nw-danger)] group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label={`Delete ${noteTitle}`}
                        onClick={() =>
                          setDeleteTarget({
                            id: m.id,
                            backend: m.backend,
                            title: noteTitle,
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <DeleteMeetingModal
        open={Boolean(deleteTarget)}
        title={deleteTarget?.title ?? ""}
        onClose={() => !remove.isPending && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget)}
        pending={remove.isPending}
        error={
          remove.isError
            ? (remove.error as Error)?.message || "Could not delete meeting"
            : null
        }
      />
    </PageMotion>
  );
}
