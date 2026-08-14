import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { useCaptureSession } from "../../capture/CaptureSessionContext";
import { PageMotion } from "../../components/PageMotion";
import { NotesEditor } from "../../components/notes/NotesEditor";
import { SimpleTranscriptBar } from "./SimpleTranscriptBar";
import {
  clearSimpleCapture,
  isEmptyTranscriptError,
  markSimpleCapture,
} from "./simpleCapture";

export function SimpleNotePage() {
  const navigate = useNavigate();
  const [transcriptOpen, setTranscriptOpen] = useState(false);
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

  useEffect(() => {
    markSimpleCapture();
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
      navigate(`/simple/note/${meetingId}`, { replace: true });
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
      navigate(`/simple/note/${meetingId}?empty=1`, { replace: true });
    }
  }, [phase, meetingId, error, navigate]);

  return (
    <PageMotion className="nw-simple-page nw-page-surface flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto px-4 py-5 md:px-8 md:py-7">
        <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
          <header className="mb-4 shrink-0">
            {!(live || processing || starting) ? (
              <Link
                to="/"
                className="mb-3 inline-block text-xs font-medium text-[var(--nw-ink-4)] hover:text-[var(--nw-accent-dark)]"
              >
                ← Back
              </Link>
            ) : null}
            <h1 className="m-0 font-[var(--nw-font-display)] text-3xl font-normal tracking-tight text-[var(--nw-ink)] md:text-4xl">
              New Meeting
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[var(--nw-radius-pill)] border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-2.5 py-1 text-xs font-medium text-[var(--nw-ink-3)]">
                <Calendar className="h-3 w-3" />
                Today
              </span>
            </div>
          </header>

          <div className="min-h-0 flex-1">
            <NotesEditor
              id="simple-note-body"
              variant="page"
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
      </div>

      <footer className="shrink-0 border-t border-[var(--nw-border)] px-4 py-3 md:px-8">
        <div className="mx-auto max-w-2xl">
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
            onStop={stop}
            onResume={resume}
          />
        </div>
      </footer>
    </PageMotion>
  );
}
