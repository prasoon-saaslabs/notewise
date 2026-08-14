"use client";

import {
  useReducedMotion,
  useScroll,
  useSpring,
  type UseScrollOptions,
} from "motion/react";
import { useRef } from "react";
import { scrollSpring } from "@/lib/motion";

export function useSmoothScroll<T extends HTMLElement = HTMLElement>(
  offset: NonNullable<UseScrollOptions["offset"]> = ["start end", "end start"]
) {
  const ref = useRef<T | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset });

  const smoothProgress = useSpring(
    scrollYProgress,
    prefersReducedMotion ? { stiffness: 1000, damping: 100 } : scrollSpring
  );

  return { ref, scrollYProgress: smoothProgress };
}
