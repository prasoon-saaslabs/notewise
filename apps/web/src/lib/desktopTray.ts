import { isDesktopShell } from "../capture/desktopMiniWindow";

/** Keep menu-bar tray tooltip/state in sync with actual recording (Rust side). */
export async function syncDesktopTrayRecording(recording: boolean): Promise<void> {
  if (!isDesktopShell()) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("sync_tray_recording", { recording });
  } catch {
    /* ignore */
  }
}

export async function focusDesktopMainWindow(): Promise<void> {
  if (!isDesktopShell()) return;
  try {
    const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const win = getCurrentWebviewWindow();
    if (win.label === "main") {
      await win.show();
      await win.unminimize();
      await win.setFocus();
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
