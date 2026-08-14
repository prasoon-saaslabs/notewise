"use client";

import Image from "next/image";
import { motion, useTransform } from "motion/react";
import { Shield } from "lucide-react";
import { PRIVACY, TRUST_PILLS } from "@/lib/constants";
import { IMAGES } from "@/lib/images";
import { FlyIn } from "@/components/ui/FlyIn";
import { flyInHidden, flyInVisible, flySpring } from "@/lib/motion";
import { useSmoothScroll } from "@/lib/use-smooth-scroll";

export function Privacy() {
  const { ref, scrollYProgress } = useSmoothScroll(["start end", "end start"]);
  const bgY = useTransform(scrollYProgress, [0, 1], ["-4%", "4%"]);

  return (
    <section id="privacy" ref={ref} className="py-8 md:py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <FlyIn direction="up" distance={48}>
          <div className="relative overflow-hidden rounded-[40px] bg-dark-room">
            <motion.div style={{ y: bgY }} className="absolute inset-0 -top-[10%] h-[120%]">
              <Image
                src={IMAGES.privacyBg.src}
                alt=""
                fill
                sizes="1200px"
                className="object-cover opacity-30"
                aria-hidden
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-br from-dark-room via-dark-room/95 to-teal-950/90" />

            <div className="relative px-6 py-14 text-white md:px-12 md:py-16">
              <div className="mx-auto max-w-3xl text-center">
                <div className="mx-auto mb-6 inline-flex rounded-2xl bg-teal/20 p-3">
                  <Shield className="h-6 w-6 text-teal-muted" aria-hidden />
                </div>
                <h2 className="font-display text-4xl leading-tight tracking-tight md:text-5xl">
                  {PRIVACY.title}
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-white/70">
                  {PRIVACY.description}
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {TRUST_PILLS.map((pill, i) => (
                    <motion.span
                      key={pill}
                      initial={flyInHidden("up", 16)}
                      whileInView={flyInVisible}
                      viewport={{ once: true }}
                      transition={{ ...flySpring, delay: 0.2 + i * 0.06 }}
                      className="rounded-full border border-teal/30 bg-teal/10 px-4 py-2 text-sm text-teal-muted"
                    >
                      {pill}
                    </motion.span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FlyIn>
      </div>
    </section>
  );
}
