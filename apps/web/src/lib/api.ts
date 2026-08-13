import { createApiClient } from "@notewise/api-client";
import { isDesktopShell } from "../capture/desktopMiniWindow";
import { resolveApiBase } from "./backend";
import { getAuthToken } from "./authSession";
import { desktopGatewayFetch } from "./desktopGatewayFetch";

function apiFetch(): typeof fetch | undefined {
  return isDesktopShell() ? desktopGatewayFetch : undefined;
}

/**
 * Prefer same-origin `/api` (Vite proxy) so CORS never blocks local dev
 * whether the page is opened as localhost or 127.0.0.1.
 * Settings may override via localStorage → resolveApiBase().
 * Desktop uses native Tauri gateway_fetch (no WKWebView CORS).
 */
export const api = createApiClient(resolveApiBase(), apiFetch());
api.setAuthToken(getAuthToken());

/** Recreate client after Settings changes api base (call before reload). */
export function refreshApiBase() {
  return createApiClient(resolveApiBase(), apiFetch());
}
