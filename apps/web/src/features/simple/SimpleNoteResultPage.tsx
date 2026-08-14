import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Calendar, Plus, Sparkles } from "lucide-react";
import type { MeetingBackend } from "@notewise/api-client";
import { PageMotion } from "../../components/PageMotion";
import { MeetingNotesIntelligence } from "../../components/MeetingNotesIntelligence";
import { clientForBackend, getCatalogMeeting } from "../../lib/meetingsCatalog";
import { useCaptureSession } from "../../capture/CaptureSessionContext";
import { isEmptyTranscriptError, SIMPLE_NOTE_PATH } from "./simpleCapture";

export function SimpleNoteResultPage() {
  const { meetingId = "" } = useParams();
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const backendHint = (params.get("backend") as MeetingBackend | null) ?? null;
  const emptyFromQuery = params.get("empty") === "1";
  const {
    meetingId: sessionMeetingId,
    notes: sessionNotes,
    userNotes: sessionUserNotes,
    error: sessionError,
    phase: sessionPhase,
    setUserNotesDraft,
  } = useCaptureSession();
  const [draftNotes, setDraftNotes] = useState("");
  const [saveHint, setSaveHint] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const lastSavedRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const q = useQuery({
    queryKey: ["meeting", backendHint, meetingId],
    queryFn: () => getCatalogMeeting(meetingId, backendHint),
    enabled: Boolean(meetingId),
  });

  const meeting = q.data;
  const notes =
    meeting?.notes ?? (sessionMeetingId === meetingId ? sessionNotes : null);
  const title = notes?.title || meeting?.title || "Untitled note";
  const meetingBackend =
    meeting?.backend ?? backendHint ?? ("pyai" as MeetingBackend);
  const emptyTranscript =
    emptyFromQuery ||
    (sessionMeetingId === meetingId &&
      sessionPhase === "failed" &&
      isEmptyTranscriptError(sessionError)) ||
    (meeting?.status === "failed" &&
      isEmptyTranscriptError(
        (meeting as { error?: string | null }).error ?? sessionError,
      ));

  useEffect(() => {
    initializedRef.current = false;
    lastSavedRef.current = null;
    setDraftNotes("");
    setSaveHint("idle");
  }, [meetingId]);

  useEffect(() => {
    if (initializedRef.current || q.isLoading) return;
    const initial =
      meeting?.userNotes ??
      (sessionMeetingId === meetingId ? sessionUserNotes : "") ??
      "";
    setDraftNotes(initial);
    lastSavedRef.current = initial;
    initializedRef.current = true;
  }, [
    q.isLoading,
    meeting?.userNotes,
    sessionMeetingId,
    sessionUserNotes,
    meetingId,
  ]);

  const saveNotes = useMutation({
    mutationFn: (userNotes: string) =>
      clientForBackend(meetingBackend).updateMeeting(meetingId, { userNotes }),
    onMutate: () => setSaveHint("saving"),
    onSuccess: (_data, userNotes) => {
      lastSavedRef.current = userNotes;
      setSaveHint("saved");
      void qc.invalidateQueries({
        queryKey: ["meeting", backendHint, meetingId],
      });
      void qc.invalidateQueries({ queryKey: ["meetings", "catalog"] });
    },
    onError: () => setSaveHint("error"),
  });
  const saveNotesRef = useRef(saveNotes.mutate);
  saveNotesRef.current = saveNotes.mutate;

  useEffect(() => {
    if (!meetingId || !initializedRef.current) return;
    if (draftNotes === lastSavedRef.current) return;

    const timer = window.setTimeout(() => {
      saveNotesRef.current(draftNotes);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [draftNotes, meetingId]);

  const handleNotesChange = (value: string) => {
    setDraftNotes(value);
    setSaveHint("idle");
    if (sessionMeetingId === meetingId) {
      setUserNotesDraft(value);
    }
  };

  return (
    <PageMotion className="nw-simple-page nw-page-surface flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto px-4 py-5 md:px-8 md:py-7">
        <div className="mx-auto w-full min-w-0 max-w-2xl">
          <header className="mb-4 flex items-start justify-between gap-3">
            <Link
              to="/"
              className="text-xs font-medium text-[var(--nw-ink-4)] hover:text-[var(--nw-accent-dark)]"
            >
              ← Back
            </Link>
            <Link
              to={SIMPLE_NOTE_PATH}
              state={{ fresh: true }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--nw-radius-pill)] border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-3 py-1.5 text-sm font-medium text-[var(--nw-ink)] transition hover:border-[var(--nw-accent)] hover:text-[var(--nw-accent-dark)]"
            >
              <Plus className="h-4 w-4" />
              New Meeting
            </Link>
          </header>

          {q.isLoading ? (
            <p className="text-sm text-[var(--nw-ink-3)]">Loading notes…</p>
          ) : q.isError ? (
            <p className="text-sm text-[var(--nw-danger)]">
              Could not load this note.
            </p>
          ) : (
            <>
              <h1 className="m-0 font-[var(--nw-font-display)] text-2xl font-normal tracking-tight text-[var(--nw-ink)] md:text-3xl">
                {title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-[var(--nw-radius-pill)] border border-[var(--nw-border)] bg-[var(--nw-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--nw-accent-dark)]">
                  <Sparkles className="h-3 w-3" />
                  Enhanced
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-[var(--nw-radius-pill)] border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-2.5 py-1 text-xs font-medium text-[var(--nw-ink-3)]">
                  <Calendar className="h-3 w-3" />
                  Today
                </span>
              </div>

              <div className="mt-8 min-w-0">
                {emptyTranscript ? (
                  <section className="rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-2)] px-4 py-3 text-sm leading-relaxed text-[var(--nw-ink-3)]">
                    <p className="m-0 font-medium text-[var(--nw-ink-2)]">
                      No transcription generated.
                    </p>
                    <p className="m-0 mt-2 text-[var(--nw-ink-4)]">
                      We didn&apos;t pick up any speech. Check your mic and try
                      recording again.
                    </p>
                  </section>
                ) : null}

                <MeetingNotesIntelligence
                  notes={notes}
                  userNotes={draftNotes}
                  userNotesEditable
                  onUserNotesChange={handleNotesChange}
                  userNotesSaveHint={saveHint}
                  userNotesPlacement="last"
                  layout="document"
                  emptySummaryMessage={
                    notes
                      ? "Summary will appear after processing."
                      : "Notes are still processing or unavailable for this capture."
                  }
                />
              </div>
            </>
          )}
        </div>
      </div>
    </PageMotion>
  );
}
