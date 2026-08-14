"use client";

import { motion } from "motion/react";
import { Copy, X } from "lucide-react";
import { TypewriterText } from "@/components/ui/TypewriterText";
import { HERO_DEMO } from "@/lib/constants";
import { typewriterLine, typewriterStagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

type LiveTranscriptDemoProps = {
  active?: boolean;
  activeLine?: number;
  listening?: boolean;
  className?: string;
};

export function LiveTranscriptDemo({
  active = true,
  activeLine,
  listening = false,
  className,
}: LiveTranscriptDemoProps) {
  const empty = listening || (!active && activeLine === undefined);

  return (
    <div className={cn("flex min-h-[180px] min-w-0 flex-col", className)}>
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <h3 className="m-0 text-sm font-medium text-teal">Live transcript</h3>
        <span className="rounded-full bg-paper-muted px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-ink-muted">
          {listening ? "Live" : active ? "Live" : "Transcript"}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted">
            <Copy className="h-3.5 w-3.5" />
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted">
            <X className="h-3.5 w-3.5" />
          </span>
        </div>
      </header>

      <motion.div
        className="min-h-0 flex-1 overflow-hidden px-4 py-4"
        variants={typewriterStagger}
        initial="hidden"
        animate={active || listening ? "visible" : "hidden"}
      >
        {empty ? (
          <p className="m-0 text-sm text-ink-muted">Listening…</p>
        ) : (
          <div className="text-sm leading-relaxed text-ink-secondary">
            {HERO_DEMO.transcript.map((line, i) => {
              const isActive = activeLine === undefined || activeLine === i;
              const showLine = activeLine === undefined || i <= (activeLine ?? 0);

              if (!showLine) return null;

              return (
                <motion.p
                  key={`${line.speaker}-${i}`}
                  variants={typewriterLine}
                  className={cn("m-0 mb-2", !isActive && "opacity-70")}
                >
                  <span className="font-semibold text-teal-hover">{line.speaker}: </span>
                  {active && isActive ? (
                    <TypewriterText text={line.text} active={active} speed={28} showCursor />
                  ) : (
                    line.text
                  )}
                </motion.p>
              );
            })}
            {active && activeLine !== undefined ? (
              <p className="m-0 italic text-ink-muted">{HERO_DEMO.interim}</p>
            ) : null}
          </div>
        )}
      </motion.div>
    </div>
  );
}
