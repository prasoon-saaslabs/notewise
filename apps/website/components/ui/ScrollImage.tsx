"use client";

import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useSmoothScroll } from "@/lib/use-smooth-scroll";
import type { AppImage } from "@/lib/images";
import { cn } from "@/lib/utils";

type ScrollImageProps = {
  image: AppImage;
  className?: string;
  imageClassName?: string;
  parallax?: number;
  priority?: boolean;
  sizes?: string;
  overlay?: boolean;
};

export function ScrollImage({
  image,
  className,
  imageClassName,
  parallax = 0,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  overlay = false,
}: ScrollImageProps) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, scrollYProgress } = useSmoothScroll<HTMLDivElement>(["start end", "end start"]);

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [parallax * 0.35, prefersReducedMotion || parallax === 0 ? 0 : -parallax * 0.35],
  );
  const scale = useTransform(
    scrollYProgress,
    [0, 0.45, 1],
    prefersReducedMotion ? [1, 1, 1] : [1.03, 1, 0.99],
  );

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <motion.div style={{ y, scale }} className="relative h-full w-full">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority={priority}
          sizes={sizes}
          className={cn("object-cover", imageClassName)}
        />
      </motion.div>
      {overlay && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
      )}
    </div>
  );
}

type ParallaxPhotoProps = {
  image: AppImage;
  className?: string;
  y: MotionValue<number>;
  x?: MotionValue<number>;
  rotate?: number;
  priority?: boolean;
};

export function ParallaxPhoto({
  image,
  className,
  y,
  x,
  rotate = 0,
  priority = false,
}: ParallaxPhotoProps) {
  return (
    <motion.div
      style={{ y, x, rotate }}
      className={cn(
        "overflow-hidden rounded-[28px] border border-border shadow-[0_24px_80px_rgba(13,148,136,0.14)]",
        className,
      )}
    >
      <div className="relative aspect-[3/4] w-full">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority={priority}
          sizes="260px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-teal-950/50 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-xs font-medium text-white/90">Bot-free · menu-bar capture</p>
        </div>
      </div>
    </motion.div>
  );
}
