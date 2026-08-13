import type { AuthUser } from "@notewise/api-client";

export const AUTH_TOKEN_KEY = "og.auth.token";
export const AUTH_USER_KEY = "og.auth.user";
export const PENDING_CALENDAR_EVENT_KEY = "og.pending-calendar-event";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: AuthUser) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setPendingCalendarEventId(eventId: string | null) {
  if (!eventId) localStorage.removeItem(PENDING_CALENDAR_EVENT_KEY);
  else localStorage.setItem(PENDING_CALENDAR_EVENT_KEY, eventId);
}

export function getPendingCalendarEventId(): string | null {
  try {
    return localStorage.getItem(PENDING_CALENDAR_EVENT_KEY);
  } catch {
    return null;
  }
}
