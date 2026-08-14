import { useEffect, useRef, useState } from "react";

/** Keeps overlay visible for at least minMs so regen/mode-change animations are noticeable. */
export function useRegeneratingOverlay(active: boolean, minMs = 1200) {
  const [visible, setVisible] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      startedAtRef.current = Date.now();
      setVisible(true);
      return;
    }

    if (!visible) return;

    const elapsed = startedAtRef.current
      ? Date.now() - startedAtRef.current
      : minMs;
    const remaining = Math.max(0, minMs - elapsed);
    const timer = window.setTimeout(() => {
      setVisible(false);
      startedAtRef.current = null;
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [active, minMs, visible]);

  return visible;
}
