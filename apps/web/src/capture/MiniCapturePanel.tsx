import { Button } from "@notewise/ui";
import {
  Maximize2,
  Mic,
  Pause,
  Play,
  Square,
  StickyNote,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCaptureSession } from "./CaptureSessionContext";
import {
  createCaptureChannel,
  isCaptureActive,
  type CaptureSyncMessage,
} from "./miniCaptureSync";
import { focusMainWindow } from "./desktopMiniWindow";
import { MINI_LAYOUT_EVENT, resizeDocumentPipWindow } from "./documentPip";

const COMPACT_HEIGHT = 300;
const EXPANDED_HEIGHT = 560;
const MINI_WIDTH = 380;

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function MiniCapturePanel({
  compact = false,
  onExpand,
}: {
  compact?: boolean;
  onExpand?: () => void;
}) {
  const session = useCaptureSession();
  const {
    recording,
    paused,
    busy,
    elapsed,
    turns,
    interim,
    statusLine,
    userNotes,
    notes,
    error,
    togglePause,
    stop,
    setUserNotesDraft,
  } = session;
  const [expanded, setExpanded] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const active = isCaptureActive({ recording, paused });
  const visibleTurns = expanded ? turns.slice(-12) : turns.slice(-4);
  const beatCount = turns.length + (interim ? 1 : 0);

  useEffect(() => {
    resizeDocumentPipWindow(MINI_WIDTH, expanded ? EXPANDED_HEIGHT : COMPACT_HEIGHT);
    window.dispatchEvent(
      new CustomEvent(MINI_LAYOUT_EVENT, { detail: { expanded } }),
    );
  }, [expanded]);

  useEffect(() => {
    if (!transcriptRef.current || !expanded) return;
    transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [turns.length, interim, expanded]);

  if (!active && !busy) {
    return (
      <div className="nw-mini-panel flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <p className="m-0 text-sm font-semibold text-[var(--nw-ink-2)]">No active capture</p>
        <p className="m-0 text-xs text-[var(--nw-ink-4)]">{statusLine}</p>
      </div>
    );
  }

  return (
    <div
      className={`nw-mini-panel flex h-full min-h-0 flex-col ${compact ? "p-2.5" : "p-3"} ${
        expanded ? "nw-mini-panel--expanded" : ""
      }`}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--nw-border)] pb-2">
        <button
          type="button"
          className={`grid h-8 w-8 place-items-center rounded-xl transition ${
            recording
              ? "bg-[rgb(220_38_38_/_0.12)] text-[rgb(185_28_28)]"
              : "bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]"
          } ${beatCount ? "ring-2 ring-[rgb(var(--nw-accent-rgb)_/_0.25)]" : ""}`}
          title={expanded ? "Collapse" : "Show transcript & notes"}
          aria-label={expanded ? "Collapse panel" : "Show transcript and notes"}
          aria-pressed={expanded}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {recording ? (
            <span className="nw-pulse-dot !bg-[rgb(220_38_38)]" />
          ) : (
            <Pause className="h-3.5 w-3.5" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="m-0 font-mono text-lg font-semibold tabular-nums text-[var(--nw-ink)]">
            {formatTimer(elapsed)}
          </p>
          <p className="m-0 truncate text-[0.65rem] text-[var(--nw-ink-3)]">
            {paused
              ? "Paused"
              : recording
                ? expanded
                  ? "Live transcript + notes"
                  : "Live · tap pulse to expand"
                : statusLine}
          </p>
        </div>
        <button
          type="button"
          className="nw-mini-icon-btn"
          title="Back to full Capture"
          aria-label="Back to full Capture"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onExpand) {
              onExpand();
              return;
            }
            const ch = createCaptureChannel();
            ch?.postMessage({
              kind: "command",
              command: { type: "focus-main" },
            } satisfies CaptureSyncMessage);
            ch?.close();
            void focusMainWindow();
          }}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </header>

      {expanded ? (
        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-[var(--nw-surface-2)] ring-1 ring-[var(--nw-border)]">
            <div className="shrink-0 border-b border-[var(--nw-border)] px-2.5 py-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-3)]">
              Live transcript
            </div>
            <div
              ref={transcriptRef}
              className="nw-mini-transcript min-h-0 flex-1 overflow-auto px-2.5 py-2"
            >
              {visibleTurns.length === 0 && !interim ? (
                <p className="m-0 text-xs text-[var(--nw-ink-4)]">
                  <Mic className="mr-1 inline h-3 w-3" />
                  Waiting for speech…
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {visibleTurns.map((t) => (
                    <li key={t.id} className="text-xs leading-snug text-[var(--nw-ink-2)]">
                      <span className="font-semibold text-[var(--nw-accent-dark)]">
                        {t.speaker}:{" "}
                      </span>
                      {t.text}
                    </li>
                  ))}
                  {interim ? (
                    <li className="text-xs italic leading-snug text-[var(--nw-ink-4)]">{interim}</li>
                  ) : null}
                </ul>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-[var(--nw-surface-solid)] ring-1 ring-[var(--nw-border)]">
            <div className="flex shrink-0 items-center gap-1 border-b border-[var(--nw-border)] px-2.5 py-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-3)]">
              <StickyNote className="h-3 w-3" />
              Notes
            </div>
            {notes?.executiveSummary ? (
              <p className="m-0 shrink-0 border-b border-[var(--nw-border)] px-2.5 py-2 text-[0.68rem] leading-relaxed text-[var(--nw-ink-3)]">
                {notes.executiveSummary}
              </p>
            ) : null}
            <textarea
              className="nw-page-input m-0 min-h-[88px] w-full flex-1 resize-none border-0 bg-transparent px-2.5 py-2 text-xs text-[var(--nw-ink)] outline-none"
              placeholder="Jot notes while you talk…"
              value={userNotes}
              onChange={(e) => setUserNotesDraft(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          <div className="mb-1 inline-flex items-center gap-1 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-3)]">
            <StickyNote className="h-3 w-3" />
            Live notes
          </div>
          <textarea
            className="nw-page-input min-h-[72px] w-full flex-1 resize-none rounded-xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-2.5 py-2 text-xs text-[var(--nw-ink)] outline-none"
            placeholder="Jot notes while you talk…"
            value={userNotes}
            onChange={(e) => setUserNotesDraft(e.target.value)}
          />
        </div>
      )}

      {error ? (
        <p className="mt-1.5 shrink-0 text-[0.65rem] text-[var(--nw-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-2 flex shrink-0 gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          disabled={busy || (!recording && !paused)}
          onClick={togglePause}
        >
          {paused ? (
            <>
              <Play className="h-3.5 w-3.5" />
              Resume
            </>
          ) : (
            <>
              <Pause className="h-3.5 w-3.5" />
              Pause
            </>
          )}
        </Button>
        <Button size="sm" variant="danger" className="flex-1" disabled={busy} onClick={() => void stop()}>
          <Square className="h-3.5 w-3.5" fill="currentColor" />
          Stop
        </Button>
      </div>
    </div>
  );
}
