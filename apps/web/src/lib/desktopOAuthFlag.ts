/** Set while waiting for Google OAuth to return via localhost loopback (17654). */
export const DESKTOP_OAUTH_FLAG = "nw.desktopOAuth";

export function markDesktopOAuthPending() {
  try {
    sessionStorage.setItem(DESKTOP_OAUTH_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function clearDesktopOAuthPending() {
  try {
    sessionStorage.removeItem(DESKTOP_OAUTH_FLAG);
  } catch {
    /* ignore */
  }
}
