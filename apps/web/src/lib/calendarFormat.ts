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

export function formatTimeUntil(iso: string) {
  const totalMins = minsUntil(iso);
  if (totalMins <= 0) return null;

  const days = Math.floor(totalMins / (24 * 60));
  const hours = Math.floor((totalMins % (24 * 60)) / 60);
  const mins = totalMins % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins} min`);

  return parts.join(" ");
}

export function isUpcoming(iso: string) {
  return new Date(iso).getTime() > Date.now() - 5 * 60_000;
}
