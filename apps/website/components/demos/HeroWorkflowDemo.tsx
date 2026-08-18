"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AppDemoShell } from "@/components/demos/app/AppDemoShell";
import { LibraryNotesDemo } from "@/components/demos/app/LibraryNotesDemo";
import { SimpleCaptureDemo } from "@/components/demos/app/SimpleCaptureDemo";
import { UpcomingMeetsDemo } from "@/components/demos/app/UpcomingMeetsDemo";
import { HERO_DEMO } from "@/lib/constants";
import { pipelineStageVariants } from "@/lib/motion";

const STAGE_DURATION = 3200;
const STAGES = ["prep", "capture", "transcribe", "notes"] as const;
type Stage = (typeof STAGES)[number];

function PrepStage() {
  return <UpcomingMeetsDemo />;
}

function CaptureStage() {
  return (
    <SimpleCaptureDemo
      title={HERO_DEMO.newMeetingTitle}
      listening
      transcriptActive={false}
    />
  );
}

function TranscribeStage() {
  return (
    <SimpleCaptureDemo
      title={HERO_DEMO.meetingTitle}
      transcriptActive
      activeLine={0}
    />
  );
}

function NotesStage() {
  return <LibraryNotesDemo />;
}

const stageContent: Record<Stage, () => React.ReactNode> = {
  prep: PrepStage,
  capture: CaptureStage,
  transcribe: TranscribeStage,
  notes: NotesStage,
};

export function HeroWorkflowDemo({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const prefersReducedMotion = useReducedMotion();
  const [stageIndex, setStageIndex] = useState(0);
  const stage = STAGES[stageIndex];

  useEffect(() => {
    if (prefersReducedMotion) {
      setStageIndex(STAGES.length - 1);
      return;
    }
    if (!inView) return;

    const id = window.setInterval(() => {
      setStageIndex((i) => (i + 1) % STAGES.length);
    }, STAGE_DURATION);

    return () => window.clearInterval(id);
  }, [inView, prefersReducedMotion]);

  const StageComponent = stageContent[stage];

  return (
    <div ref={ref} className={className}>
      <AppDemoShell chrome={false}>
        {prefersReducedMotion ? (
          <NotesStage />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              variants={pipelineStageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <StageComponent />
            </motion.div>
          </AnimatePresence>
        )}
      </AppDemoShell>
    </div>
  );
}
