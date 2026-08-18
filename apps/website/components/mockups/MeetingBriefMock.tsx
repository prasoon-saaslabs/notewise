"use client";

import { motion, useReducedMotion } from "motion/react";
import { LibraryNotesDemo } from "@/components/demos/app/LibraryNotesDemo";
import { SimpleCaptureDemo } from "@/components/demos/app/SimpleCaptureDemo";
import { UpcomingMeetsDemo } from "@/components/demos/app/UpcomingMeetsDemo";
import { HERO_DEMO } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Phase = "before" | "during" | "after";

export function MeetingBriefMock({
  phase,
  className,
  animated = false,
}: {
  phase: Phase;
  className?: string;
  animated?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animated && !prefersReducedMotion;

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
      className={cn(
        "overflow-hidden rounded-[28px] border border-border bg-paper-elevated shadow-[0_20px_60px_rgba(13,148,136,0.08)]",
        className,
      )}
    >
      {phase === "before" ? <UpcomingMeetsDemo /> : null}
      {phase === "during" ? (
        <SimpleCaptureDemo
          title={HERO_DEMO.meetingTitle}
          transcriptActive={shouldAnimate}
          activeLine={shouldAnimate ? 0 : undefined}
        />
      ) : null}
      {phase === "after" ? <LibraryNotesDemo /> : null}
    </motion.div>
  );
}
