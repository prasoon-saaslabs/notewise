"use client";

import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { NotepadMock } from "@/components/mockups/NotepadMock";
import { FlyIn } from "@/components/ui/FlyIn";
import { SHOWCASE } from "@/lib/constants";
import { flyInHidden, flyInVisible, flySpring } from "@/lib/motion";
import { IMAGES } from "@/lib/images";
import { useSmoothScroll } from "@/lib/use-smooth-scroll";

function FloatingCard({
  children,
  className,
  y,
  rotate,
  enterFrom,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  y: MotionValue<number>;
  rotate?: MotionValue<number>;
  enterFrom: "left" | "right" | "up";
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const direction = enterFrom === "left" ? "left" : enterFrom === "right" ? "right" : "up";
  const distance = enterFrom === "up" ? 56 : 80;

  return (
    <motion.div
      style={{ y, rotate }}
      className={className}
      initial={prefersReducedMotion ? false : flyInHidden(direction, distance)}
      whileInView={prefersReducedMotion ? undefined : flyInVisible}
      viewport={{ once: true, margin: "-15% 0px" }}
      transition={{ ...flySpring, delay }}
    >
      {children}
    </motion.div>
  );
}

export function ShowcaseParallax() {
  const prefersReducedMotion = useReducedMotion();
  const { ref, scrollYProgress } = useSmoothScroll(["start end", "end start"]);

  const y1 = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : -60]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : -90]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : -45]);
  const rotate1 = useTransform(scrollYProgress, [0, 1], [-3, prefersReducedMotion ? -3 : 1]);
  const rotate3 = useTransform(scrollYProgress, [0, 1], [2, prefersReducedMotion ? 2 : -1]);

  return (
    <section ref={ref} className="relative overflow-hidden py-20 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-teal-subtle/50 via-transparent to-teal-subtle/30" />

      <div className="relative mx-auto max-w-6xl px-4 md:px-6">
        <FlyIn className="mx-auto max-w-2xl text-center" direction="up" distance={36}>
          <p className="text-sm font-medium text-teal">{SHOWCASE.eyebrow}</p>
          <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-ink md:text-5xl">
            {SHOWCASE.title}
          </h2>
          <p className="mt-4 text-lg text-ink-secondary">{SHOWCASE.description}</p>
        </FlyIn>

        <div className="relative mx-auto mt-16 h-[560px] max-w-5xl md:h-[640px]">
          <FloatingCard
            y={y1}
            rotate={rotate1}
            enterFrom="left"
            delay={0.05}
            className="absolute left-0 top-12 z-10 w-[54%] md:left-0 md:w-[48%]"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-paper-elevated shadow-[0_24px_80px_rgba(13,148,136,0.12)]">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={IMAGES.showcaseTranscript.src}
                  alt={IMAGES.showcaseTranscript.alt}
                  fill
                  sizes="400px"
                  className="object-cover opacity-90"
                />
              </div>
              <div className="p-4">
                <p className="text-xs font-medium text-ink-muted">Live transcript</p>
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink-secondary">
                  {SHOWCASE.transcriptSnippet}
                </p>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard
            y={y2}
            enterFrom="up"
            delay={0.12}
            className="absolute left-1/2 top-0 z-20 w-[82%] -translate-x-1/2 md:w-[70%]"
          >
            <NotepadMock />
          </FloatingCard>

          <FloatingCard
            y={y3}
            rotate={rotate3}
            enterFrom="right"
            delay={0.18}
            className="absolute bottom-0 right-0 z-10 w-[50%] md:w-[44%]"
          >
            <div className="overflow-hidden rounded-2xl border border-teal/20 bg-teal-muted shadow-[0_20px_60px_rgba(13,148,136,0.16)]">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={IMAGES.showcaseMemory.src}
                  alt={IMAGES.showcaseMemory.alt}
                  fill
                  sizes="380px"
                  className="object-cover mix-blend-multiply opacity-80"
                />
              </div>
              <div className="p-4">
                <p className="text-xs font-medium text-teal">Relationship memory</p>
                <p className="mt-2 text-xs leading-relaxed text-ink">
                  {SHOWCASE.memorySnippet}
                </p>
              </div>
            </div>
          </FloatingCard>
        </div>
      </div>
    </section>
  );
}
