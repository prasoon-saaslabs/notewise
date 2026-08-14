"use client";

import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { AppDemoShell } from "@/components/demos/app/AppDemoShell";
import { LibraryNotesDemo } from "@/components/demos/app/LibraryNotesDemo";
import { SimpleCaptureDemo } from "@/components/demos/app/SimpleCaptureDemo";
import { UpcomingMeetsDemo } from "@/components/demos/app/UpcomingMeetsDemo";
import { HERO_DEMO } from "@/lib/constants";
import { cn } from "@/lib/utils";

type PipelineStageDemoProps = {
  progress: MotionValue<number>;
  className?: string;
};

export function PipelineStageDemo({ progress, className }: PipelineStageDemoProps) {
  const prefersReducedMotion = useReducedMotion();

  const stage0 = useTransform(progress, [0, 0.22], [1, 0]);
  const stage1 = useTransform(progress, [0.12, 0.22, 0.47, 0.52], [0, 1, 1, 0]);
  const stage2 = useTransform(progress, [0.42, 0.52, 0.72, 0.77], [0, 1, 1, 0]);
  const stage3 = useTransform(progress, [0.67, 0.77, 1], [0, 1, 1]);

  if (prefersReducedMotion) {
    return (
      <AppDemoShell chrome={false} className={className}>
        <LibraryNotesDemo />
      </AppDemoShell>
    );
  }

  return (
    <AppDemoShell chrome={false} className={cn("min-h-[420px]", className)}>
      <div className="relative min-h-[380px]">
        <motion.div style={{ opacity: stage0 }} className="absolute inset-0">
          <UpcomingMeetsDemo />
        </motion.div>

        <motion.div style={{ opacity: stage1 }} className="absolute inset-0">
          <SimpleCaptureDemo
            title={HERO_DEMO.newMeetingTitle}
            listening
            transcriptActive={false}
          />
        </motion.div>

        <motion.div style={{ opacity: stage2 }} className="absolute inset-0">
          <SimpleCaptureDemo
            title={HERO_DEMO.meetingTitle}
            transcriptActive
            activeLine={0}
          />
        </motion.div>

        <motion.div style={{ opacity: stage3 }} className="absolute inset-0">
          <LibraryNotesDemo />
        </motion.div>
      </div>
    </AppDemoShell>
  );
}
