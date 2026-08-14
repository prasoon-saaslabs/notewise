"use client";

import { Calendar, FileText, Plus } from "lucide-react";
import { HERO_DEMO } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function UpcomingMeetsDemo({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-5 bg-paper-elevated p-4 md:p-5", className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-xl font-bold tracking-tight text-ink md:text-2xl">
            Upcoming meets
          </h3>
          <p className="m-0 mt-1 text-sm text-ink-muted">
            Review AI briefs and notes before each meeting.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-paper-elevated px-3 py-1.5 text-sm font-medium text-ink">
          <Plus className="h-4 w-4" />
          New Meeting
        </span>
      </header>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {HERO_DEMO.upcomingMeetings.map((meeting) => (
          <li
            key={meeting.title}
            className="rounded-2xl border border-border bg-paper-elevated p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 text-base font-semibold text-ink">{meeting.title}</p>
                <p className="m-0 mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                  <Calendar className="h-3.5 w-3.5" />
                  {meeting.when}
                  {"until" in meeting && meeting.until ? ` · in ${meeting.until}` : null}
                </p>
                {"tag" in meeting && meeting.tag ? (
                  <p className="m-0 mt-2 text-[0.65rem] text-ink-muted">{meeting.tag}</p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-full bg-teal-muted px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-teal-hover">
                Prep
              </span>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="flex w-full items-center justify-center rounded-xl border border-border bg-paper-elevated px-3 py-2.5 text-xs font-semibold text-ink-secondary"
      >
        Show 24 more
      </button>

      <div>
        <p className="m-0 mb-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-ink-muted">
          Today
        </p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {HERO_DEMO.todayMeetings.map((meeting) => (
            <li
              key={meeting.title}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-paper-elevated px-3 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                <FileText className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                <span className="truncate">{meeting.title}</span>
              </span>
              <span className="shrink-0 text-xs text-ink-muted">{meeting.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
