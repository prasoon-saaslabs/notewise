import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, SpeakerChip } from "@notewise/ui";
import {
  ArrowRight,
  CheckSquare,
  Headphones,
  Mic,
  Pause,
  PictureInPicture2,
  Play,
  Sparkles,
  Square,
} from "lucide-react";
import { api } from "../../lib/api";
import { isPyaiBackend } from "../../lib/backend";
import { PageMotion } from "../../components/PageMotion";
import { Waveform } from "../../components/Waveform";
import { useCaptureSession } from "../../capture/CaptureSessionContext";
import type { ProcessPhase } from "../../hooks/useRecorder";
import { RecordIntelligencePanel } from "../../components/RecordIntelligencePanel";
import { NotesEditor } from "../../components/notes/NotesEditor";
import { usePersistedUserNotes } from "../../components/notes/usePersistedUserNotes";
import { ClaimLine } from "../../components/Receipts";
import { ChannelMeters } from "../../components/ChannelMeters";
import { UpcomingMeetingsPanel } from "../../components/UpcomingMeetingsPanel";
import { isDesktopShell } from "../../capture/desktopMiniWindow";
import { openScreenRecordingSettings } from "../../lib/desktopPermissions";
function isMicOnlyNotice(error: string | null) {
  if (!error) return false;
  return /mic only|screen recording|meeting audio skipped/i.test(error);
}

function isEmptyTranscriptError(error: string | null) {
  if (!error) return false;
  return (
    error.includes("EMPTY_TRANSCRIPT") ||
    error.includes("PYAI_RATE_LIMIT") ||
    /no transcript produced/i.test(error) ||
    /no speech was captured/i.test(error) ||
    /daily cap reached/i.test(error)
  );
}

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const PHASES: Array<{ id: ProcessPhase; label: string }> = [
  { id: "uploading", label: "Upload" },
  { id: "transcribing", label: "Transcribe" },
  { id: "speakers", label: "Speakers" },
  { id: "notes", label: "Notes" },
];

function phaseIndex(phase: ProcessPhase) {
  const order: ProcessPhase[] = [
    "uploading",
    "transcribing",
    "speakers",
    "notes",
    "ready",
  ];
  return order.indexOf(phase);
}

