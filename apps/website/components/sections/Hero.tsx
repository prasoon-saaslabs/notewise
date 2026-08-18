"use client";

import { motion, useReducedMotion, useTransform } from "motion/react";
import { HeroWorkflowDemo } from "@/components/demos/HeroWorkflowDemo";
import { Button } from "@/components/ui/Button";
import { Highlight } from "@/components/ui/Highlight";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { HERO } from "@/lib/constants";
import { GITHUB_URL } from "@/lib/siteConfig";
import { flySpring, staggerContainer, staggerChild } from "@/lib/motion";
import { useSmoothScroll } from "@/lib/use-smooth-scroll";

export function Hero() {
  const prefersReducedMotion = useReducedMotion();
  const { ref, scrollYProgress } = useSmoothScroll<HTMLElement>(["start start", "end start"]);

  const demoScale = useTransform(scrollYProgress, [0, 1], [1, prefersReducedMotion ? 1 : 0.94]);
  const demoY = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 32]);
  const demoOpacity = useTransform(scrollYProgress, [0, 0.85], [1, prefersReducedMotion ? 1 : 0.6]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden pb-16 pt-28 md:pb-24 md:pt-36"
    >
      <div className="pointer-events-none absolute inset-0 editorial-grid opacity-60" />
      <div className="pointer-events-none absolute inset-0 paper-grain opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--teal-glow),transparent_55%)]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-2 md:gap-10 md:px-6 lg:gap-16">
        <motion.div
          className="max-w-xl md:max-w-none"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10% 0px" }}
          variants={staggerContainer}
        >
          <motion.p
            variants={staggerChild}
            className="mb-4 text-sm font-medium tracking-wide text-teal"
          >
            {HERO.eyebrow}
          </motion.p>

          <SplitReveal
            as="h1"
            text={`${HERO.headline} — ${HERO.headlineAccent}`}
            className="font-display text-[clamp(2.25rem,5.5vw,3.75rem)] leading-[0.98] tracking-tight text-ink"
          />

          <motion.p
            variants={staggerChild}
            className="mt-6 text-lg leading-relaxed text-ink-secondary md:text-xl"
          >
            Capture calls without a bot. Every claim links to the transcript.{" "}
            <Highlight>Remember relationships</Highlight> across every meeting —
            and <Highlight>ask out loud</Highlight>.
          </motion.p>

          <motion.div
            variants={staggerChild}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Button href="/download" size="lg" variant="glass">
              {HERO.ctaPrimary}
            </Button>
            <Button href={GITHUB_URL} variant="glass-muted" size="lg" external>
              {HERO.ctaSecondary}
            </Button>
          </motion.div>

          <motion.p
            variants={staggerChild}
            className="mt-4 text-sm text-ink-muted"
          >
            {HERO.footnote}
          </motion.p>
        </motion.div>

        <motion.div
          style={{ scale: demoScale, y: demoY, opacity: demoOpacity }}
          className="relative"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 48 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-8% 0px" }}
          transition={{ ...flySpring, delay: 0.15 }}
        >
          <div className="absolute -inset-4 rounded-[32px] bg-teal/8 blur-2xl" />
          <HeroWorkflowDemo />
        </motion.div>
      </div>
    </section>
  );
}
