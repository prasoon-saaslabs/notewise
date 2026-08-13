import { isDesktopShell } from "../capture/desktopMiniWindow";

export type DesktopNoticeKind = "info" | "warning" | "error";

let permissionRequested = false;

async function ensureNotificationPermission(): Promise<boolean> {
  if (!isDesktopShell() || typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  if (permissionRequested) return false;
  permissionRequested = true;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

/** macOS system notification for desktop — used for blocking errors, not optional fallbacks. */
export async function notifyDesktop(
  title: string,
  body: string,
  kind: DesktopNoticeKind = "info",
): Promise<void> {
  if (!isDesktopShell()) return;
  const ok = await ensureNotificationPermission();
  if (!ok) return;
  try {
    new Notification(title, {
      body,
      tag: `notewise-${kind}`,
      silent: kind === "info",
    });
  } catch {
    /* ignore */
  }
}
