import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, EmptyState, SpeakerChip } from "@notewise/ui";
import {
  CheckSquare,
  Download,
  FileText,
  ListChecks,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Sparkles,
  Square,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import type { MeetingBackend, NotesPayload } from "@notewise/api-client";
import {
  clientForBackend,
  displayMeetingTitle,
  getCatalogMeeting,
  listAllMeetings,
} from "../../lib/meetingsCatalog";
import { ClaimLine, RunStatusCard } from "../../components/Receipts";
import { api } from "../../lib/api";
import { RegeneratingNotes } from "../../components/RegeneratingNotes";
import { PageMotion } from "../../components/PageMotion";

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
          ? "bg-[rgb(14_116_144_/_0.14)] text-[var(--nw-accent-dark)] ring-1 ring-[rgb(14_116_144_/_0.2)]"
          : "bg-[rgb(100_116_139_/_0.1)] text-[var(--nw-ink-3)] ring-1 ring-[rgb(100_116_139_/_0.15)]"
      }`}
      title={pyai ? "Captured via PyAI gateway" : "Captured via Nest + ai-worker"}
    >
      {pyai ? "PyAI" : "Nest"}
    </span>
  );
}

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
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

function SectionCard({
  icon,
  title,
  accent,
  delay = 0,
  children,
  empty,
}: {
  icon: ReactNode;
  title: string;
  accent: "teal" | "amber" | "rose" | "slate" | "violet";
  delay?: number;
  children: React.ReactNode;
  empty?: boolean;
}) {
  const accents: Record<string, string> = {
    teal: "from-[rgb(14_116_144_/_0.12)] via-white to-white border-[rgb(14_116_144_/_0.18)]",
    amber: "from-[rgb(217_119_6_/_0.1)] via-white to-white border-[rgb(217_119_6_/_0.2)]",
    rose: "from-[rgb(225_29_72_/_0.08)] via-white to-white border-[rgb(225_29_72_/_0.16)]",
    slate: "from-[rgb(100_116_139_/_0.08)] via-white to-white border-[var(--nw-border)]",
    violet: "from-[rgb(79_70_229_/_0.08)] via-white to-white border-[rgb(79_70_229_/_0.16)]",
  };
  const iconBg: Record<string, string> = {
    teal: "bg-[rgb(14_116_144_/_0.12)] text-[var(--nw-accent-dark)]",
    amber: "bg-[rgb(217_119_6_/_0.12)] text-[rgb(180_83_9)]",
    rose: "bg-[rgb(225_29_72_/_0.1)] text-[rgb(190_18_60)]",
    slate: "bg-[var(--nw-surface-2)] text-[var(--nw-ink-3)]",
    violet: "bg-[rgb(79_70_229_/_0.1)] text-[rgb(67_56_202)]",
  };
  return (
    <section
      className={`nw-intel-card rounded-2xl border bg-gradient-to-br p-4 shadow-[0_1px_0_rgb(15_23_42_/_0.03)] ${accents[accent]} ${
        empty ? "opacity-80" : ""
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="mb-3 flex items-center gap-2">
        <span className={`grid h-8 w-8 place-items-center rounded-xl ${iconBg[accent]}`}>{icon}</span>
        <h3 className="m-0 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
          {title}
        </h3>
      </header>
      {children}
    </section>
  );
}

