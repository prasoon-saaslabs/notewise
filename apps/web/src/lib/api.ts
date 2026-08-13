import { createApiClient } from "@notewise/api-client";
import { resolveApiBase } from "./backend";
import { getAuthToken } from "./authSession";

/**
 * Prefer same-origin `/api` (Vite proxy) so CORS never blocks local dev
 * whether the page is opened as localhost or 127.0.0.1.
 * Settings may override via localStorage → resolveApiBase().
 */
export const api = createApiClient(resolveApiBase());
api.setAuthToken(getAuthToken());

/** Recreate client after Settings changes api base (call before reload). */
export function refreshApiBase() {
  return createApiClient(resolveApiBase());
}
