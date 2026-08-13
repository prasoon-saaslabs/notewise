export const AUTH_RETURN_KEY = "og.auth.return";

export function setAuthReturnPath(path: string) {
  try {
    sessionStorage.setItem(AUTH_RETURN_KEY, path);
  } catch {
    /* ignore */
  }
}

export function consumeAuthReturnPath(fallback = "/"): string {
  try {
    const path = sessionStorage.getItem(AUTH_RETURN_KEY);
    sessionStorage.removeItem(AUTH_RETURN_KEY);
    if (path && path.startsWith("/") && path !== "/login") return path;
  } catch {
    /* ignore */
  }
  return fallback;
}
