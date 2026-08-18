"use client";

import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { PipelineStageDemo } from "@/components/demos/PipelineStageDemo";
import { FlyIn } from "@/components/ui/FlyIn";
import { PIPELINE_STAGES, SHOWCASE } from "@/lib/constants";
import { useSmoothScroll } from "@/lib/use-smooth-scroll";
import { cn } from "@/lib/utils";

export function TransformationPipeline() {
  const prefersReducedMotion = useReducedMotion();
  const { ref, scrollYProgress } = useSmoothScroll(["start start", "end end"]);

  return (
    <section ref={ref} className="relative h-[200vh]">
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden py-20">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 md:grid-cols-[0.95fr_1.05fr] md:gap-14 md:px-6">
          <FlyIn direction="left" distance={40} className="max-w-lg">
            <p className="text-sm font-medium text-teal">{SHOWCASE.eyebrow}</p>
            <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-ink md:text-5xl">
              {SHOWCASE.title}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-secondary">
              {SHOWCASE.description}
            </p>

            <ul className="mt-8 space-y-3">
              {PIPELINE_STAGES.map((stage, index) => (
                <StageNavItem
                  key={stage.id}
                  stage={stage}
                  index={index}
                  progress={scrollYProgress}
                  prefersReducedMotion={!!prefersReducedMotion}
                />
              ))}
            </ul>
          </FlyIn>

          <PipelineStageDemo progress={scrollYProgress} />
        </div>
      </div>
    </section>
  );
}

function StageNavItem({
  stage,
  index,
  progress,
  prefersReducedMotion,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  index: number;
  progress: MotionValue<number>;
  prefersReducedMotion: boolean;
}) {
  const thresholds = [0, 0.25, 0.5, 0.75];
  const start = thresholds[index] ?? 0;
  const end = thresholds[index + 1] ?? 1;
  const opacity = useTransform(progress, [start - 0.05, start, end - 0.05, end], [0.45, 1, 1, 0.45]);
  const x = useTransform(progress, [start, end], prefersReducedMotion ? [0, 0] : [0, 4]);

  return (
    <motion.li style={{ opacity, x }} className="list-none">
      <div
        className={cn(
          "rounded-2xl border px-4 py-3 transition-colors duration-300",
          "border-transparent bg-transparent",
        )}
      >
        <span className="pipeline-stage pipeline-stage-active mb-2">{stage.label}</span>
        <p className="font-display text-lg text-ink">{stage.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{stage.description}</p>
      </div>
    </motion.li>
  );
}
