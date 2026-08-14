import { useRef, useState } from "react";
import { ChevronUp, Mic, Sparkles, Square } from "lucide-react";
import { Waveform } from "../../components/Waveform";
import { CapturePhaseSteps } from "../../components/CapturePhaseSteps";
import type { ProcessPhase } from "../../hooks/useRecorder";
import { SimpleTranscriptPopup } from "./SimpleTranscriptPopup";

type Turn = {
  id: string;
  speaker: string;
  text: string;
};

type Props = {
  recording: boolean;
  paused: boolean;
  busy: boolean;
  phase: ProcessPhase;
  statusLine?: string;
  turns: Turn[];
  interim: string;
  onStart?: () => void;
  onStop: () => void;
  onResume?: () => void;
  autoRecording?: boolean;
  transcriptOpen?: boolean;
  onTranscriptOpenChange?: (open: boolean) => void;
};

export function SimpleTranscriptBar({
  recording,
  paused,
  busy,
  phase,
  statusLine,
  turns,
  interim,
  onStart,
  onStop,
  onResume,
  autoRecording = false,
  transcriptOpen: transcriptOpenProp,
  onTranscriptOpenChange,
}: Props) {
  const live = recording || paused;
  const processing =
    phase === "uploading" ||
    phase === "transcribing" ||
    phase === "speakers" ||
    phase === "notes";
  const transcriptAnchorRef = useRef<HTMLDivElement>(null);
  const [transcriptOpenInternal, setTranscriptOpenInternal] = useState(false);
  const transcriptOpen = transcriptOpenProp ?? transcriptOpenInternal;
  const setTranscriptOpen = onTranscriptOpenChange ?? setTranscriptOpenInternal;

  if (processing) {
    return (
      <div className="flex w-full flex-col gap-2 py-0.5">
        {statusLine ? (
          <p className="m-0 text-center text-xs text-[var(--nw-ink-3)]">
            {statusLine}
          </p>
        ) : null}
        <CapturePhaseSteps phase={phase} />
      </div>
    );
  }

  if (live) {
    return (
      <div className="flex w-full items-center gap-2">
        <div
          ref={transcriptAnchorRef}
          className="nw-simple-transcript-pill relative inline-flex items-center gap-1 rounded-[var(--nw-radius-pill)] border border-[var(--nw-border)] bg-[var(--nw-surface-2)] p-1"
        >
          <span className="grid h-8 w-8 place-items-center text-[var(--nw-success)]">
            <Waveform active={recording && !paused} bars={3} />
          </span>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--nw-ink-3)] transition hover:bg-[var(--nw-glass-bg)] hover:text-[var(--nw-ink)]"
            aria-expanded={transcriptOpen}
            aria-haspopup="dialog"
            aria-label={transcriptOpen ? "Hide transcript" : "Show transcript"}
            onClick={() => setTranscriptOpen(!transcriptOpen)}
          >
            <ChevronUp
              className={`h-4 w-4 transition-transform ${
                transcriptOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--nw-ink-3)] transition hover:bg-[var(--nw-danger-soft)] hover:text-[var(--nw-danger)]"
            aria-label="Stop and generate notes"
            disabled={busy}
            onClick={onStop}
          >
            <Square className="h-3.5 w-3.5" fill="currentColor" />
          </button>
          <SimpleTranscriptPopup
            open={transcriptOpen}
            onClose={() => setTranscriptOpen(false)}
            turns={turns}
            interim={interim}
            recording={recording}
            paused={paused}
            containerRef={transcriptAnchorRef}
          />
        </div>

        {paused && onResume ? (
          <button
            type="button"
            className="px-1 text-xs font-semibold text-[var(--nw-success)]"
            onClick={onResume}
          >
            Resume
          </button>
        ) : null}
      </div>
    );
  }

  if (autoRecording) {
    return (
      <div className="flex w-full items-center justify-center gap-2 rounded-[var(--nw-radius-pill)] border border-[var(--nw-border)] bg-[var(--nw-surface-2)] px-3 py-2.5 text-xs font-semibold text-[var(--nw-ink-3)]">
        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
        Starting capture…
      </div>
    );
  }

  return (
    <button
      type="button"
      className="nw-simple-transcript-pill flex w-full items-center justify-center gap-2 rounded-[var(--nw-radius-pill)] border border-[var(--nw-border)] bg-[var(--nw-surface-2)] px-3 py-2.5 text-xs font-semibold text-[var(--nw-ink-2)] transition hover:border-[var(--nw-accent)] hover:text-[var(--nw-accent-dark)] disabled:opacity-50"
      disabled={busy}
      onClick={onStart}
      aria-label="Start transcription"
    >
      <Mic className="h-3.5 w-3.5" />
      Transcribe
    </button>
  );
}