export function RecordPage() {
  const pyai = isPyaiBackend();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [notesRegenerating, setNotesRegenerating] = useState(false);
  const [notesRevealKey, setNotesRevealKey] = useState(0);
  const prevRegeneratingRef = useRef(false);
  const {
    recording,
    paused,
    busy,
    elapsed,
    meetingId,
    sessionId,
    turns,
    notes,
    error,
    statusLine,
    phase,
    interim,
    userNotes,
    meters,
    toggle,
    togglePause,
    setUserNotesDraft,
    applyMeetingTranscript,
    openMiniSurface,
  } = useCaptureSession();

  const processing = [
    "uploading",
    "transcribing",
    "speakers",
    "notes",
  ].includes(phase);
  const idx = phaseIndex(phase);
  const sessionLive = recording || paused;
  const emptyTranscript = phase === "failed" && isEmptyTranscriptError(error);
  const blockingError = error && !isMicOnlyNotice(error) ? error : null;
  const persistedUserNotes = usePersistedUserNotes({
    meetingId,
    backend: pyai ? "pyai" : "nest",
    sourceValue: userNotes,
    onSessionSync: setUserNotesDraft,
    enabled: Boolean(meetingId),
  });
  const showScratchpad =
    sessionLive ||
    Boolean(notes) ||
    Boolean(userNotes.trim()) ||
    (!processing && pyai);
  const scratchpadValue = meetingId ? persistedUserNotes.draft : userNotes;
  const onScratchpadChange = meetingId
    ? persistedUserNotes.handleChange
    : setUserNotesDraft;

  useEffect(() => {
    if (prevRegeneratingRef.current && !notesRegenerating) {
      setNotesRevealKey((k) => k + 1);
    }
    prevRegeneratingRef.current = notesRegenerating;
  }, [notesRegenerating]);

  useEffect(() => {
    if (!transcriptRef.current) return;
    transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [turns.length, interim]);

  return (
    <PageMotion className="nw-capture nw-card relative flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className="nw-capture-glow pointer-events-none absolute inset-0"
        aria-hidden
      />

      {/* Control strip: status left, actions flush right (stacks only on narrow phones) */}
      <header className="nw-capture-toolbar relative z-10 border-b border-[var(--nw-glass-border)] bg-[var(--nw-glass-bg)] px-3 py-2.5 backdrop-blur-md sm:px-4 md:px-5 md:py-3">
        <div className="nw-capture-status flex min-w-0 items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            className={`nw-capture-mic shrink-0 ${recording ? "is-live" : ""} ${
              paused ? "is-paused" : ""
            }`}
            onClick={toggle}
            disabled={busy}
            aria-pressed={sessionLive}
            aria-label={sessionLive ? "Stop capture" : "Start capture"}
          >
            {sessionLive ? (
              <Square className="h-4 w-4" fill="currentColor" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>

          <div className="min-w-0 flex-1 sm:flex-none">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <p className="m-0 font-mono text-xl font-semibold tracking-tight text-[var(--nw-ink)] tabular-nums sm:text-2xl md:text-[1.75rem]">
                {formatTimer(elapsed)}
              </p>
              {recording ? (
                <span className="nw-live-pill inline-flex items-center gap-1.5 rounded-[var(--nw-radius-pill)] bg-[rgb(220_38_38_/_0.1)] px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-[rgb(185_28_28)]">
                  <span className="nw-pulse-dot !bg-[rgb(220_38_38)]" />
                  Live
                </span>
              ) : paused ? (
                <span className="inline-flex items-center gap-1 rounded-[var(--nw-radius-pill)] bg-[var(--nw-accent-soft)] px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-accent-dark)]">
                  <Pause className="h-3 w-3" />
                  Paused
                </span>
              ) : phase === "ready" ? (
                <span className="inline-flex items-center gap-1 rounded-[var(--nw-radius-pill)] bg-[var(--nw-success-soft)] px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-success)]">
                  <Sparkles className="h-3 w-3" />
                  Ready
                </span>
              ) : processing ? (
                <span className="inline-flex items-center gap-1.5 rounded-[var(--nw-radius-pill)] bg-[var(--nw-accent-soft)] px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-accent-dark)]">
                  <span className="nw-pulse-dot" />
                  Processing
                </span>
              ) : null}
              <span className="hidden rounded-[var(--nw-radius-pill)] bg-[var(--nw-surface-2)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-[var(--nw-ink-3)] sm:inline">
                {pyai ? "PyAI" : "Whisper"}
              </span>
            </div>
            <p className="m-0 mt-0.5 max-w-[16rem] truncate text-[0.7rem] text-[var(--nw-ink-3)] sm:max-w-xs sm:text-xs md:max-w-md">
              {statusLine}
            </p>
          </div>

          <div className="nw-capture-wave ml-2 hidden min-w-0 flex-1 md:block">
            {sessionLive ? (
              <ChannelMeters
                mic={meters.mic}
                system={meters.system}
                backend={meters.backend}
              />
            ) : (
              <Waveform active={recording || processing} bars={16} />
            )}
          </div>
        </div>

        <div className="nw-capture-actions flex flex-wrap items-center justify-end gap-2">
          {sessionLive ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={togglePause}
              className="nw-capture-action-btn"
              aria-label={paused ? "Resume" : "Pause"}
            >
              {paused ? (
                <Play className="h-3.5 w-3.5" />
              ) : (
                <Pause className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {paused ? "Resume" : "Pause"}
              </span>
            </Button>
          ) : null}

          {sessionLive ? (
            <Button
              size="sm"
              variant="ghost"
              className="nw-capture-action-btn nw-capture-pip-btn"
              title="Picture in picture"
              aria-label="Picture in picture"
              onClick={() => void openMiniSurface()}
            >
              <PictureInPicture2 className="h-4 w-4" />
              <span className="hidden lg:inline">Pop out</span>
            </Button>
          ) : null}

          <Button
            variant={sessionLive ? "danger" : "primary"}
            onClick={toggle}
            disabled={busy}
            aria-busy={busy}
            className="nw-capture-cta nw-capture-primary-btn"
          >
            {busy && !sessionLive ? (
              <>
                <span className="nw-pulse-dot !bg-[var(--nw-surface-solid)]" />
                <span>Working…</span>
              </>
            ) : sessionLive ? (
              <>
                <Square className="h-3.5 w-3.5" fill="currentColor" />
                <span className="sm:hidden">Stop</span>
                <span className="hidden sm:inline">Stop & notes</span>
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5" />
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Start listening</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {(processing || phase === "ready") && (
        <div className="relative z-10 flex flex-wrap items-center gap-2 border-b border-[var(--nw-border)] bg-[var(--nw-surface-2)]/60 px-4 py-2 md:px-5">
          {PHASES.map((step, i) => {
            const done = phase === "ready" || i < idx;
            const active = step.id === phase;
            return (
              <div
                key={step.id}
                className={`nw-capture-phase inline-flex items-center gap-1.5 rounded-[var(--nw-radius-pill)] px-2.5 py-1 text-[0.68rem] font-semibold ${
                  active
                    ? "bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]"
                    : done
                    ? "bg-[var(--nw-success-soft)] text-[var(--nw-success)]"
                    : "bg-[var(--nw-surface-solid)] text-[var(--nw-ink-4)]"
                }`}
              >
                <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--nw-glass-bg-strong)] text-[0.55rem] font-bold">
                  {done && !active ? "✓" : i + 1}
                </span>
                {step.label}
                {active ? <span className="nw-pulse-dot" /> : null}
              </div>
            );
          })}
        </div>
      )}

      {emptyTranscript ? (
        <div
          className="nw-empty-transcript relative z-10 mx-4 mt-3 md:mx-5"
          role="status"
        >
          <div className="flex items-start gap-3 rounded-2xl border border-[rgb(var(--nw-accent-rgb)_/_0.18)] nw-cta-gradient px-4 py-4 shadow-[0_8px_24px_rgb(15_23_42_/_0.04)]">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]">
              <Headphones className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="m-0 text-sm font-semibold tracking-tight text-[var(--nw-ink)]">
                No speech was captured
              </p>
              <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--nw-ink-3)]">
                We didn’t pick up any speech. Make sure your mic can hear the
                room (or play audio through speakers), then try again.
              </p>
              <div className="mt-3">
                <Button size="sm" onClick={() => toggle()}>
                  <Mic className="h-3.5 w-3.5" />
                  Record again
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : blockingError ? (
        <div className="relative z-10 mx-4 mt-3 md:mx-5" role="alert">
          <div className="flex items-start gap-3 rounded-2xl border border-[rgb(185_28_28_/_0.2)] bg-[rgb(254_242_242)] px-4 py-3 shadow-sm">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[rgb(185_28_28)]">
              <Mic className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-sm font-semibold text-[rgb(127_29_29)]">
                Something went wrong
              </p>
              <p className="m-0 mt-1 text-sm leading-relaxed text-[rgb(153_27_27)]">
                {blockingError}
              </p>
              {isDesktopShell() &&
              /microphone|screen recording/i.test(blockingError) ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void openScreenRecordingSettings()}
                  >
                    Open System Settings
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Dual pane: notes + transcript — product core */}
      <div className="relative z-10 grid min-h-0 flex-1 lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
        {/* Notes — Margin-style notepad */}
        <section className="nw-capture-notes flex min-h-0 flex-col border-b border-[var(--nw-border)] lg:border-b-0 lg:border-r nw-surface-gradient">
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 md:px-5">
            <div className="flex items-center gap-2">
              {/* <StickyNote className="h-3.5 w-3.5 text-[rgb(180_83_9)]" /> */}
              {/* <h3 className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
                Notes
              </h3> */}
            </div>
            {/* <span className="text-[0.62rem] font-semibold uppercase tracking-wider text-[var(--nw-ink-4)]">
              {notes ? "AI outcomes" : "type while listening"}
            </span> */}
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-4 pb-5 md:px-5">
            {processing && !notes ? (
              <div className="nw-capture-ai-wait space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--nw-accent-dark)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Building meeting intelligence…
                </div>
                <div className="nw-skeleton w-4/5" />
                <div className="nw-skeleton w-full" />
                <div className="nw-skeleton w-3/5" />
                <div className="nw-skeleton mt-4 w-2/5" />
                <div className="nw-skeleton w-full" />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <RecordIntelligencePanel
                  sessionLive={sessionLive}
                  phase={phase}
                  hasNotes={Boolean(notes)}
                  meetingId={meetingId}
                  sessionId={sessionId}
                  userNotes={scratchpadValue}
                  onNotesUpdated={applyMeetingTranscript}
                  onRegeneratingChange={setNotesRegenerating}
                />

                {notes && notesRegenerating ? null : notes ? (
                  <div
                    key={notesRevealKey}
                    className="nw-capture-intel nw-notes-reveal flex flex-col gap-3"
                  >
                    <div className="rounded-2xl border border-[rgb(var(--nw-accent-rgb)_/_0.16)] bg-gradient-to-br from-[rgb(var(--nw-accent-rgb)_/_0.08)] via-[var(--nw-surface-solid)] to-[var(--nw-surface-solid)] p-3.5 shadow-[0_1px_0_var(--nw-glass-shadow)]">
                      <div className="mb-2 flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[var(--nw-accent-dark)]">
                        <Sparkles className="h-3.5 w-3.5" />
                        Summary
                      </div>
                      {notes.title ? (
                        <p className="mb-1.5 mt-0 text-[0.95rem] font-semibold tracking-tight text-[var(--nw-ink)]">
                          {notes.title}
                        </p>
                      ) : null}
                      {notes.executiveSummary ? (
                        <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-[var(--nw-ink-2)]">
                          {notes.executiveSummary}
                        </p>
                      ) : (
                        <p className="m-0 text-sm text-[var(--nw-ink-4)]">
                          No summary yet.
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[rgb(225_29_72_/_0.14)] bg-gradient-to-br from-[rgb(225_29_72_/_0.06)] via-[var(--nw-surface-solid)] to-[var(--nw-surface-solid)] p-3.5">
                      <div className="mb-2 flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[rgb(190_18_60)]">
                        <CheckSquare className="h-3.5 w-3.5" />
                        Action items
                      </div>
                      {(notes.actions ?? []).length === 0 ? (
                        <p className="m-0 text-sm text-[var(--nw-ink-4)]">
                          None detected
                        </p>
                      ) : (
                        <ul className="m-0 flex list-none flex-col gap-2 p-0">
                          {(notes.actions ?? []).map((a, i) => (
                            <ClaimLine
                              key={`${a.text}-${i}`}
                              claim={a}
                              onJump={(lineId) => {
                                if (!lineId) return;
                                document
                                  .getElementById(`line-${lineId}`)
                                  ?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center",
                                  });
                              }}
                            />
                          ))}
                        </ul>
                      )}
                    </div>

                    {(notes.objections ?? []).length > 0 ? (
                      <div className="rounded-2xl border border-[rgb(225_29_72_/_0.14)] bg-[var(--nw-glass-bg-strong)] p-3.5">
                        <p className="mb-2 mt-0 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[rgb(190_18_60)]">
                          Objections
                        </p>
                        <ul className="m-0 flex list-none flex-col gap-2 p-0">
                          {notes.objections!.map((o) => (
                            <ClaimLine
                              key={o.id}
                              claim={o}
                              onJump={(lineId) => {
                                if (!lineId) return;
                                document
                                  .getElementById(`line-${lineId}`)
                                  ?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center",
                                  });
                              }}
                            />
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {(notes.takeaways ?? []).length > 0 ? (
                      <div className="rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-glass-bg-strong)] p-3.5">
                        <p className="mb-2 mt-0 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[var(--nw-ink-3)]">
                          Takeaways
                        </p>
                        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                          {(notes.takeaways ?? []).map((t) => (
                            <li
                              key={t}
                              className="relative pl-3.5 text-sm leading-relaxed text-[var(--nw-ink-2)] before:absolute before:left-0 before:top-[0.55em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-[var(--nw-accent)]"
                            >
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {meetingId ? (
                      <Link
                        to={`/library/${meetingId}`}
                        className="nw-library-cta group relative mt-1 flex overflow-hidden rounded-2xl border border-[rgb(var(--nw-accent-rgb)_/_0.28)] bg-[rgb(var(--nw-accent-rgb)_/_0.1)] px-4 py-3.5 backdrop-blur-md shadow-[0_4px_20px_rgb(var(--nw-accent-rgb)_/_0.08)] transition hover:border-[rgb(var(--nw-accent-rgb)_/_0.4)] hover:bg-[rgb(var(--nw-accent-rgb)_/_0.16)]"
                      >
                        <div className="flex w-full items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[rgb(var(--nw-accent-rgb)_/_0.2)] bg-[var(--nw-glass-bg-strong)] text-[var(--nw-accent-dark)] backdrop-blur-sm">
                            <Sparkles className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1 text-left">
                            <p className="m-0 text-sm font-semibold tracking-tight text-[var(--nw-accent-dark)]">
                              Open in Library
                            </p>
                            <p className="m-0 mt-0.5 text-xs text-[var(--nw-ink-3)]">
                              Full transcript, notes, and actions for this
                              meeting
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--nw-accent-dark)] transition group-hover:translate-x-0.5" />
                        </div>
                      </Link>
                    ) : null}
                  </div>
                ) : !recording && !processing ? (
                  // <EmptyState
                  //   title="Notes stay beside the call"
                  //   description="Jot fragments while listening. After stop, we turn speech + your notes into summary and actions."
                  //   compact
                  // />
                  <></>
                ) : null}
              </div>
            )}
          </div>
          <div className="shrink-0 px-4 pb-4 pt-3 md:px-5">
            <UpcomingMeetingsPanel />
          </div>
        </section>
        {/* Live transcript */}
        <section className="flex min-h-0 flex-col border-b border-[var(--nw-border)] lg:border-b-0">
          <div className="flex items-center gap-2 px-4 py-2.5 md:px-5">
            <h3 className="m-0 text-sm font-medium text-[var(--nw-accent)]">
              Live transcript
            </h3>
            <div className="ml-auto flex gap-1">
              <SpeakerChip label="You" kind="you" />
              <SpeakerChip label="Others" kind="other" />
            </div>
          </div>

          <div
            className={`grid min-h-0 flex-1 ${
              showScratchpad ? "grid-rows-2" : "grid-rows-1"
            }`}
          >
            <div
              ref={transcriptRef}
              className="nw-capture-scroll min-h-0 overflow-auto px-4 pb-5 md:px-5"
              aria-live="polite"
            >
              {turns.length === 0 && !interim ? (
                <div className="nw-capture-empty flex h-full flex-col items-center justify-center px-6 py-8 text-center">
                  <div className="nw-capture-empty-orb mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--nw-accent-soft)] text-[var(--nw-accent)]">
                    <Mic className="h-5 w-5" />
                  </div>
                  <p className="m-0 text-base font-semibold tracking-tight text-[var(--nw-ink)]">
                    Ready when you are
                  </p>
                </div>
              ) : (
                <div className="mx-auto flex max-w-3xl flex-col gap-1 pt-1">
                  {turns.map((t, i) => {
                    const prev = turns[i - 1];
                    const sameSpeaker =
                      prev &&
                      prev.speaker === t.speaker &&
                      prev.kind === t.kind;
                    return (
                      <article
                        key={t.id}
                        id={`line-${t.id}`}
                        className={`nw-caption-line ${
                          sameSpeaker ? "pt-0.5" : "pt-3"
                        }`}
                        style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}
                      >
                        {!sameSpeaker ? (
                          <div className="mb-1 flex items-center gap-2">
                            <SpeakerChip
                              label={t.speaker}
                              kind={t.kind}
                              live={t.live}
                            />
                            {pyai &&
                            phase === "ready" &&
                            meetingId &&
                            t.kind !== "you" &&
                            t.speaker !== "You" ? (
                              <button
                                type="button"
                                className="ml-auto text-[0.65rem] font-semibold text-[var(--nw-accent-dark)] underline"
                                onClick={() => {
                                  void api
                                    .bindSpeaker(meetingId, t.speaker)
                                    .then(async () => {
                                      const detail = await api.getMeeting(
                                        meetingId
                                      );
                                      applyMeetingTranscript(detail);
                                    });
                                }}
                              >
                                This is me
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                        <p
                          className={`m-0 text-[0.95rem] leading-[1.55] tracking-[-0.01em] ${
                            t.kind === "you"
                              ? "text-[var(--nw-ink)]"
                              : "text-[var(--nw-ink-2)]"
                          }`}
                        >
                          {t.text}
                        </p>
                      </article>
                    );
                  })}
                  {interim ? (
                    <article className="nw-caption-interim pt-3">
                      <p className="m-0 flex items-start gap-2 text-[0.95rem] italic leading-[1.55] text-[var(--nw-ink-3)]">
                        <span
                          className="nw-pulse-dot mt-2 shrink-0"
                          aria-hidden
                        />
                        <span>{interim}</span>
                      </p>
                    </article>
                  ) : null}
                </div>
              )}
            </div>
            {showScratchpad ? (
              <div className="flex min-h-0 flex-1 flex-col border-t border-[var(--nw-border)] px-4 pb-4 pt-3 md:px-5">
                <div className="mb-1.5 flex shrink-0 items-baseline justify-between gap-2">
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--nw-ink-4)]">
                    {notes ? "Your notes" : "Your scratchpad"}
                  </span>
                  {meetingId && persistedUserNotes.saveHint === "saving" ? (
                    <span className="text-[0.65rem] text-[var(--nw-ink-4)]">
                      Saving…
                    </span>
                  ) : meetingId && persistedUserNotes.saveHint === "error" ? (
                    <span className="text-[0.65rem] text-[var(--nw-danger)]">
                      Could not save
                    </span>
                  ) : null}
                </div>
                <NotesEditor
                  variant="capture"
                  height="100%"
                  className="min-h-0 flex-1"
                  placeholder="pricing pushback?? · follow up Tuesday · send proposal…"
                  value={scratchpadValue}
                  onChange={onScratchpadChange}
                  disabled={processing}
                  aria-label={notes ? "Your notes" : "Your scratchpad"}
                />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </PageMotion>
  );
}
