"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AppDemoShell } from "@/components/demos/app/AppDemoShell";
import { CaptureToolbarDemo } from "@/components/demos/app/CaptureToolbarDemo";
import { LibraryNotesDemo } from "@/components/demos/app/LibraryNotesDemo";
import { LiveTranscriptDemo } from "@/components/demos/LiveTranscriptDemo";
import { MiniCaptureDemo } from "@/components/demos/app/MiniCaptureDemo";
import { PhaseStepperDemo } from "@/components/demos/app/PhaseStepperDemo";
import { ProfileSnapshotDemo } from "@/components/demos/app/ProfileSnapshotDemo";
import { pipelineStageVariants } from "@/lib/motion";

const STAGE_DURATION = 3200;
const STAGES = ["capture", "transcribe", "notes", "memory"] as const;
type Stage = (typeof STAGES)[number];

function CaptureStage() {
  return (
    <div className="relative">
      <CaptureToolbarDemo mode="live" timer="00:27" statusLine="Listening — PyAI Hear live" />
      <PhaseStepperDemo activeIndex={1} />
      <LiveTranscriptDemo active activeLine={0} />
      <div className="pointer-events-none absolute bottom-3 right-3 w-[220px] scale-[0.92]">
        <MiniCaptureDemo timer="00:16" />
      </div>
    </div>
  );
}

function TranscribeStage() {
  return (
    <div>
      <CaptureToolbarDemo mode="processing" timer="00:31" statusLine="Transcribing with PyAI Hear…" />
      <PhaseStepperDemo activeIndex={1} />
      <LiveTranscriptDemo active />
    </div>
  );
}

function NotesStage() {
  return (
    <div>
      <CaptureToolbarDemo mode="ready" timer="00:31" statusLine="Notes with receipts · citation gate pass" />
      <PhaseStepperDemo activeIndex={3} />
      <LibraryNotesDemo />
    </div>
  );
}

function MemoryStage() {
  return (
    <div>
      <CaptureToolbarDemo mode="idle" timer="—" statusLine="Profile · relationship memory across every call" />
      <ProfileSnapshotDemo progress={1} />
    </div>
  );
}

const stageContent: Record<Stage, () => React.ReactNode> = {
  capture: CaptureStage,
  transcribe: TranscribeStage,
  notes: NotesStage,
  memory: MemoryStage,
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
      <AppDemoShell title="Capture · live session">
        {prefersReducedMotion ? (
          <MemoryStage />
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
