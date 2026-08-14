"use client";

import { Calendar, List, ListOrdered } from "lucide-react";
import { LiveTranscriptDemo } from "@/components/demos/LiveTranscriptDemo";
import { SimpleTranscriptBarDemo } from "@/components/demos/app/SimpleTranscriptBarDemo";
import { HERO_DEMO } from "@/lib/constants";
import { cn } from "@/lib/utils";

type SimpleCaptureDemoProps = {
  title?: string;
  transcriptActive?: boolean;
  activeLine?: number;
  listening?: boolean;
  showTranscript?: boolean;
  className?: string;
};

export function SimpleCaptureDemo({
  title = HERO_DEMO.newMeetingTitle,
  transcriptActive = false,
  activeLine,
  listening = false,
  showTranscript = true,
  className,
}: SimpleCaptureDemoProps) {
  const preview =
    transcriptActive && activeLine !== undefined
      ? HERO_DEMO.transcript[activeLine]?.text
      : transcriptActive
        ? HERO_DEMO.interim
        : undefined;

  return (
    <div className={cn("flex min-h-[360px] flex-col bg-paper-elevated", className)}>
      <div
        className={cn(
          "grid min-h-0 flex-1",
          showTranscript ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        <section className="flex min-h-0 flex-col border-r border-border px-4 py-4 md:px-5 md:py-5">
          <h3 className="m-0 font-display text-2xl font-normal tracking-tight text-ink md:text-3xl">
            {title}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-paper-elevated px-2.5 py-1 text-xs font-medium text-ink-muted">
              <Calendar className="h-3 w-3" />
              Today
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-ink-muted">
            <List className="h-3.5 w-3.5" />
            <ListOrdered className="h-3.5 w-3.5" />
          </div>
          <p className="mt-4 flex-1 text-sm text-ink-muted">Write notes</p>
        </section>

        {showTranscript ? (
          <LiveTranscriptDemo
            active={transcriptActive}
            activeLine={activeLine}
            listening={listening}
            className="min-h-0 border-0"
          />
        ) : null}
      </div>

      <footer className="shrink-0 border-t border-border px-4 py-3 md:px-5">
        <SimpleTranscriptBarDemo
          active={transcriptActive || listening}
          preview={preview}
        />
      </footer>
    </div>
  );
}
