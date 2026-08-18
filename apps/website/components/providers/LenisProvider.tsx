"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: 1,
        smoothWheel: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
