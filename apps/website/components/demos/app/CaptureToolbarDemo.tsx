"use client";

import { Mic, Pause, Sparkles, Square } from "lucide-react";
import { AppWaveform } from "@/components/demos/app/AppWaveform";
import { cn } from "@/lib/utils";

type CaptureMode = "idle" | "live" | "processing" | "ready";

export function CaptureToolbarDemo({
  mode = "live",
  timer = "00:27",
  statusLine = "Listening — PyAI Hear live",
  className,
}: {
  mode?: CaptureMode;
  timer?: string;
  statusLine?: string;
  className?: string;
}) {
  const live = mode === "live";
  const processing = mode === "processing";
  const ready = mode === "ready";

  return (
    <header
      className={cn(
        "relative z-10 border-b border-white/45 bg-white/42 px-4 py-3 backdrop-blur-md",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "nw-capture-mic grid h-11 w-11 shrink-0 place-items-center",
              live && "is-live",
            )}
          >
            {live ? <Square className="h-4 w-4" fill="currentColor" /> : <Mic className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="m-0 font-mono text-xl font-semibold tabular-nums tracking-tight text-ink">
                {timer}
              </p>
              {live ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-red-700">
                  <span className="nw-pulse-dot !bg-red-500" />
                  Live
                </span>
              ) : processing ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-muted px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-teal-hover">
                  <span className="nw-pulse-dot" />
                  Processing
                </span>
              ) : ready ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-emerald-600">
                  <Sparkles className="h-3 w-3" />
                  Ready
                </span>
              ) : null}
              <span className="rounded-full bg-paper-muted px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-ink-muted">
                PyAI
              </span>
            </div>
            <p className="m-0 mt-0.5 truncate text-xs text-ink-muted">{statusLine}</p>
          </div>
          <div className="hidden min-w-[120px] flex-1 md:block">
            <AppWaveform active={live || processing} bars={14} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {live ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-paper-elevated/80 px-3 text-xs font-semibold text-ink-secondary">
              <Pause className="h-3.5 w-3.5" />
              Pause
            </span>
          ) : null}
          <span
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-white",
              live ? "bg-red-600" : "bg-teal",
            )}
          >
            {live ? (
              <>
                <Square className="h-3.5 w-3.5" fill="currentColor" />
                Stop & notes
              </>
            ) : processing ? (
              <>Working…</>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5" />
                Start listening
              </>
            )}
          </span>
        </div>
      </div>
    </header>
  );
}
