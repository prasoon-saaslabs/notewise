"use client";

import { Calendar, List, ListOrdered, Sparkles } from "lucide-react";
import { HERO_DEMO } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function LibraryNotesDemo({
  className,
}: {
  animate?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6 bg-paper-elevated px-4 py-5 md:px-6 md:py-6", className)}>
      <header className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-ink-muted">← Back</span>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-paper-elevated px-3 py-1.5 text-sm font-medium text-ink">
          + New Meeting
        </span>
      </header>

      <div>
        <h3 className="m-0 font-display text-2xl font-normal tracking-tight text-ink md:text-3xl">
          {HERO_DEMO.meetingTitle}
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-teal-muted px-2.5 py-1 text-xs font-semibold text-teal-hover">
            <Sparkles className="h-3 w-3" />
            Enhanced
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-paper-elevated px-2.5 py-1 text-xs font-medium text-ink-muted">
            <Calendar className="h-3 w-3" />
            Today
          </span>
        </div>
      </div>

      <p className="m-0 text-sm leading-relaxed text-ink-secondary">{HERO_DEMO.summary}</p>

      <section>
        <h4 className="m-0 mb-2.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
          Your notes
        </h4>
        <div className="rounded-2xl border border-border bg-paper-elevated p-3">
          <div className="mb-3 flex items-center gap-2 text-ink-muted">
            <List className="h-3.5 w-3.5" />
            <ListOrdered className="h-3.5 w-3.5" />
          </div>
          <p className="m-0 text-sm text-ink-muted">Add your notes…</p>
        </div>
      </section>
    </div>
  );
}
