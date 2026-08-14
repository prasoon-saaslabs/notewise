import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { EmptyState, SpeakerChip } from "@notewise/ui";
import {
  Download,
  FileText,
  RefreshCw,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import type { MeetingBackend } from "@notewise/api-client";
import {
  clientForBackend,
  displayMeetingTitle,
  getCatalogMeeting,
  listAllMeetings,
} from "../../lib/meetingsCatalog";
import { MeetingNotesIntelligence } from "../../components/MeetingNotesIntelligence";
import { DeleteMeetingModal } from "../../components/DeleteMeetingModal";
import {
  usePersistedUserNotes,
} from "../../components/notes/usePersistedUserNotes";
import { api } from "../../lib/api";
import { formatMeetingListWhen, formatWhen } from "../../lib/calendarFormat";
import { ensureDesktopGateway } from "../../lib/desktopGateway";
import { isDesktopPyaiOnly } from "../../lib/desktopMode";
import { RegeneratingNotes } from "../../components/RegeneratingNotes";
import { PageMotion } from "../../components/PageMotion";
import { MeetingAudioPlayer } from "../../components/MeetingAudioPlayer";

/** Ready meetings always; failed ones if they have transcript to rebuild from. */
function meetingCanRegenerate(status?: string, transcriptLen = 0) {
  if (status === "ready") return true;
  if (status === "failed" && transcriptLen > 0) return true;
  return false;
}

function BackendTag({ backend }: { backend?: MeetingBackend | string | null }) {
  const b = backend === "pyai" || backend === "nest" ? backend : null;
  if (!b) return null;
  const pyai = b === "pyai";
  return (
    <span
      className={`nw-chip-pop shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${
        pyai
          ? "bg-[rgb(var(--nw-accent-rgb)_/_0.14)] text-[var(--nw-accent-dark)] ring-1 ring-[rgb(var(--nw-accent-rgb)_/_0.2)]"
          : "bg-[rgb(100_116_139_/_0.1)] text-[var(--nw-ink-3)] ring-1 ring-[rgb(100_116_139_/_0.15)]"
      }`}
      title={
        pyai ? "Captured via PyAI gateway" : "Captured via Nest + ai-worker"
      }
    >
      {pyai ? "PyAI" : "Nest"}
    </span>
  );
}

const BOT_STEPS = [
  { id: "bot_joining", label: "Bot joining lobby" },
  { id: "bot_live", label: "Live capture in call" },
  { id: "processing", label: "Generate ERP notes" },
  { id: "ready", label: "Notes ready" },
] as const;

function botStepIndex(status: string) {
  const order = ["bot_joining", "bot_live", "processing", "ready"];
  const i = order.indexOf(status);
  return i < 0 ? (status === "failed" ? -1 : 0) : i;
}

export function LibraryPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showTranscript, setShowTranscript] = useState(true);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [q, setQ] = useState("");
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const list = useQuery({
    queryKey: ["meetings", "catalog"],
    queryFn: async () => {
      if (isDesktopPyaiOnly()) {
        const diag = await ensureDesktopGateway();
        if (!diag.reachable) {
          throw new Error(
            "Local AI gateway is not running. Restart Notewise or check gateway.log in Application Support."
          );
        }
      }
      return listAllMeetings();
    },
    refetchInterval: 4000,
  });
  const fts = useQuery({
    queryKey: ["meetings", "search", q],
    queryFn: () => api.searchMeetings(q.trim()),
    enabled: q.trim().length >= 2,
  });

  const meetings =
    q.trim().length >= 2 && fts.data
      ? fts.data
      : (list.data ?? []).filter((m) => {
          if (!q.trim()) return true;
          const hay = `${m.title} ${m.snippet || ""}`.toLowerCase();
          return hay.includes(q.trim().toLowerCase());
        });
  const selectedId = id ?? meetings[0]?.id;
  const selectedBackend = meetings.find((m) => m.id === selectedId)?.backend;

  const detail = useQuery({
    queryKey: ["meeting", selectedBackend ?? "any", selectedId],
    queryFn: () => getCatalogMeeting(selectedId!, selectedBackend),
    enabled: Boolean(selectedId),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      if (s === "processing" || s === "bot_live" || s === "bot_joining")
        return 1200;
      return false;
    },
  });

  const meeting = detail.data;
  const meetingBackend: MeetingBackend =
    meeting?.backend === "pyai" || meeting?.backend === "nest"
      ? meeting.backend
      : selectedBackend ?? "nest";

  const remove = useMutation({
    mutationFn: (mid: string) =>
      clientForBackend(meetingBackend).deleteMeeting(mid),
    onSuccess: () => {
      setDeleteOpen(false);
      void qc.invalidateQueries({ queryKey: ["meetings", "catalog"] });
      navigate("/library");
    },
  });

  const stopBot = useMutation({
    mutationFn: (mid: string) => clientForBackend(meetingBackend).stopBot(mid),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["meeting", meetingBackend, selectedId],
      });
      void qc.invalidateQueries({ queryKey: ["meetings", "catalog"] });
    },
  });

  const syncBot = useMutation({
    mutationFn: (mid: string) =>
      clientForBackend(meetingBackend).syncBotMeeting(mid),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["meeting", meetingBackend, selectedId],
      });
      void qc.invalidateQueries({ queryKey: ["meetings", "catalog"] });
    },
  });

  const refreshNotes = useMutation({
    mutationFn: (mid: string) =>
      clientForBackend(meetingBackend).regenerateNotes(mid, {
        userNotes: detail.data?.userNotes ?? undefined,
      }),
    onMutate: () => {
      setRegenError(null);
      void qc.setQueryData(
        ["meeting", meetingBackend, selectedId],
        (prev: typeof detail.data | undefined) =>
          prev ? { ...prev, status: "processing" as const } : prev
      );
    },
    onSuccess: () => {
      setRegenError(null);
      void qc.invalidateQueries({
        queryKey: ["meeting", meetingBackend, selectedId],
      });
      void qc.invalidateQueries({ queryKey: ["meetings", "catalog"] });
    },
    onError: (err: Error) =>
      setRegenError(err.message || "Could not regenerate notes"),
  });

  const saveMeeting = useMutation({
    mutationFn: ({
      mid,
      title,
      userNotes,
    }: {
      mid: string;
      title?: string;
      userNotes?: string;
    }) =>
      clientForBackend(meetingBackend).updateMeeting(mid, { title, userNotes }),
    onSuccess: () => {
      setEditingTitle(false);
      setDownloadOpen(false);
      void qc.invalidateQueries({
        queryKey: ["meeting", meetingBackend, selectedId],
      });
      void qc.invalidateQueries({ queryKey: ["meetings", "catalog"] });
    },
  });

  const rename = saveMeeting;

  const persistedUserNotes = usePersistedUserNotes({
    meetingId: meeting?.id,
    backend: meetingBackend,
    sourceValue: meeting?.userNotes ?? "",
    queryKey: ["meeting", meetingBackend, selectedId],
    enabled: Boolean(meeting?.id),
  });

  const canRegenerate = meetingCanRegenerate(
    meeting?.status,
    meeting?.transcript?.length ?? 0
  );
  const isRegenerating =
    refreshNotes.isPending ||
    (meeting?.status === "processing" && Boolean(meeting?.transcript?.length));
  const botActive =
    meeting?.source === "bot" &&
    (meeting.status === "bot_joining" ||
      meeting.status === "bot_live" ||
      meeting.status === "processing");
  const stepIdx = meeting ? botStepIndex(meeting.status) : 0;

  useEffect(() => {
    setRegenError(null);
    setEditingTitle(false);
  }, [selectedId]);

  useEffect(() => {
    const state = location.state as { jumpLineId?: string } | null;
    const jumpLineId = state?.jumpLineId;
    if (!jumpLineId || !meeting || meeting.id !== id) return;
    setShowTranscript(true);
    const scroll = () => {
      document.getElementById(`line-${jumpLineId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    };
    window.requestAnimationFrame(() => {
      scroll();
      window.setTimeout(scroll, 350);
    });
    navigate(location.pathname, { replace: true, state: {} });
  }, [meeting?.id, id, location.pathname, location.state, navigate]);

  useEffect(() => {
    if (meeting?.status === "bot_live" || meeting?.status === "bot_joining") {
      transcriptEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [meeting?.transcript?.length, meeting?.status]);

  return (
    <PageMotion className="nw-card grid h-full min-h-0 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="nw-library-rail flex min-h-0 flex-col border-b border-[var(--nw-border)] md:border-b-0 md:border-r">
        <div className="border-b border-[var(--nw-border)] px-4 py-3.5">
          <h3 className="nw-section-title flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[var(--nw-accent-dark)]" />
            Meeting intelligence
          </h3>
          <input
            className="mt-2 w-full rounded-lg border border-[var(--nw-border)] px-2 py-1 text-xs"
            placeholder="Search title & notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <p className="nw-muted m-0 mt-2">
            {list.isError
              ? "Could not load meetings"
              : isDesktopPyaiOnly()
              ? `${meetings.length} meeting${meetings.length === 1 ? "" : "s"}`
              : `${meetings.length} across Nest & PyAI`}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {list.isError ? (
            <EmptyState
              title="Library unavailable"
              description={
                list.error instanceof Error
                  ? list.error.message
                  : isDesktopPyaiOnly()
                  ? "Start the local PyAI gateway (port 3002), then refresh."
                  : "Start Nest (:3001) and/or PyAI (:3002), then refresh."
              }
              compact
            />
          ) : meetings.length === 0 ? (
            <EmptyState
              title="No meetings yet"
              description="Capture or Join to fill this list."
              compact
            />
          ) : (
            meetings.map((m, i) => (
              <Link
                key={`${m.backend}:${m.id}`}
                to={`/library/${m.id}`}
                className={`nw-meeting-row mb-1.5 block rounded-xl border px-3 py-2.5 transition ${
                  m.id === selectedId
                    ? "border-[rgb(var(--nw-accent-rgb)_/_0.3)] bg-[var(--nw-surface-solid)] shadow-[0_8px_24px_rgb(var(--nw-accent-rgb)_/_0.08)]"
                    : "border-transparent bg-[var(--nw-glass-bg)] hover:border-[var(--nw-border)] hover:bg-[var(--nw-surface-solid)]"
                }`}
                style={{ animationDelay: `${i * 35}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-[0.8125rem] font-semibold leading-snug text-[var(--nw-ink)]">
                    {displayMeetingTitle(m)}
                  </strong>
                  <BackendTag backend={m.backend} />
                </div>
                <p className="m-0 mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--nw-ink-3)]">
                  {m.snippet || m.status}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[0.58rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
                    {m.source}
                  </span>
                  {m.createdAt ? (
                    <time
                      dateTime={m.createdAt}
                      className="shrink-0 text-[0.62rem] text-[var(--nw-ink-4)]"
                      title={formatWhen(m.createdAt)}
                    >
                      {formatMeetingListWhen(m.createdAt)}
                    </time>
                  ) : null}
                </div>
              </Link>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col nw-surface-gradient">
        {!meeting ? (
          <EmptyState
            title="Select a meeting"
            description="Pick one from the list."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--nw-border)] px-5 py-4">
              <div className="min-w-0 flex-1">
                {editingTitle ? (
                  <input
                    autoFocus
                    value={titleDraft}
                    maxLength={200}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={() => {
                      const current =
                        meeting.title || displayMeetingTitle(meeting);
                      const next = titleDraft.trim();
                      if (!next || next === current) {
                        setEditingTitle(false);
                        return;
                      }
                      rename.mutate({ mid: meeting.id, title: next });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setEditingTitle(false);
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    disabled={rename.isPending}
                    className="nw-page-input nw-page-title m-0 w-full max-w-xl rounded-lg border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-2 py-1 text-[var(--nw-ink)] outline-none focus:border-[var(--nw-accent)]"
                    aria-label="Meeting title"
                  />
                ) : (
                  <button
                    type="button"
                    className="nw-page-title nw-title-shimmer m-0 -mx-2 max-w-xl cursor-text rounded-lg px-2 py-1 text-left transition hover:bg-[var(--nw-surface-2)]"
                    onClick={() => {
                      setTitleDraft(
                        meeting.title || displayMeetingTitle(meeting),
                      );
                      setEditingTitle(true);
                    }}
                    title="Click to rename"
                  >
                    {displayMeetingTitle(meeting)}
                  </button>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <BackendTag backend={meeting.backend} />
                  {[
                    meeting.status,
                    meeting.source,
                    meeting.botProvider,
                    meeting.platform,
                    meeting.durationSec ? `${meeting.durationSec}s` : null,
                  ]
                    .filter(Boolean)
                    .map((chip) => (
                      <span
                        key={String(chip)}
                        className="rounded-full border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-2 py-0.5 text-[0.62rem] font-semibold text-[var(--nw-ink-3)]"
                      >
                        {chip}
                      </span>
                    ))}
                </div>
                {meeting.createdAt ? (
                  <time
                    dateTime={meeting.createdAt}
                    className="mt-2 block text-xs text-[var(--nw-ink-4)]"
                  >
                    {formatWhen(meeting.createdAt)}
                  </time>
                ) : null}
                {meeting.meetingUrl ? (
                  <a
                    className="mt-2 inline-block text-xs font-semibold text-[var(--nw-accent-dark)] underline"
                    href={meeting.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open meeting link
                  </a>
                ) : null}
                {meeting.botMessage ? (
                  <p className="m-0 mt-1 max-w-prose text-xs text-[var(--nw-ink-3)]">
                    {meeting.botMessage}
                  </p>
                ) : null}
              </div>
              <div className="nw-library-toolbar relative flex shrink-0 items-center gap-0.5 rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] p-1 shadow-sm">
                {meeting.source === "bot" &&
                (meeting.status === "bot_joining" ||
                  meeting.status === "bot_live") ? (
                  <button
                    type="button"
                    className="nw-library-tool danger inline-flex h-9 w-9 items-center justify-center rounded-xl"
                    disabled={stopBot.isPending}
                    title="Stop bot"
                    onClick={() => stopBot.mutate(meeting.id)}
                  >
                    <Square className="h-3.5 w-3.5" fill="currentColor" />
                  </button>
                ) : null}
                {canRegenerate ? (
                  <button
                    type="button"
                    className="nw-library-tool inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--nw-accent-dark)]"
                    disabled={refreshNotes.isPending}
                    title="Regenerate with AI"
                    onClick={() => {
                      setRegenError(null);
                      refreshNotes.mutate(meeting.id);
                    }}
                  >
                    <Sparkles
                      className={`h-4 w-4 ${
                        refreshNotes.isPending ? "animate-pulse" : ""
                      }`}
                    />
                  </button>
                ) : null}
                <div className="relative">
                  <button
                    type="button"
                    className="nw-library-tool inline-flex h-9 w-9 items-center justify-center rounded-xl"
                    title="Download"
                    aria-expanded={downloadOpen}
                    onClick={() => setDownloadOpen((v) => !v)}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {downloadOpen ? (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-10 cursor-default"
                        aria-label="Close download menu"
                        onClick={() => setDownloadOpen(false)}
                      />
                      <div className="absolute right-0 z-20 mt-1 min-w-[148px] overflow-hidden rounded-xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] py-1 shadow-lg">
                        <button
                          type="button"
                          className="flex w-full px-3.5 py-2 text-left text-sm text-[var(--nw-ink-2)] hover:bg-[var(--nw-surface-2)]"
                          onClick={() => {
                            void api.exportMeetingMd(meeting.id).then((md) => {
                              const blob = new Blob([md], {
                                type: "text/markdown",
                              });
                              const a = document.createElement("a");
                              a.href = URL.createObjectURL(blob);
                              a.download = `${meeting.title || "meeting"}.md`;
                              a.click();
                              setDownloadOpen(false);
                            });
                          }}
                        >
                          Markdown (.md)
                        </button>
                        <button
                          type="button"
                          className="flex w-full px-3.5 py-2 text-left text-sm text-[var(--nw-ink-2)] hover:bg-[var(--nw-surface-2)]"
                          onClick={() => {
                            void api
                              .exportMeetingJson(meeting.id)
                              .then((data) => {
                                const blob = new Blob(
                                  [JSON.stringify(data, null, 2)],
                                  {
                                    type: "application/json",
                                  }
                                );
                                const a = document.createElement("a");
                                a.href = URL.createObjectURL(blob);
                                a.download = `${
                                  meeting.title || "meeting"
                                }.json`;
                                a.click();
                                setDownloadOpen(false);
                              });
                          }}
                        >
                          JSON (.json)
                        </button>
                        <button
                          type="button"
                          className="flex w-full px-3.5 py-2 text-left text-sm text-[var(--nw-ink-2)] hover:bg-[var(--nw-surface-2)]"
                          onClick={() => {
                            void api
                              .exportMeetingHtml(meeting.id)
                              .then((html) => {
                                const blob = new Blob([html], {
                                  type: "text/html",
                                });
                                const url = URL.createObjectURL(blob);
                                window.open(url, "_blank", "noopener");
                                setDownloadOpen(false);
                              });
                          }}
                        >
                          Share (HTML)
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="nw-library-tool danger inline-flex h-9 w-9 items-center justify-center rounded-xl"
                  title="Delete meeting"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {meeting.source === "bot" &&
                (meeting.status === "failed" ||
                  meeting.status === "processing" ||
                  (meeting.status === "ready" &&
                    meeting.transcript.length === 0) ||
                  meeting.status === "bot_live" ||
                  meeting.status === "bot_joining") ? (
                  <button
                    type="button"
                    className="nw-library-tool inline-flex h-9 w-9 items-center justify-center rounded-xl"
                    title="Sync from bot"
                    disabled={syncBot.isPending}
                    onClick={() => syncBot.mutate(meeting.id)}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        syncBot.isPending ? "animate-spin" : ""
                      }`}
                    />
                  </button>
                ) : null}
              </div>
              {regenError ? (
                <p className="nw-alert mt-3 w-full max-w-none" role="alert">
                  {regenError}
                </p>
              ) : null}
              {rename.isError ? (
                <p className="nw-alert mt-3 w-full max-w-none" role="alert">
                  {(rename.error as Error)?.message || "Could not save meeting"}
                </p>
              ) : null}
            </div>

            {deleteOpen ? (
              <DeleteMeetingModal
                open={deleteOpen}
                title={meeting.title || displayMeetingTitle(meeting)}
                onClose={() => setDeleteOpen(false)}
                onConfirm={() => remove.mutate(meeting.id)}
                pending={remove.isPending}
                error={
                  remove.isError
                    ? (remove.error as Error)?.message ||
                      "Could not delete meeting"
                    : null
                }
              />
            ) : null}

            {botActive || meeting.source === "bot" ? (
              <div className="mx-5 mt-3 rounded-xl border border-[var(--nw-border)] bg-[var(--nw-glass-bg-strong)] px-3 py-2.5">
                <div className="flex flex-wrap gap-3">
                  {BOT_STEPS.map((step, i) => {
                    const done = meeting.status === "ready" || i < stepIdx;
                    const active = step.id === meeting.status;
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-2 text-xs ${
                          active
                            ? "font-semibold text-[var(--nw-accent-dark)]"
                            : done
                            ? "text-[var(--nw-success)]"
                            : "text-[var(--nw-ink-4)]"
                        }`}
                      >
                        <span className="grid h-5 w-5 place-items-center rounded-full border border-current text-[0.65rem]">
                          {done && !active ? "✓" : i + 1}
                        </span>
                        {step.label}
                        {active ? <span className="nw-pulse-dot" /> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <MeetingAudioPlayer
              key={meeting.id}
              className="mx-5 mt-3"
              src={meeting.audioUrl}
              durationHintSec={meeting.durationSec}
            />

            <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
              {meeting.status === "processing" ? (
                <div className="mb-4 space-y-2">
                  <p className="m-0 text-xs font-semibold text-[var(--nw-accent-dark)]">
                    Generating intelligent notes…
                  </p>
                  <div className="nw-skeleton w-3/4" />
                  <div className="nw-skeleton w-full" />
                  <div className="nw-skeleton w-1/2" />
                </div>
              ) : null}

              {/* Intelligence stack — primary product surface */}
              <div className="mb-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--nw-accent-dark)]" />
                  <h3 className="m-0 text-sm font-bold tracking-tight text-[var(--nw-ink)]">
                    Meeting intelligence
                  </h3>
                </div>
                {meeting.notes || meeting.userNotes ? (
                  <>
                    {isRegenerating ? (
                      <RegeneratingNotes active />
                    ) : (
                      <MeetingNotesIntelligence
                        notes={meeting.notes}
                        userNotes={persistedUserNotes.draft}
                        userNotesEditable
                        onUserNotesChange={persistedUserNotes.handleChange}
                        userNotesSaveHint={persistedUserNotes.saveHint}
                        userNotesPlacement="last"
                        onJump={(lineId) => {
                          setShowTranscript(true);
                          if (!lineId) return;
                          document
                            .getElementById(`line-${lineId}`)
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                        }}
                      />
                    )}
                  </>
                ) : isRegenerating ? (
                  <RegeneratingNotes active />
                ) : meeting.status === "bot_joining" ||
                  meeting.status === "bot_live" ? (
                  <EmptyState
                    title="Live notes building…"
                    description="Summary and actions appear as the bot captures speech."
                    compact
                  />
                ) : meeting.status !== "processing" ? (
                  <EmptyState
                    title="No notes yet"
                    description={`Status: ${meeting.status}`}
                  />
                ) : null}
              </div>

              {/* Transcript — clearly separated secondary pane */}
              <div className="nw-transcript-shell mt-2 overflow-hidden rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-glass-bg-strong)]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 border-b border-[var(--nw-border)] bg-[var(--nw-surface-2)] px-4 py-3 text-left"
                  onClick={() => setShowTranscript((v) => !v)}
                >
                  <span className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
                    <FileText className="h-3.5 w-3.5" />
                    {meeting.status === "bot_live" ||
                    meeting.status === "bot_joining"
                      ? "Live transcript"
                      : "Full transcript"}
                    <span className="rounded-full bg-[var(--nw-surface-solid)] px-2 py-0.5 text-[0.6rem] font-semibold normal-case tracking-normal text-[var(--nw-ink-4)]">
                      {meeting.transcript.length} turns
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-[var(--nw-accent-dark)]">
                    {showTranscript ? "Hide" : "Show"}
                  </span>
                </button>
                {showTranscript ? (
                  <div className="flex max-h-[42vh] flex-col gap-2 overflow-auto p-3">
                    {meeting.transcript.length === 0 ? (
                      <p className="m-0 px-1 text-sm text-[var(--nw-ink-4)]">
                        Waiting for speech…
                      </p>
                    ) : (
                      meeting.transcript.map((t, i) => (
                        <article
                          id={`line-${t.id}`}
                          key={t.id}
                          className={`nw-turn-enter rounded-xl border px-3 py-2.5 ${
                            t.kind === "you"
                              ? "border-[rgb(var(--nw-accent-rgb)_/_0.2)] bg-[rgb(var(--nw-accent-rgb)_/_0.06)]"
                              : "border-[var(--nw-border)] bg-[var(--nw-surface-2)]"
                          }`}
                          style={{ animationDelay: `${i * 20}ms` }}
                        >
                          <div className="mb-1">
                            <SpeakerChip label={t.speaker} kind={t.kind} />
                          </div>
                          <p className="m-0 text-sm leading-relaxed text-[var(--nw-ink-2)]">
                            {t.text}
                          </p>
                        </article>
                      ))
                    )}
                    <div ref={transcriptEndRef} />
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </section>
    </PageMotion>
  );
}
