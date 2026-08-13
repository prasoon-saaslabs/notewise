import { useEffect, useState } from "react";
import { Button } from "@notewise/ui";
import { Mic, Sparkles, X } from "lucide-react";
import type { CalendarEventPrep } from "@notewise/api-client";
import type { CalendarFlowModal } from "../hooks/useCalendarFlow";
import { api } from "../lib/api";

export function MeetingFlowModal({
  modal,
  onClose,
  onStartCapture,
  onOpenPrep,
}: {
  modal: CalendarFlowModal;
  onClose: () => void;
  onStartCapture: (event: CalendarEventPrep, manualNotes: string) => void;
  onOpenPrep: (event: CalendarEventPrep, manualNotes: string) => void;
}) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!modal) return;
    const prepNotes =
      modal.event.prep?.manualNotes || modal.event.manualNotes || "";
    setNotes(prepNotes);
  }, [modal]);

  if (!modal) return null;

  const ev = modal.event;
  const prep = ev.prep;
  const isReminder = modal.kind === "reminder";
  const title = isReminder
    ? `Prep time · ${ev.title} starts in ~10 minutes`
    : `Meeting starting · ${ev.title}`;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[rgb(15_23_42_/_0.45)] p-4 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg rounded-3xl border border-[var(--nw-border)] bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-flow-title"
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-lg p-1 text-[var(--nw-ink-4)] hover:bg-[var(--nw-surface-2)]"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex items-center gap-2 text-[var(--nw-accent-dark)]">
          <Sparkles className="h-4 w-4" />
          <p id="meeting-flow-title" className="m-0 text-sm font-bold">
            {title}
          </p>
        </div>

        {prep?.suggestedSummary ? (
          <div className="mb-3 rounded-2xl bg-[var(--nw-accent-soft)] px-3 py-2.5 text-sm leading-relaxed text-[var(--nw-ink-2)]">
            {prep.suggestedSummary}
          </div>
        ) : null}

        {prep?.suggestedActions?.length ? (
          <div className="mb-3">
            <p className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
              Open follow-ups
            </p>
            <ul className="m-0 mt-1 list-disc pl-4 text-xs text-[var(--nw-ink-2)]">
              {prep.suggestedActions.slice(0, 5).map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {isReminder ? (
          <p className="m-0 mb-3 text-xs text-[var(--nw-ink-3)]">
            Open the full prep brief to review people context, past notes, and
            add your own before the call starts.
          </p>
        ) : (
          <label className="block">
            <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
              Quick notes before recording
            </span>
            <textarea
              className="w-full resize-none rounded-xl border border-[var(--nw-border)] px-3 py-2 text-sm outline-none focus:border-[var(--nw-accent)]"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Objectives, questions, context…"
            />
          </label>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {isReminder ? "Later" : "Not now"}
          </Button>
          {ev.meetUrl ? (
            <Button
              variant="ghost"
              onClick={() =>
                window.open(ev.meetUrl!, "_blank", "noopener,noreferrer")
              }
            >
              Join call
            </Button>
          ) : null}
          {isReminder ? (
            <Button
              variant="primary"
              onClick={() => {
                void api.saveCalendarNotes(ev.id, notes).finally(() => {
                  onOpenPrep(ev, notes);
                  onClose();
                });
              }}
            >
              <Sparkles className="h-4 w-4" />
              Open prep brief
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                void api.saveCalendarNotes(ev.id, notes).finally(() => {
                  onStartCapture(ev, notes);
                  onClose();
                });
              }}
            >
              <Mic className="h-4 w-4" />
              Start recording
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
