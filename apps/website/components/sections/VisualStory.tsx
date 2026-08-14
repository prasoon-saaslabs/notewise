"use client";

import { motion, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { useState } from "react";
import { MemoryGraphDemo } from "@/components/demos/MemoryGraphDemo";
import { FlyIn } from "@/components/ui/FlyIn";
import { VISUAL_STORY } from "@/lib/constants";
import { flyInHidden, flyInVisible, flySpring } from "@/lib/motion";
import { useSmoothScroll } from "@/lib/use-smooth-scroll";

function ScrollLinkedGraph({ progress }: { progress: MotionValue<number> }) {
  const prefersReducedMotion = useReducedMotion();
  const [p, setP] = useState(prefersReducedMotion ? 1 : 0);

  useMotionValueEvent(progress, "change", (v) => {
    if (!prefersReducedMotion) setP(v);
  });

  return <MemoryGraphDemo progress={p} />;
}

export function VisualStory() {
  const prefersReducedMotion = useReducedMotion();
  const { ref, scrollYProgress } = useSmoothScroll(["start start", "end end"]);

  const graphProgress = useTransform(scrollYProgress, [0.1, 0.55, 0.95], [0, 1, 1]);
  const cardOpacity = useTransform(scrollYProgress, [0.5, 0.75], [0, 1]);
  const demoScale = useTransform(
    scrollYProgress,
    [0, 0.45, 1],
    prefersReducedMotion ? [1, 1, 1] : [0.94, 1, 0.98],
  );

  return (
    <section id="memory" ref={ref} className="relative h-[160vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 md:grid-cols-2 md:px-6">
          <FlyIn direction="left" distance={48} className="max-w-xl">
            <p className="text-sm font-medium text-teal">{VISUAL_STORY.eyebrow}</p>
            <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-ink md:text-5xl">
              {VISUAL_STORY.title}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-secondary">
              {VISUAL_STORY.description}
            </p>
            <ul className="mt-8 space-y-4">
              {VISUAL_STORY.bullets.map((item, i) => (
                <motion.li
                  key={item}
                  initial={prefersReducedMotion ? false : flyInHidden("left", 28)}
                  whileInView={prefersReducedMotion ? undefined : flyInVisible}
                  viewport={{ once: true, margin: "-10% 0px" }}
                  transition={{ ...flySpring, delay: 0.15 + i * 0.08 }}
                  className="flex items-center gap-3 text-ink-secondary"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-muted text-xs font-bold text-teal">
                    {i + 1}
                  </span>
                  {item}
                </motion.li>
              ))}
            </ul>
          </FlyIn>

          <motion.div
            style={{ scale: demoScale }}
            className="demo-window relative p-0 md:p-0"
            initial={prefersReducedMotion ? false : flyInHidden("right", 64)}
            whileInView={prefersReducedMotion ? undefined : flyInVisible}
            viewport={{ once: true, margin: "-12% 0px" }}
            transition={{ ...flySpring, delay: 0.1 }}
          >
            <div className="border-b border-border/80 bg-white/55 px-4 py-2.5 backdrop-blur-sm">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-teal">
                Profile · relationship memory
              </p>
            </div>
            <ScrollLinkedGraph progress={graphProgress} />
            <motion.div
              style={{ opacity: cardOpacity }}
              className="mx-4 mb-4 rounded-2xl border border-teal/15 bg-teal-subtle/60 p-4"
            >
              <p className="text-xs font-medium text-teal">{VISUAL_STORY.cardLabel}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                {VISUAL_STORY.cardBody}
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
