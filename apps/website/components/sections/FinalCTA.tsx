"use client";

import Image from "next/image";
import { motion, useTransform } from "motion/react";
import { Button } from "@/components/ui/Button";
import { FINAL_CTA } from "@/lib/constants";
import { GITHUB_URL } from "@/lib/siteConfig";
import { IMAGES } from "@/lib/images";
import { staggerChild, staggerContainer } from "@/lib/motion";
import { useSmoothScroll } from "@/lib/use-smooth-scroll";

export function FinalCTA() {
  const { ref, scrollYProgress } = useSmoothScroll(["start end", "end start"]);
  const bgY = useTransform(scrollYProgress, [0, 1], ["-3%", "3%"]);

  return (
    <section ref={ref} className="pb-20 pt-8 md:pb-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="relative overflow-hidden rounded-[40px] border border-border">
          <motion.div style={{ y: bgY }} className="absolute inset-0 -top-[10%] h-[120%]">
            <Image
              src={IMAGES.ctaBg.src}
              alt=""
              fill
              sizes="1200px"
              className="object-cover"
              aria-hidden
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-br from-teal-950/90 via-dark-room/85 to-teal-900/80" />

          <motion.div
            className="relative px-6 py-14 text-center text-white md:px-12 md:py-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-10% 0px" }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={staggerChild}
              className="font-display text-4xl leading-tight tracking-tight md:text-5xl"
            >
              {FINAL_CTA.title}
            </motion.h2>
            <motion.p
              variants={staggerChild}
              className="mx-auto mt-4 max-w-xl text-lg text-white/75"
            >
              {FINAL_CTA.description}
            </motion.p>
            <motion.div
              variants={staggerChild}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Button href="/download" size="lg" variant="glass-dark">
                {FINAL_CTA.ctaPrimary}
              </Button>
              <Button href={GITHUB_URL} variant="glass-dark-muted" size="lg" external>
                {FINAL_CTA.ctaSecondary}
              </Button>
            </motion.div>
            <motion.p
              variants={staggerChild}
              className="mt-4 text-sm text-white/60"
            >
              {FINAL_CTA.footnote}
            </motion.p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
