"use client";

import { motion } from "motion/react";
import { SpeakerChip } from "@notewise/ui";
import { TypewriterText } from "@/components/ui/TypewriterText";
import { HERO_DEMO } from "@/lib/constants";
import { typewriterLine, typewriterStagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

type LiveTranscriptDemoProps = {
  active?: boolean;
  activeLine?: number;
  className?: string;
};

export function LiveTranscriptDemo({
  active = true,
  activeLine,
  className,
}: LiveTranscriptDemoProps) {
  return (
    <div className={cn("flex min-h-[180px] flex-col", className)}>
      <div className="flex items-center gap-2 border-b border-border/80 px-4 py-2.5">
        <h3 className="m-0 text-sm font-medium text-teal">Live transcript</h3>
        {active ? (
          <span className="text-[0.62rem] font-semibold text-teal-hover">
            words appear as you speak
          </span>
        ) : null}
        <div className="ml-auto flex gap-1">
          <SpeakerChip label="You" kind="you" live={active} />
          <SpeakerChip label="Other" kind="other" />
        </div>
      </div>

      <motion.div
        className="flex-1 space-y-3 overflow-hidden px-4 py-4"
        variants={typewriterStagger}
        initial="hidden"
        animate={active ? "visible" : "hidden"}
      >
        {HERO_DEMO.transcript.map((line, i) => {
          const isActive = activeLine === undefined || activeLine === i;
          return (
            <motion.div
              key={`${line.speaker}-${i}`}
              variants={typewriterLine}
              className={cn("flex flex-wrap items-start gap-2", !isActive && "opacity-50")}
            >
              <SpeakerChip label={line.speaker} kind={line.kind} live={active && isActive} />
              <p className="m-0 flex-1 text-sm leading-relaxed text-ink-secondary">
                {active && isActive ? (
                  <TypewriterText text={line.text} active={active} speed={24} showCursor />
                ) : (
                  <span className={active && isActive ? "italic text-ink-muted" : ""}>
                    {line.text}
                  </span>
                )}
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
