import type { AuthUser } from "@notewise/api-client";
import { createApiClient } from "@notewise/api-client";
import { isDesktopShell } from "../capture/desktopMiniWindow";
import { desktopGatewayFetch } from "./desktopGatewayFetch";
import { DESKTOP_API_BASE } from "./desktopMode";
import { setAuthSession } from "./authSession";

const AUTH_TIMEOUT_MS = 20_000;

function authClientBase(): string {
  if (isDesktopShell()) return DESKTOP_API_BASE;
  return "/api";
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Sign-in timed out")), ms);
    promise
      .then((v) => {
        window.clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        window.clearTimeout(timer);
        reject(e);
      });
  });
}

export type OAuthCompleteResult = {
  user: AuthUser;
  fallbackPath: string;
};

/** Exchange a JWT from Google OAuth for a session (web callback or desktop loopback). */
export async function completeOAuthSession(token: string): Promise<OAuthCompleteResult> {
  const client = createApiClient(
    authClientBase(),
    isDesktopShell() ? desktopGatewayFetch : undefined,
  );
  client.setAuthToken(token);

  const me = await withTimeout(client.authMe(), AUTH_TIMEOUT_MS);
  if (!me.user) throw new Error("Could not load your profile after sign-in");

  setAuthSession(token, me.user);
  const fallbackPath = me.user.calendarConnected ? "/upcoming" : "/";
  return { user: me.user, fallbackPath };
}
