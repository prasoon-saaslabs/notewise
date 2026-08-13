/** Throttle React state updates driven by high-frequency callbacks (audio meters, etc.). */
export function throttle<T extends (...args: never[]) => void>(
  fn: T,
  intervalMs: number,
): (...args: Parameters<T>) => void {
  let last = 0;
  let pending: Parameters<T> | null = null;
  let timer: number | null = null;

  const flush = () => {
    timer = null;
    if (!pending) return;
    const args = pending;
    pending = null;
    last = Date.now();
    fn(...args);
  };

  return (...args: Parameters<T>) => {
    pending = args;
    const now = Date.now();
    const wait = intervalMs - (now - last);
    if (wait <= 0) {
      if (timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
      flush();
      return;
    }
    if (timer == null) {
      timer = window.setTimeout(flush, wait);
    }
  };
}

/** Debounce for snapshot / storage writes. */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  waitMs: number,
): (...args: Parameters<T>) => void {
  let timer: number | null = null;
  return (...args: Parameters<T>) => {
    if (timer != null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      fn(...args);
    }, waitMs);
  };
}
