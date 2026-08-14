"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { TESTIMONIALS } from "@/lib/constants";
import { TESTIMONIAL_IMAGES } from "@/lib/images";
import { FlyIn } from "@/components/ui/FlyIn";
import { cn } from "@/lib/utils";

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  const active = TESTIMONIALS[index];
  const image = TESTIMONIAL_IMAGES[index];

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <FlyIn className="max-w-2xl" direction="up" distance={32}>
          <p className="text-sm font-medium text-teal">Case studies</p>
          <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-ink md:text-5xl">
            A week in the life with NoteWise
          </h2>
        </FlyIn>

        <FlyIn direction="up" distance={48} delay={0.1} className="relative mt-14">
          <div className="grid min-h-[320px] overflow-hidden rounded-[40px] border border-border bg-paper-elevated lg:grid-cols-[1fr_1.1fr]">
            <div className="relative hidden min-h-[320px] lg:block">
              <AnimatePresence mode="wait">
                <motion.div
                  key={image.src}
                  initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: prefersReducedMotion ? 0 : -16 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0"
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="600px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-paper-elevated" />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex flex-col justify-center p-8 md:p-12">
              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={active.author}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="font-display text-2xl leading-snug tracking-tight text-ink md:text-3xl">
                    &ldquo;{active.quote}&rdquo;
                  </p>
                  <footer className="mt-8">
                    <p className="font-medium text-ink">{active.author}</p>
                    <p className="text-sm text-ink-muted">{active.role}</p>
                  </footer>
                </motion.blockquote>
              </AnimatePresence>

              <div className="mt-10 flex items-center gap-2">
                {TESTIMONIALS.map((item, i) => (
                  <button
                    key={item.author}
                    type="button"
                    aria-label={`Show case study from ${item.author}`}
                    onClick={() => setIndex(i)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      i === index ? "w-8 bg-teal" : "w-2 bg-border-strong",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </FlyIn>
      </div>
    </section>
  );
}
