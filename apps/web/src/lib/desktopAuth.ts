import { isDesktopShell } from "../capture/desktopMiniWindow";

/** Start localhost OAuth callback server (port 17654) before opening the browser. */
export async function prepareDesktopOAuth(): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke<string>("start_oauth_loopback");
}

export async function openGoogleOAuthInBrowser(url: string): Promise<void> {
  const { open } = await import("@tauri-apps/plugin-shell");
  await open(url);
}

/** Listen for OAuth token delivered by the native loopback server on 127.0.0.1:17654. */
export async function listenDesktopOAuthCallback(
  onToken: (token: string) => void,
): Promise<() => void> {
  const { listen } = await import("@tauri-apps/api/event");
  return listen<string>("oauth-callback", (event) => {
    if (event.payload) onToken(event.payload);
  });
}

export function isDesktopBrowserOAuthAvailable(): boolean {
  return isDesktopShell();
}