function NotesIntelligence({
  notes,
  userNotes,
  onJump,
}: {
  notes: NotesPayload | null;
  userNotes?: string | null;
  onJump?: (lineId?: string, startMs?: number | null) => void;
}) {
  const actions = notes?.actions ?? [];
  const takeaways = notes?.takeaways ?? [];
  const questions = notes?.openQuestions ?? [];
  const decisions = notes?.decisions ?? [];
  const objections = notes?.objections ?? [];
  const hasSummary = Boolean(notes?.executiveSummary || notes?.title);

  return (
    <div className="flex flex-col gap-3">
      <RunStatusCard status={notes?.runStatus} dropped={notes?.droppedCount} />
      {userNotes?.trim() ? (
        <SectionCard
          icon={<StickyNote className="h-4 w-4" />}
          title="Your notes"
          accent="amber"
          delay={40}
        >
          <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-[var(--nw-ink-2)]">
            {userNotes.trim()}
          </p>
        </SectionCard>
      ) : null}

      <SectionCard
        icon={<Sparkles className="h-4 w-4" />}
        title="Call summary"
        accent="teal"
        delay={80}
        empty={!hasSummary}
      >
        {notes?.title ? (
          <p className="mb-2 mt-0 text-base font-semibold tracking-tight text-[var(--nw-ink)]">
            {notes.title}
          </p>
        ) : null}
        {notes?.executiveSummary ? (
          <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-[var(--nw-ink-2)]">
            {notes.executiveSummary}
          </p>
        ) : (
          <p className="m-0 text-sm text-[var(--nw-ink-4)]">Summary will appear after processing.</p>
        )}
      </SectionCard>

      {objections.length > 0 ? (
        <SectionCard icon={<FileText className="h-4 w-4" />} title="Objections" accent="rose" delay={100}>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {objections.map((o) => (
              <ClaimLine key={o.id} claim={o} onJump={onJump} />
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {decisions.length > 0 ? (
        <SectionCard icon={<ListChecks className="h-4 w-4" />} title="Decisions" accent="violet" delay={110}>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {decisions.map((d) => (
              <ClaimLine key={d.id} claim={d} onJump={onJump} />
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <SectionCard
        icon={<CheckSquare className="h-4 w-4" />}
        title="Action items"
        accent="rose"
        delay={120}
        empty={actions.length === 0}
      >
        {actions.length === 0 ? (
          <p className="m-0 text-sm text-[var(--nw-ink-4)]">No action items detected yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {actions.map((a, i) => (
              <li
                key={`${a.text}-${i}`}
                className="nw-action-row flex items-start gap-3 rounded-xl border border-[rgb(225_29_72_/_0.12)] bg-white/80 px-3 py-2.5"
              >
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[rgb(225_29_72_/_0.1)] text-[0.65rem] font-bold text-[rgb(190_18_60)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-medium leading-snug text-[var(--nw-ink)]">{a.text}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {a.owner ? (
                      <span className="rounded-full bg-[rgb(14_116_144_/_0.1)] px-2 py-0.5 text-[0.6rem] font-bold uppercase text-[var(--nw-accent-dark)]">
                        {a.owner}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-full bg-[rgb(14_116_144_/_0.12)] px-1.5 py-0.5 text-[0.6rem] font-bold text-[var(--nw-accent-dark)]"
                      onClick={() => onJump?.(a.lineIds?.[0], a.startMs)}
                    >
                      receipt
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {notes?.followUpEmail ? (
        <SectionCard icon={<FileText className="h-4 w-4" />} title="Follow-up email" accent="slate" delay={140}>
          <p className="m-0 whitespace-pre-wrap text-sm">{notes.followUpEmail}</p>
        </SectionCard>
      ) : null}

      {takeaways.length > 0 ? (
        <SectionCard icon={<ListChecks className="h-4 w-4" />} title="Takeaways" accent="violet" delay={160}>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {takeaways.map((t) => (
              <li
                key={t}
                className="relative pl-4 text-sm leading-relaxed text-[var(--nw-ink-2)] before:absolute before:left-0 before:top-[0.55em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-[rgb(79_70_229)]"
              >
                {t}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {questions.length > 0 ? (
        <SectionCard icon={<FileText className="h-4 w-4" />} title="Open questions" accent="slate" delay={200}>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {questions.map((q) => (
              <li key={q} className="rounded-lg bg-white/70 px-3 py-2 text-sm text-[var(--nw-ink-2)]">
                {q}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}

export function LibraryPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTranscript, setShowTranscript] = useState(true);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [q, setQ] = useState("");
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const list = useQuery({
    queryKey: ["meetings", "catalog"],
    queryFn: () => listAllMeetings(),
    refetchInterval: 4000,
  });
  const fts = useQuery({
    queryKey: ["meetings", "search", q],
    queryFn: () => api.searchMeetings(q.trim()),
    enabled: q.trim().length >= 2,
  });

  const meetings = (
    q.trim().length >= 2 && fts.data
      ? fts.data
      : (list.data ?? []).filter((m) => {
          if (!q.trim()) return true;
          const hay = `${m.title} ${m.snippet || ""}`.toLowerCase();
          return hay.includes(q.trim().toLowerCase());
        })
  );
  const selectedId = id ?? meetings[0]?.id;
  const selectedBackend = meetings.find((m) => m.id === selectedId)?.backend;

  const detail = useQuery({
    queryKey: ["meeting", selectedBackend ?? "any", selectedId],
    queryFn: () => getCatalogMeeting(selectedId!, selectedBackend),
    enabled: Boolean(selectedId),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      if (s === "processing" || s === "bot_live" || s === "bot_joining") return 1200;
      return false;
    },
  });

  const meeting = detail.data;
  const meetingBackend: MeetingBackend =
    meeting?.backend === "pyai" || meeting?.backend === "nest"
      ? meeting.backend
      : selectedBackend ?? "nest";

  const remove = useMutation({
    mutationFn: (mid: string) => clientForBackend(meetingBackend).deleteMeeting(mid),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["meetings", "catalog"] });
      navigate("/library");
    },
  });

  const stopBot = useMutation({
    mutationFn: (mid: string) => clientForBackend(meetingBackend).stopBot(mid),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["meeting", meetingBackend, selectedId] });
      void qc.invalidateQueries({ queryKey: ["meetings", "catalog"] });
    },
  });

  const syncBot = useMutation({
    mutationFn: (mid: string) => clientForBackend(meetingBackend).syncBotMeeting(mid),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["meeting", meetingBackend, selectedId] });
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
          prev ? { ...prev, status: "processing" as const } : prev,
      );
    },
    onSuccess: () => {
      setRegenError(null);
      void qc.invalidateQueries({ queryKey: ["meeting", meetingBackend, selectedId] });
      void qc.invalidateQueries({ queryKey: ["meetings", "catalog"] });
    },
    onError: (err: Error) => setRegenError(err.message || "Could not regenerate notes"),
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
    }) => clientForBackend(meetingBackend).updateMeeting(mid, { title, userNotes }),
    onSuccess: () => {
      setEditingTitle(false);
      setEditOpen(false);
      setDownloadOpen(false);
      void qc.invalidateQueries({ queryKey: ["meeting", meetingBackend, selectedId] });
      void qc.invalidateQueries({ queryKey: ["meetings", "catalog"] });
    },
  });

  const rename = saveMeeting;

  const canRegenerate = meetingCanRegenerate(meeting?.status, meeting?.transcript?.length ?? 0);
  const isRegenerating =
    refreshNotes.isPending || (meeting?.status === "processing" && Boolean(meeting?.transcript?.length));
  const botActive =
    meeting?.source === "bot" &&
    (meeting.status === "bot_joining" || meeting.status === "bot_live" || meeting.status === "processing");
  const stepIdx = meeting ? botStepIndex(meeting.status) : 0;

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setRegenError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
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
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [meeting?.transcript?.length, meeting?.status]);

  async function togglePlay() {
    const el = audioRef.current;
    if (!el || !meeting?.audioUrl) return;
    if (el.paused) {
      try {
        await el.play();
        setPlaying(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  return (
    <PageMotion className="nw-panel grid h-full min-h-0 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
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
              : `${meetings.length} across Nest & PyAI`}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {list.isError ? (
            <EmptyState
              title="Stores unreachable"
              description="Start Nest (:3001) and/or PyAI (:3002), then refresh."
              compact
            />
          ) : meetings.length === 0 ? (
            <EmptyState title="No meetings yet" description="Capture or Join to fill this list." compact />
          ) : (
            meetings.map((m, i) => (
              <Link
                key={`${m.backend}:${m.id}`}
                to={`/library/${m.id}`}
                className={`nw-meeting-row mb-1.5 block rounded-xl border px-3 py-2.5 transition ${
                  m.id === selectedId
                    ? "border-[rgb(14_116_144_/_0.3)] bg-white shadow-[0_8px_24px_rgb(14_116_144_/_0.08)]"
                    : "border-transparent bg-white/40 hover:border-[var(--nw-border)] hover:bg-white"
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
                <span className="mt-1.5 inline-block text-[0.58rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
                  {m.source}
                </span>
              </Link>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col bg-[linear-gradient(180deg,#fff_0%,#f8fafc_100%)]">
        {!meeting ? (
          <EmptyState title="Select a meeting" description="Pick one from the list." />
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--nw-border)] px-5 py-4">
              <div className="min-w-0 flex-1">
                {editingTitle ? (
                  <form
                    className="flex max-w-xl flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const next = titleDraft.trim();
                      if (!next || next === meeting.title) {
                        setEditingTitle(false);
                        return;
                      }
                      rename.mutate({ mid: meeting.id, title: next });
                    }}
                  >
                    <input
                      autoFocus
                      value={titleDraft}
                      maxLength={200}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingTitle(false);
                      }}
                      className="nw-page-input min-w-0 flex-1 rounded-xl border border-[var(--nw-border)] bg-white px-3 py-2 text-lg font-semibold text-[var(--nw-ink)] outline-none"
                      aria-label="Meeting title"
                    />
                    <Button size="sm" type="submit" disabled={rename.isPending || !titleDraft.trim()}>
                      {rename.isPending ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() => setEditingTitle(false)}
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <h2 className="nw-page-title nw-title-shimmer m-0">{displayMeetingTitle(meeting)}</h2>
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
                        className="rounded-full border border-[var(--nw-border)] bg-white px-2 py-0.5 text-[0.62rem] font-semibold text-[var(--nw-ink-3)]"
                      >
                        {chip}
                      </span>
                    ))}
                </div>
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
                  <p className="m-0 mt-1 max-w-prose text-xs text-[var(--nw-ink-3)]">{meeting.botMessage}</p>
                ) : null}
              </div>
              <div className="nw-library-toolbar relative flex shrink-0 items-center gap-0.5 rounded-2xl border border-[var(--nw-border)] bg-white p-1 shadow-sm">
                {meeting.source === "bot" &&
                (meeting.status === "bot_joining" || meeting.status === "bot_live") ? (
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
                    <Sparkles className={`h-4 w-4 ${refreshNotes.isPending ? "animate-pulse" : ""}`} />
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
                      <div className="absolute right-0 z-20 mt-1 min-w-[148px] overflow-hidden rounded-xl border border-[var(--nw-border)] bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          className="flex w-full px-3.5 py-2 text-left text-sm text-[var(--nw-ink-2)] hover:bg-[rgb(248_250_252)]"
                          onClick={() => {
                            void api.exportMeetingMd(meeting.id).then((md) => {
                              const blob = new Blob([md], { type: "text/markdown" });
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
                          className="flex w-full px-3.5 py-2 text-left text-sm text-[var(--nw-ink-2)] hover:bg-[rgb(248_250_252)]"
                          onClick={() => {
                            void api.exportMeetingJson(meeting.id).then((data) => {
                              const blob = new Blob([JSON.stringify(data, null, 2)], {
                                type: "application/json",
                              });
                              const a = document.createElement("a");
                              a.href = URL.createObjectURL(blob);
                              a.download = `${meeting.title || "meeting"}.json`;
                              a.click();
                              setDownloadOpen(false);
                            });
                          }}
                        >
                          JSON (.json)
                        </button>
                        <button
                          type="button"
                          className="flex w-full px-3.5 py-2 text-left text-sm text-[var(--nw-ink-2)] hover:bg-[rgb(248_250_252)]"
                          onClick={() => {
                            void api.exportMeetingHtml(meeting.id).then((html) => {
                              const blob = new Blob([html], { type: "text/html" });
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
                  className="nw-library-tool inline-flex h-9 w-9 items-center justify-center rounded-xl"
                  title="Edit title & notes"
                  onClick={() => {
                    setEditTitle(meeting.title || displayMeetingTitle(meeting));
                    setEditNotes(meeting.userNotes || "");
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="nw-library-tool danger inline-flex h-9 w-9 items-center justify-center rounded-xl"
                  title="Delete meeting"
                  onClick={() => {
                    if (window.confirm("Delete this meeting permanently?")) {
                      remove.mutate(meeting.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {meeting.source === "bot" &&
                (meeting.status === "failed" ||
                  meeting.status === "processing" ||
                  (meeting.status === "ready" && meeting.transcript.length === 0) ||
                  meeting.status === "bot_live" ||
                  meeting.status === "bot_joining") ? (
                  <button
                    type="button"
                    className="nw-library-tool inline-flex h-9 w-9 items-center justify-center rounded-xl"
                    title="Sync from bot"
                    disabled={syncBot.isPending}
                    onClick={() => syncBot.mutate(meeting.id)}
                  >
                    <RefreshCw className={`h-4 w-4 ${syncBot.isPending ? "animate-spin" : ""}`} />
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

            {editOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(15_23_42_/_0.45)] p-4">
                <div
                  className="w-full max-w-lg rounded-2xl border border-[var(--nw-border)] bg-white p-5 shadow-xl"
                  role="dialog"
                  aria-labelledby="edit-meeting-title"
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h3 id="edit-meeting-title" className="m-0 text-base font-semibold text-[var(--nw-ink)]">
                      Edit meeting
                    </h3>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-lg text-[var(--nw-ink-4)] hover:bg-[rgb(248_250_252)]"
                      onClick={() => setEditOpen(false)}
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <form
                    className="flex flex-col gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const title = editTitle.trim();
                      if (!title) return;
                      saveMeeting.mutate({
                        mid: meeting.id,
                        title,
                        userNotes: editNotes,
                      });
                    }}
                  >
                    <label className="block text-sm">
                      <span className="mb-1 block text-xs font-semibold text-[var(--nw-ink-3)]">Title</span>
                      <input
                        value={editTitle}
                        maxLength={200}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-xl border border-[var(--nw-border)] px-3 py-2 text-sm outline-none focus:border-[var(--nw-accent)]"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-xs font-semibold text-[var(--nw-ink-3)]">
                        Your notes (scratchpad)
                      </span>
                      <textarea
                        value={editNotes}
                        rows={6}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full resize-y rounded-xl border border-[var(--nw-border)] px-3 py-2 text-sm outline-none focus:border-[var(--nw-accent)]"
                        placeholder="Pricing pushback, follow-ups, context…"
                      />
                    </label>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={saveMeeting.isPending || !editTitle.trim()}>
                        {saveMeeting.isPending ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}

            {botActive || meeting.source === "bot" ? (
              <div className="mx-5 mt-3 rounded-xl border border-[var(--nw-border)] bg-white/80 px-3 py-2.5">
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

            <div className="mx-5 mt-3 flex items-center gap-3 rounded-2xl border border-[var(--nw-border)] bg-white px-3 py-2.5 shadow-[0_1px_0_rgb(15_23_42_/_0.04)]">
              <button
                type="button"
                className="nw-play-orb grid h-9 w-9 place-items-center rounded-full bg-[var(--nw-accent)] text-white disabled:opacity-40"
                aria-label={playing ? "Pause" : "Play"}
                disabled={!meeting.audioUrl}
                onClick={() => void togglePlay()}
              >
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <span className="font-mono text-[0.7rem] text-[var(--nw-ink-3)]">{formatTime(current)}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--nw-surface-3)]">
                <i
                  className="nw-progress-fill block h-full rounded-full bg-[linear-gradient(90deg,var(--nw-accent),#0ea5e9)] not-italic"
                  style={{
                    width: `${duration ? Math.min(100, (current / duration) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="font-mono text-[0.7rem] text-[var(--nw-ink-3)]">
                {formatTime(duration || meeting.durationSec || 0)}
              </span>
              {meeting.audioUrl ? (
                <audio
                  ref={audioRef}
                  src={meeting.audioUrl}
                  preload="metadata"
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                  onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime || 0)}
                  onEnded={() => setPlaying(false)}
                  onPause={() => setPlaying(false)}
                  onPlay={() => setPlaying(true)}
                />
              ) : (
                <span className="nw-muted text-xs" title="Record a new meeting to enable playback">
                  No audio (record again)
                </span>
              )}
            </div>

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
                      <NotesIntelligence
                        notes={meeting.notes}
                        userNotes={meeting.userNotes}
                        onJump={(lineId) => {
                          setShowTranscript(true);
                          if (!lineId) return;
                          document.getElementById(`line-${lineId}`)?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }}
                      />
                    )}
                  </>
                ) : isRegenerating ? (
                  <RegeneratingNotes active />
                ) : meeting.status === "bot_joining" || meeting.status === "bot_live" ? (
                  <EmptyState
                    title="Live notes building…"
                    description="Summary and actions appear as the bot captures speech."
                    compact
                  />
                ) : meeting.status !== "processing" ? (
                  <EmptyState title="No notes yet" description={`Status: ${meeting.status}`} />
                ) : null}
              </div>

              {/* Transcript — clearly separated secondary pane */}
              <div className="nw-transcript-shell mt-2 overflow-hidden rounded-2xl border border-[var(--nw-border)] bg-white/90">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 border-b border-[var(--nw-border)] bg-[rgb(248_250_252)] px-4 py-3 text-left"
                  onClick={() => setShowTranscript((v) => !v)}
                >
                  <span className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
                    <FileText className="h-3.5 w-3.5" />
                    {meeting.status === "bot_live" || meeting.status === "bot_joining"
                      ? "Live transcript"
                      : "Full transcript"}
                    <span className="rounded-full bg-white px-2 py-0.5 text-[0.6rem] font-semibold normal-case tracking-normal text-[var(--nw-ink-4)]">
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
                      <p className="m-0 px-1 text-sm text-[var(--nw-ink-4)]">Waiting for speech…</p>
                    ) : (
                      meeting.transcript.map((t, i) => (
                        <article
                          id={`line-${t.id}`}
                          key={t.id}
                          className={`nw-turn-enter rounded-xl border px-3 py-2.5 ${
                            t.kind === "you"
                              ? "border-[rgb(14_116_144_/_0.2)] bg-[rgb(14_116_144_/_0.06)]"
                              : "border-[var(--nw-border)] bg-[var(--nw-surface-2)]"
                          }`}
                          style={{ animationDelay: `${i * 20}ms` }}
                        >
                          <div className="mb-1">
                            <SpeakerChip label={t.speaker} kind={t.kind} />
                          </div>
                          <p className="m-0 text-sm leading-relaxed text-[var(--nw-ink-2)]">{t.text}</p>
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
