/** Premium editorial easing — fast out, no bounce */
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeOutSoft = [0, 0, 0.2, 1] as const;

export const scrollSpring = {
  stiffness: 85,
  damping: 26,
  mass: 0.6,
  restDelta: 0.001,
} as const;

export const scrubSpring = {
  stiffness: 120,
  damping: 32,
  mass: 0.5,
  restDelta: 0.001,
} as const;

export const flySpring = {
  type: "spring" as const,
  stiffness: 90,
  damping: 22,
  mass: 0.7,
};

export type FlyDirection = "up" | "down" | "left" | "right";

export function flyInHidden(direction: FlyDirection, distance = 40) {
  switch (direction) {
    case "left":
      return { opacity: 0, x: -distance, y: 0 };
    case "right":
      return { opacity: 0, x: distance, y: 0 };
    case "down":
      return { opacity: 0, x: 0, y: distance };
    default:
      return { opacity: 0, x: 0, y: distance };
  }
}

export const flyInVisible = {
  opacity: 1,
  x: 0,
  y: 0,
};

export const revealUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: flySpring,
  },
};

export const revealUpReduced = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.35, ease: easeOutSoft },
  },
};

export const scaleReveal = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.65, ease: easeOutExpo },
  },
};

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
};

export const staggerChild = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: flySpring,
  },
};

export const wordStaggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.035, delayChildren: 0.05 },
  },
};

export const wordStaggerChild = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeOutExpo },
  },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: easeOutSoft },
  },
};

export const pipelineStageVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: easeOutExpo },
  },
  exit: {
    opacity: 0,
    y: -12,
    filter: "blur(4px)",
    transition: { duration: 0.35, ease: easeOutSoft },
  },
};

export const typewriterStagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

export const typewriterLine = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: easeOutExpo },
  },
};

export const chipPop = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 22 },
  },
};
