import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@notewise/ui";
import {
  ArrowRight,
  Calendar,
  ExternalLink,
  Mic,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { EventPrepDetail, PreCallBrief } from "@notewise/api-client";
import { api } from "../lib/api";
import { formatWhen, formatTimeUntil } from "../lib/calendarFormat";
import { NotesEditor } from "./notes/NotesEditor";

function EntityBriefSection({ brief }: { brief: PreCallBrief }) {
  return (
    <article className="rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="m-0 text-sm font-bold text-[var(--nw-ink)]">
          {brief.entity.name}
        </h3>
        <Link
          to={`/people/${brief.entity.id}`}
          className="text-xs font-semibold text-[var(--nw-accent-dark)] underline"
        >
          View profile
        </Link>
      </div>
      {brief.lastMeeting?.recap ? (
        <p className="m-0 text-sm leading-relaxed text-[var(--nw-ink-2)]">
          <span className="font-semibold text-[var(--nw-ink-3)]">
            Last meeting:{" "}
          </span>
          {brief.lastMeeting.recap}
        </p>
      ) : (
        <p className="m-0 text-xs text-[var(--nw-ink-4)]">
          No prior meetings in your brain yet.
        </p>
      )}
      {brief.openCommitments.length > 0 ? (
        <div className="mt-3">
          <p className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
            Open follow-ups
          </p>
          <ul className="m-0 mt-1 list-disc pl-4 text-sm text-[var(--nw-ink-2)]">
            {brief.openCommitments.slice(0, 5).map((c) => (
              <li key={c.id}>{c.text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {brief.unresolvedObjections.length > 0 ? (
        <div className="mt-3 rounded-xl bg-[rgb(254_242_242)] px-3 py-2">
          <p className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-[rgb(185_28_28)]">
            Unresolved objections
          </p>
          <ul className="m-0 mt-1 list-disc pl-4 text-xs text-[rgb(127_29_29)]">
            {brief.unresolvedObjections.slice(0, 3).map((o, i) => (
              <li key={`${o.meetingId}-${i}`}>{o.text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {brief.suggestedAgenda.length > 0 ? (
        <p className="mt-3 m-0 text-xs text-[var(--nw-ink-3)]">
          Suggested agenda: {brief.suggestedAgenda.join(" · ")}
        </p>
      ) : null}
    </article>
  );
}

export function MeetingPrepContent({
  eventId,
  onStartRecording,
  showStartCta = true,
}: {
  eventId: string;
  onStartRecording?: (prep: EventPrepDetail, notes: string) => void;
  showStartCta?: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["calendar-prep", eventId],
    queryFn: () => api.getCalendarPrep(eventId),
  });

  const prep = q.data;

  useEffect(() => {
    if (prep?.manualNotes != null) setNotes(prep.manualNotes);
  }, [prep?.manualNotes, eventId]);

  async function saveNotes(next: string) {
    setSaving(true);
    try {
      await api.saveCalendarNotes(eventId, next);
    } finally {
      setSaving(false);
    }
  }

  if (q.isLoading) {
    return (
      <div className="space-y-3 p-2">
        <div className="nw-skeleton h-8 w-2/3" />
        <div className="nw-skeleton h-24 w-full" />
        <div className="nw-skeleton h-32 w-full" />
      </div>
    );
  }

  if (q.isError || !prep) {
    return (
      <p className="m-0 text-sm text-[rgb(185_28_28)]">
        Could not load prep brief. Try syncing your calendar again.
      </p>
    );
  }

  const until = formatTimeUntil(prep.startAt);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="mb-2 flex items-center gap-2 text-[var(--nw-accent-dark)]">
          <Sparkles className="h-4 w-4" />
          <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em]">
            AI prep brief
          </span>
        </div>
        <h1 className="m-0 text-xl font-bold tracking-tight text-[var(--nw-ink)]">
          {prep.title}
        </h1>
        <p className="m-0 mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--nw-ink-3)]">
          <Calendar className="h-3.5 w-3.5" />
          {formatWhen(prep.startAt)}
          {until ? ` · in ${until}` : " · starting now"}
        </p>
        {prep.attendees?.some((a) => a.name?.trim()) ? (
          <p className="m-0 mt-2 flex items-start gap-1.5 text-xs text-[var(--nw-ink-3)]">
            <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {prep.attendees
              .map((a) => a.name?.trim())
              .filter(Boolean)
              .join(", ")}
          </p>
        ) : null}
      </header>

      {prep.suggestedSummary ? (
        <section className="rounded-2xl bg-[var(--nw-accent-soft)] px-4 py-3">
          <p className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-accent-dark)]">
            Brain summary
          </p>
          <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--nw-ink-2)]">
            {prep.suggestedSummary}
          </p>
        </section>
      ) : null}

      {prep.suggestedActions?.length ? (
        <section>
          <p className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
            Open actions from past calls
          </p>
          <ul className="m-0 mt-2 list-disc pl-4 text-sm text-[var(--nw-ink-2)]">
            {prep.suggestedActions.slice(0, 8).map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {prep.entityBriefs?.length ? (
        <section className="space-y-3">
          <p className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
            People &amp; follow-ups
          </p>
          {prep.entityBriefs.map((brief) => (
            <EntityBriefSection key={brief.entity.id} brief={brief} />
          ))}
        </section>
      ) : null}

      {prep.retrievalHits?.length ? (
        <section>
          <p className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
            Related from your brain
          </p>
          <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
            {prep.retrievalHits.slice(0, 5).map((hit, i) => (
              <li
                key={`${hit.meetingId ?? "hit"}-${i}`}
                className="rounded-xl border border-[var(--nw-border)] bg-[var(--nw-surface-2)] px-3 py-2 text-xs leading-relaxed text-[var(--nw-ink-2)]"
              >
                {hit.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <span className="mb-1.5 block text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
          Your prep notes
        </span>
        <NotesEditor
          variant="field"
          minHeight={120}
          value={notes}
          onChange={setNotes}
          onBlur={() => void saveNotes(notes)}
          placeholder="Objectives, questions, context for this call…"
          aria-label="Your prep notes"
        />
        {saving ? (
          <p className="m-0 mt-1 text-[0.65rem] text-[var(--nw-ink-4)]">
            Saving…
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        {prep.meetUrl ? (
          <Button
            variant="ghost"
            onClick={() =>
              window.open(prep.meetUrl!, "_blank", "noopener,noreferrer")
            }
          >
            <ExternalLink className="h-4 w-4" />
            Join call
          </Button>
        ) : null}
        {showStartCta && onStartRecording ? (
          <Button
            variant="primary"
            onClick={() => {
              void saveNotes(notes).finally(() =>
                onStartRecording(prep, notes)
              );
            }}
          >
            <Mic className="h-4 w-4" />
            Start recording
          </Button>
        ) : null}
        <Link
          to="/"
          className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--nw-accent-dark)] hover:bg-[var(--nw-accent-soft)]"
        >
          Back to home <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
