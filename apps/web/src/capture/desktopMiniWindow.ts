/** Tauri always-on-top mini capture window helpers (no-op on plain web). */

function isTauri(): boolean {
  return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
}

const LABEL = "mini-capture";

function miniCaptureUrl(): string {
  return `${window.location.origin}/mini-capture`;
}

export async function openMiniCaptureWindow(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_mini_capture_panel", { url: miniCaptureUrl() });
    return true;
  } catch (err) {
    console.warn("Tauri mini panel unavailable", err);
    return false;
  }
}

/** NSPanel stays floating natively — kept for API compatibility. */
export async function keepMiniWindowFloating(): Promise<void> {
  if (!isTauri()) return;
}

export async function closeMiniCaptureWindow(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("hide_mini_capture_panel");
  } catch {
    /* ignore */
  }
}

export async function focusMainWindow(): Promise<void> {
  if (!isTauri()) {
    try {
      window.focus();
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const current = getCurrentWebviewWindow();
    if (current.label !== LABEL) {
      await current.show();
      await current.unminimize();
      await current.setFocus();
      return;
    }
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const main = await WebviewWindow.getByLabel("main");
    await main?.show();
    await main?.unminimize();
    await main?.setFocus();
  } catch {
    /* ignore */
  }
}

export function isDesktopShell() {
  return isTauri();
}
