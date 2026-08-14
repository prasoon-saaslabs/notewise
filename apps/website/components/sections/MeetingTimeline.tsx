"use client";

import { AnimatePresence, motion, useReducedMotion, useTransform } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { MeetingBriefMock } from "@/components/mockups/MeetingBriefMock";
import { MEETING_PHASES } from "@/lib/constants";
import { PHASE_IMAGES } from "@/lib/images";
import { FlyIn } from "@/components/ui/FlyIn";
import { useSmoothScroll } from "@/lib/use-smooth-scroll";
import { cn } from "@/lib/utils";

type PhaseId = (typeof MEETING_PHASES)[number]["id"];

export function MeetingTimeline() {
  const [active, setActive] = useState<PhaseId>("before");
  const activePhase = MEETING_PHASES.find((p) => p.id === active)!;
  const prefersReducedMotion = useReducedMotion();
  const { ref: imageRef, scrollYProgress } = useSmoothScroll<HTMLDivElement>([
    "start end",
    "end start",
  ]);
  const imageY = useTransform(
    scrollYProgress,
    [0, 1],
    [16, prefersReducedMotion ? 0 : -24],
  );

  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <FlyIn className="max-w-2xl" direction="up" distance={32}>
          <p className="text-sm font-medium text-teal">How it works</p>
          <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-ink md:text-5xl">
            NoteWise helps you before, during, and after your meetings
          </h2>
        </FlyIn>

        <div className="mt-14 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <FlyIn
            direction="left"
            distance={40}
            className="space-y-3 lg:sticky lg:top-28 lg:self-start"
          >
            {MEETING_PHASES.map((phase) => {
              const isActive = phase.id === active;
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => setActive(phase.id)}
                  className={cn(
                    "relative w-full overflow-hidden rounded-2xl border px-5 py-4 text-left transition-all duration-300",
                    isActive
                      ? "border-teal/30 bg-paper-elevated shadow-[0_12px_40px_rgba(13,148,136,0.1)]"
                      : "border-transparent bg-transparent hover:bg-paper-muted",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="timeline-active"
                      className="absolute inset-y-0 left-0 w-1 bg-teal"
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  <p
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      isActive ? "text-teal" : "text-ink-muted",
                    )}
                  >
                    {phase.label}
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-display text-xl",
                      isActive ? "text-ink" : "text-ink-secondary",
                    )}
                  >
                    {phase.title}
                  </p>
                </button>
              );
            })}
          </FlyIn>

          <div ref={imageRef}>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="mb-6 text-lg leading-relaxed text-ink-secondary">
                  {activePhase.description}
                </p>

                <motion.div
                  style={{ y: imageY }}
                  className="relative mb-6 overflow-hidden rounded-[28px] border border-border"
                >
                  <div className="relative aspect-[16/10] w-full">
                    <Image
                      src={PHASE_IMAGES[active].src}
                      alt={PHASE_IMAGES[active].alt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 55vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-teal-950/35 via-transparent to-transparent" />
                  </div>
                </motion.div>

                <MeetingBriefMock phase={active} animated />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
