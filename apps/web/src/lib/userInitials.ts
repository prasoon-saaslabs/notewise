/** First letters of name (e.g. "Prasoon Jain" → "PJ"), or first two chars of email. */
export function userInitials(
  name?: string | null,
  email?: string | null,
): string {
  const raw = (name?.trim() || email?.trim() || "?");
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? "";
    const last = parts[parts.length - 1]?.[0] ?? "";
    return `${first}${last}`.toUpperCase();
  }
  return raw.slice(0, 2).toUpperCase();
}
