export function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function minsUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.round(ms / 60_000));
}

export function isUpcoming(iso: string) {
  return new Date(iso).getTime() > Date.now() - 5 * 60_000;
}
