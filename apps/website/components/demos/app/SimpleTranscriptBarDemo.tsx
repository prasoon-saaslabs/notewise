"use client";

import { ChevronUp, Square } from "lucide-react";
import { AppWaveform } from "@/components/demos/app/AppWaveform";
import { cn } from "@/lib/utils";

export function SimpleTranscriptBarDemo({
  active = true,
  preview,
  className,
}: {
  active?: boolean;
  preview?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-1 rounded-full border border-border bg-paper-muted p-1",
        className,
      )}
    >
      <div className="flex h-8 shrink-0 items-center overflow-hidden px-1">
        <AppWaveform active={active} bars={14} className="h-8" />
      </div>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted">
        <ChevronUp className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 overflow-hidden px-1">
        {preview ? (
          <p className="m-0 truncate text-xs text-ink-secondary">{preview}</p>
        ) : (
          <p className="m-0 truncate text-right text-xs text-ink-muted">
            {active ? "Listening…" : "Starting capture…"}
          </p>
        )}
      </div>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted">
        <Square className="h-3.5 w-3.5" fill="currentColor" />
      </span>
    </div>
  );
}
