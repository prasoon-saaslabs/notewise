"use client";

import { Pause, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export function MiniCaptureDemo({
  timer = "00:16",
  note = "pricing pushback?? follow up Tuesday",
  className,
}: {
  timer?: string;
  note?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "nw-mini-panel overflow-hidden rounded-[22px] border border-border bg-paper-elevated shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/80 px-3 py-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums text-ink">{timer}</span>
        <span className="text-[0.62rem] font-medium text-ink-muted">Live · tap pulse to expand</span>
      </div>
      <div className="space-y-2 p-3">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-ink-muted">Live notes</p>
        <div className="min-h-[56px] rounded-xl border border-border bg-paper px-3 py-2 text-xs text-ink-secondary">
          {note}
        </div>
        <div className="flex gap-2 pt-1">
          <span className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-border bg-paper-muted py-2 text-xs font-semibold text-ink-secondary">
            <Pause className="h-3.5 w-3.5" />
            Pause
          </span>
          <span className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-red-600 py-2 text-xs font-semibold text-white">
            <Square className="h-3.5 w-3.5" fill="currentColor" />
            Stop
          </span>
        </div>
      </div>
    </div>
  );
}
