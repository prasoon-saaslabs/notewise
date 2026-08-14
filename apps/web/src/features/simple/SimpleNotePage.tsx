import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { useCaptureSession } from "../../capture/CaptureSessionContext";
import { PageMotion } from "../../components/PageMotion";
import { NotesEditor } from "../../components/notes/NotesEditor";
import { api } from "../../lib/api";
import { debounce } from "../../lib/throttle";
import { SimpleTranscriptBar } from "./SimpleTranscriptBar";
import { SimpleTranscriptPanel } from "./SimpleTranscriptPanel";
import {
  clearSimpleCapture,
  DEFAULT_SIMPLE_MEETING_NAME,
  isEditedSimpleMeetingName,
  isEmptyTranscriptError,
  markSimpleCapture,
  resetSimpleMeetingName,
  setSimpleMeetingName,
  SIMPLE_NOTE_PATH,
} from "./simpleCapture";

export function SimpleNotePage() {
  const navigate = useNavigate();
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [meetingName, setMeetingName] = useState(DEFAULT_SIMPLE_MEETING_NAME);
  const autoStartedRef = useRef(false);
  /** Only redirect to results after finishing a capture started on this visit. */
  const sawLiveCaptureRef = useRef(false);
  const {
    recording,
    paused,
    busy,
    phase,
    meetingId,
    turns,
    interim,
    userNotes,
    error,
    statusLine,
    start,
    stop,
    resume,
    setUserNotesDraft,
  } = useCaptureSession();

  const processing =
    phase === "uploading" ||
    phase === "transcribing" ||
    phase === "speakers" ||
    phase === "notes";
  const live = recording || paused;
  const starting =
    !live &&
    !processing &&
    phase === "idle" &&
    (busy || !autoStartedRef.current);
  const showTranscriptPanel =
    transcriptOpen && (live || starting || processing);

  const persistMeetingName = useMemo(
    () =>
      debounce((id: string, name: string) => {
        if (!isEditedSimpleMeetingName(name)) return;
        void api.updateMeeting(id, { title: name.trim() });
      }, 400),
    [],
  );

  const onMeetingNameChange = useCallback(
    (next: string) => {
      setMeetingName(next);
      setSimpleMeetingName(next);
      if (meetingId && isEditedSimpleMeetingName(next)) {
        persistMeetingName(meetingId, next);
      }
    },
    [meetingId, persistMeetingName],
  );

  const onMeetingNameBlur = useCallback(() => {
    const trimmed = meetingName.trim();
    if (!trimmed) {
      setMeetingName(DEFAULT_SIMPLE_MEETING_NAME);
      setSimpleMeetingName(DEFAULT_SIMPLE_MEETING_NAME);
      return;
    }
    if (trimmed !== meetingName) {
      setMeetingName(trimmed);
      setSimpleMeetingName(trimmed);
    }
    if (meetingId && isEditedSimpleMeetingName(trimmed)) {
      persistMeetingName(meetingId, trimmed);
    }
  }, [meetingId, meetingName, persistMeetingName]);

  useEffect(() => {
    markSimpleCapture();
    resetSimpleMeetingName();
    setMeetingName(DEFAULT_SIMPLE_MEETING_NAME);
  }, []);

  useEffect(() => {
    if (recording || paused || processing) {
      autoStartedRef.current = true;
      return;
    }
    if (busy || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void start();
  }, [recording, paused, processing, busy, start]);

  useEffect(() => {
    if (live || processing) {
      sawLiveCaptureRef.current = true;
    }
  }, [live, processing]);

  useEffect(() => {
    if (phase === "ready" || phase === "failed") {
      if (sawLiveCaptureRef.current) {
        clearSimpleCapture();
      }
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "ready" && meetingId && sawLiveCaptureRef.current) {
      setTranscriptOpen(false);
      navigate(`${SIMPLE_NOTE_PATH}/${meetingId}`, { replace: true });
    }
  }, [phase, meetingId, navigate]);

  useEffect(() => {
    if (
      phase === "failed" &&
      meetingId &&
      sawLiveCaptureRef.current &&
      isEmptyTranscriptError(error)
    ) {
      setTranscriptOpen(false);
      navigate(`${SIMPLE_NOTE_PATH}/${meetingId}?empty=1`, { replace: true });
    }
  }, [phase, meetingId, error, navigate]);

  return (
    <PageMotion className="nw-simple-page nw-page-surface flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className={`grid min-h-0 flex-1 ${
          showTranscriptPanel
            ? "grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-2 md:grid-rows-1"
            : "grid-cols-1"
        }`}
      >
        <section className="flex min-h-0 flex-col overflow-hidden md:border-r md:border-[var(--nw-border)]">
          <div className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-5 md:px-6 md:py-6">
            <header className="mb-4 shrink-0">
              {!(live || processing || starting) ? (
                <Link
                  to="/"
                  className="mb-3 inline-block text-xs font-medium text-[var(--nw-ink-4)] hover:text-[var(--nw-accent-dark)]"
                >
                  ← Back
                </Link>
              ) : null}
              <input
                type="text"
                value={meetingName}
                onChange={(e) => onMeetingNameChange(e.target.value)}
                onBlur={onMeetingNameBlur}
                maxLength={200}
                aria-label="Meeting name"
                placeholder={DEFAULT_SIMPLE_MEETING_NAME}
                className="nw-simple-meeting-title m-0 w-full min-w-0 appearance-none border-0 bg-transparent p-0 font-[var(--nw-font-display)] text-3xl font-normal tracking-tight text-[var(--nw-ink)] shadow-none outline-none ring-0 placeholder:text-[var(--nw-ink-4)] focus:border-0 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0 md:text-4xl"
              />
              {!(live || processing || starting) ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-[var(--nw-radius-pill)] border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-2.5 py-1 text-xs font-medium text-[var(--nw-ink-3)]">
                    <Calendar className="h-3 w-3" />
                    Today
                  </span>
                </div>
              ) : null}
            </header>

            <div className="flex min-h-0 flex-1 flex-col">
              <NotesEditor
                id="simple-note-body"
                variant="page"
                className="min-h-0 flex-1"
                placeholder="Write notes"
                value={userNotes}
                onChange={setUserNotesDraft}
                aria-label="Write notes"
              />
            </div>

            {error && !isEmptyTranscriptError(error) ? (
              <p
                className="mt-2 shrink-0 text-sm text-[var(--nw-danger)]"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>
        </section>

        {showTranscriptPanel ? (
          <SimpleTranscriptPanel
            turns={turns}
            interim={interim}
            recording={recording}
            paused={paused}
            processing={processing}
            onClose={() => setTranscriptOpen(false)}
          />
        ) : null}
      </div>

      <footer className="shrink-0 border-t border-[var(--nw-border)] px-4 py-3 md:px-6">
        <SimpleTranscriptBar
          recording={recording}
          paused={paused}
          busy={busy}
          phase={phase}
          statusLine={statusLine}
          autoRecording={starting}
          turns={turns}
          interim={interim}
          transcriptOpen={transcriptOpen}
          onTranscriptOpenChange={setTranscriptOpen}
          panelLayout
          onStart={() => void start()}
          onStop={stop}
          onResume={resume}
        />
      </footer>
    </PageMotion>
  );
}
