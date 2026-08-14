"use client";

import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { AppDemoShell } from "@/components/demos/app/AppDemoShell";
import { CaptureToolbarDemo } from "@/components/demos/app/CaptureToolbarDemo";
import { LibraryNotesDemo } from "@/components/demos/app/LibraryNotesDemo";
import { LiveTranscriptDemo } from "@/components/demos/LiveTranscriptDemo";
import { PhaseStepperDemo } from "@/components/demos/app/PhaseStepperDemo";
import { ProfileSnapshotDemo } from "@/components/demos/app/ProfileSnapshotDemo";
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
      <AppDemoShell title="Library · notes with receipts" className={className}>
        <LibraryNotesDemo animate={false} />
      </AppDemoShell>
    );
  }

  return (
    <AppDemoShell title="How a call becomes memory" className={cn("min-h-[420px]", className)}>
      <div className="relative min-h-[380px]">
        <motion.div style={{ opacity: stage0 }} className="absolute inset-0">
          <CaptureToolbarDemo mode="live" timer="00:14" statusLine="Menu-bar · mic + system audio" />
          <LiveTranscriptDemo active={false} />
        </motion.div>

        <motion.div style={{ opacity: stage1 }} className="absolute inset-0">
          <CaptureToolbarDemo mode="processing" timer="00:27" statusLine="Transcribing with PyAI Hear…" />
          <PhaseStepperDemo activeIndex={1} />
          <LiveTranscriptDemo active />
        </motion.div>

        <motion.div style={{ opacity: stage2 }} className="absolute inset-0">
          <CaptureToolbarDemo mode="ready" timer="00:31" statusLine="Citation gate · 6 cited · 0 blocked" />
          <PhaseStepperDemo activeIndex={3} />
          <LibraryNotesDemo />
        </motion.div>

        <motion.div style={{ opacity: stage3 }} className="absolute inset-0">
          <CaptureToolbarDemo mode="idle" timer="—" statusLine="People · cross-meeting intelligence" />
          <ProfileSnapshotDemo progress={1} />
        </motion.div>
      </div>
    </AppDemoShell>
  );
}
