"use client";

import {
  motion,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useRef, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Lock,
  MessageSquare,
  Users,
  Video,
} from "lucide-react";
import { FeatureDemoThumb } from "@/components/ui/FeatureDemoThumb";
import { FlyIn } from "@/components/ui/FlyIn";
import { FEATURES } from "@/lib/constants";
import { flyInHidden, flyInVisible, flySpring } from "@/lib/motion";
import { useSmoothScroll } from "@/lib/use-smooth-scroll";
import { cn } from "@/lib/utils";

const iconMap = {
  users: Users,
  video: Video,
  lock: Lock,
  calendar: Calendar,
  check: CheckCircle2,
  message: MessageSquare,
} as const;

export function Features() {
  const prefersReducedMotion = useReducedMotion();
  const listRef = useRef<HTMLUListElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { ref, scrollYProgress } = useSmoothScroll(["start end", "end start"]);
  const bgY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, prefersReducedMotion ? 0 : -50],
  );

  return (
    <section id="features" ref={ref} className="relative overflow-hidden py-20 md:py-28">
      <motion.div
        style={{ y: bgY }}
        className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-teal/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-4 md:px-6">
        <FlyIn className="max-w-2xl" direction="up" distance={32}>
          <p className="text-sm font-medium text-teal">MVP · Phase 0</p>
          <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-ink md:text-5xl">
            Parity where it matters. Differentiators where we win.
          </h2>
          <p className="mt-4 text-lg text-ink-secondary">
            Nine features in the hackathon build — bot-free capture, cited notes, cross-meeting memory,
            live copilot, and voice Q&A on your own machine.
          </p>
        </FlyIn>

        <ul ref={listRef} className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = iconMap[feature.icon];
            const fromLeft = index % 3 === 0;
            const fromRight = index % 3 === 2;
            const direction = fromLeft ? "left" : fromRight ? "right" : "up";
            const isHovered = hoveredIndex === index;

            return (
              <motion.li
                key={feature.title}
                onHoverStart={() => setHoveredIndex(index)}
                onHoverEnd={() => setHoveredIndex(null)}
                initial={
                  prefersReducedMotion
                    ? false
                    : flyInHidden(direction, direction === "up" ? 40 : 52)
                }
                whileInView={prefersReducedMotion ? undefined : flyInVisible}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ ...flySpring, delay: (index % 3) * 0.07 }}
                whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                className={cn(
                  "group overflow-hidden rounded-[28px] border border-border bg-paper-elevated transition-shadow duration-300 hover:shadow-[0_20px_60px_rgba(13,148,136,0.1)]",
                )}
              >
                <FeatureDemoThumb icon={feature.icon} active={isHovered} />
                <div className="p-6">
                  <motion.div
                    className="mb-4 inline-flex rounded-2xl bg-teal-muted p-3 text-teal"
                    animate={isHovered ? { scale: 1.08, rotate: -3 } : { scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </motion.div>
                  <h3 className="font-display text-xl text-ink">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                    {feature.description}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
