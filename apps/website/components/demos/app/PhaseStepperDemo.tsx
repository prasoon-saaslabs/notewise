"use client";

import { cn } from "@/lib/utils";

const STEPS = ["Upload", "Transcribe", "Speakers", "Notes"] as const;

export function PhaseStepperDemo({
  activeIndex = 1,
  className,
}: {
  activeIndex?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border bg-paper-muted/60 px-4 py-2",
        className,
      )}
    >
      {STEPS.map((label, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div
            key={label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold",
              active && "bg-teal-muted text-teal-hover",
              done && !active && "bg-emerald-500/15 text-emerald-400",
              !done && !active && "bg-paper-elevated text-ink-muted",
            )}
          >
            <span className="grid h-4 w-4 place-items-center rounded-full bg-paper-muted text-[0.55rem] font-bold">
              {done && !active ? "✓" : i + 1}
            </span>
            {label}
            {active ? <span className="nw-pulse-dot" /> : null}
          </div>
        );
      })}
    </div>
  );
}
