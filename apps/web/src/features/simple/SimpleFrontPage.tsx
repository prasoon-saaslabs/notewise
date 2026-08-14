import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Plus, Trash2 } from "lucide-react";
import type { MeetingBackend } from "@notewise/api-client";
import { useCaptureSession } from "../../capture/CaptureSessionContext";
import { DeleteMeetingModal } from "../../components/DeleteMeetingModal";
import { PageMotion } from "../../components/PageMotion";
import { UpcomingCallsSection } from "../../components/UpcomingCallsSection";
import {
  clientForBackend,
  displayMeetingTitle,
  listAllMeetings,
} from "../../lib/meetingsCatalog";
import { isToday } from "./simpleCalendar";
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
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const meetingsQ = useQuery({
    queryKey: ["meetings", "catalog"],
    queryFn: () => listAllMeetings(),
  });

  useEffect(() => {
    if (sessionInProgress) {
      navigate(SIMPLE_NOTE_PATH, { replace: true });
    }
  }, [sessionInProgress, navigate]);

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
          <UpcomingCallsSection
            variant="simple"
            initialVisibleCount={2}
            collapsible
            headerAction={
              <Link
                to={SIMPLE_NOTE_PATH}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--nw-radius-pill)] border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-3 py-1.5 text-sm font-medium text-[var(--nw-ink)] transition hover:border-[var(--nw-accent)] hover:text-[var(--nw-accent-dark)]"
              >
                <Plus className="h-4 w-4" />
                {sessionInProgress ? "Continue Meeting" : "New Meeting"}
              </Link>
            }
          />

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
                        to={`${SIMPLE_NOTE_PATH}/${m.id}?backend=${m.backend}`}
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
