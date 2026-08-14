/**
 * Desktop gateway control plane — all setup/health via Tauri (never webview fetch).
 */
import { isDesktopShell } from "../capture/desktopMiniWindow";

export type GatewayDiagnostics = {
  running: boolean;
  reachable: boolean;
  hasApiKey: boolean;
  status: string;
  worker: string;
  port: number;
  error: string | null;
};

export function isDesktopGatewayControlAvailable(): boolean {
  return isDesktopShell();
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

/** Read gateway state (native curl — same path as the menu-bar supervisor). */
export async function getGatewayDiagnostics(): Promise<GatewayDiagnostics> {
  if (!isDesktopShell()) {
    return {
      running: false,
      reachable: false,
      hasApiKey: false,
      status: "web",
      worker: "",
      port: 3002,
      error: null,
    };
  }
  return invoke<GatewayDiagnostics>("gateway_diagnostics");
}

/** Save API key; attach to a healthy :3002 gateway or restart only a sidecar we spawned. */
export async function configureDesktopGateway(apiKey: string): Promise<GatewayDiagnostics> {
  return invoke<GatewayDiagnostics>("configure_gateway", { apiKey: apiKey.trim() });
}

/** Ensure sidecar is running (app boot). */
export async function ensureDesktopGateway(): Promise<GatewayDiagnostics> {
  return invoke<GatewayDiagnostics>("gateway_ensure_running");
}

export function diagnosticsReady(d: GatewayDiagnostics): boolean {
  return d.reachable && d.hasApiKey;
}

export function diagnosticsErrorMessage(d: GatewayDiagnostics): string {
  if (d.error) return d.error;
  if (!d.reachable) {
    return "Local AI gateway did not start. Quit other Notewise apps from the menu bar, then retry. If you use make run, leave that process running — desktop will attach to port 3002.";
  }
  if (!d.hasApiKey) {
    return "Add your PyAI API key from api.pyai.com";
  }
  if (d.worker === "missing_pyai_api_key") {
    return "PyAI API key was rejected. Check the key and try again.";
  }
  return "Gateway setup incomplete. Try again or reinstall from the latest DMG.";
}
