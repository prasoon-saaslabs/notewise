import { useLayoutEffect, useRef, useState } from "react";

/** Keeps overlay visible for at least minMs so regen/mode-change animations are noticeable. */
export function useRegeneratingOverlay(active: boolean, minMs = 1200) {
  const [hold, setHold] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (active) {
      startedAtRef.current = Date.now();
      setHold(true);
      return;
    }

    if (!startedAtRef.current) {
      setHold(false);
      return;
    }

    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, minMs - elapsed);
    const timer = window.setTimeout(() => {
      setHold(false);
      startedAtRef.current = null;
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [active, minMs]);

  return active || hold;
}
