"use client";

import { motion, useReducedMotion, useTransform } from "motion/react";
import { ScrollImage } from "@/components/ui/ScrollImage";
import { FlyIn } from "@/components/ui/FlyIn";
import { GALLERY, GALLERY_STATS } from "@/lib/constants";
import { flyInHidden, flyInVisible, flySpring } from "@/lib/motion";
import { IMAGES } from "@/lib/images";
import { useSmoothScroll } from "@/lib/use-smooth-scroll";

export function MeetingGallery() {
  const prefersReducedMotion = useReducedMotion();
  const { ref, scrollYProgress } = useSmoothScroll(["start end", "end start"]);

  const x = useTransform(
    scrollYProgress,
    [0, 1],
    ["2%", prefersReducedMotion ? "2%" : "-14%"],
  );

  return (
    <section ref={ref} className="overflow-hidden py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <FlyIn className="max-w-2xl" direction="up" distance={36}>
          <p className="text-sm font-medium text-teal">{GALLERY.eyebrow}</p>
          <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-ink md:text-5xl">
            {GALLERY.title}
          </h2>
          <p className="mt-4 text-lg text-ink-secondary">{GALLERY.description}</p>
        </FlyIn>
      </div>

      <motion.div
        style={{ x }}
        className="mt-12 flex w-max gap-5 px-4 md:gap-6 md:px-6"
      >
        {IMAGES.gallery.map((image, index) => {
          const fromLeft = index % 2 === 0;
          const caption = GALLERY.captions[index];
          const stat = GALLERY_STATS[index];
          return (
            <motion.div
              key={image.src}
              initial={
                prefersReducedMotion
                  ? false
                  : flyInHidden(fromLeft ? "left" : "right", 56)
              }
              whileInView={prefersReducedMotion ? undefined : flyInVisible}
              viewport={{ once: true, margin: "-8% 0px" }}
              transition={{ ...flySpring, delay: index * 0.06 }}
              whileHover={prefersReducedMotion ? undefined : { y: -6 }}
              className="w-[280px] shrink-0 md:w-[340px]"
            >
              <div className="relative">
                <ScrollImage
                  image={image}
                  className="aspect-[4/5] w-full rounded-[28px] shadow-[0_24px_80px_rgba(13,148,136,0.12)]"
                  parallax={fromLeft ? 22 : -22}
                  overlay
                  sizes="340px"
                />
                <div className="glass-badge-dark absolute bottom-4 left-4 right-4 rounded-full px-4 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/88">
                    {stat}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-center text-sm font-medium text-ink-secondary">
                {caption}
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
