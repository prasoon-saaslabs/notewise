/** Tauri always-on-top mini capture window helpers (no-op on plain web). */

function isTauri(): boolean {
  return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
}

const LABEL = "mini-capture";

export async function openMiniCaptureWindow(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const existing = await WebviewWindow.getByLabel(LABEL);
    if (existing) {
      await existing.show();
      await existing.setAlwaysOnTop(true);
      return true;
    }
    const url = `${window.location.origin}/mini-capture`;
    const win = new WebviewWindow(LABEL, {
      url,
      title: "Notewise copilot",
      width: 380,
      height: 300,
      minWidth: 300,
      minHeight: 220,
      resizable: true,
      alwaysOnTop: true,
      focus: false,
      visible: true,
      decorations: true,
      skipTaskbar: true,
      visibleOnAllWorkspaces: true,
    });
    await new Promise<void>((resolve, reject) => {
      win.once("tauri://created", () => resolve());
      win.once("tauri://error", (e) => reject(e));
    });
    await win.setAlwaysOnTop(true);
    try {
      await win.setVisibleOnAllWorkspaces(true);
    } catch {
      /* optional */
    }
    try {
      await (win as unknown as { setContentProtected?: (v: boolean) => Promise<void> }).setContentProtected?.(
        true,
      );
    } catch {
      /* optional — hide overlay from screen share */
    }
    return true;
  } catch (err) {
    console.warn("Tauri mini window unavailable", err);
    return false;
  }
}

export async function closeMiniCaptureWindow(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const existing = await WebviewWindow.getByLabel(LABEL);
    if (existing) await existing.close();
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
    // Mini window calling focus-main should ask main via BroadcastChannel;
    // from main itself, focus current.
    const current = getCurrentWebviewWindow();
    if (current.label !== LABEL) {
      await current.setFocus();
      return;
    }
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const main = await WebviewWindow.getByLabel("main");
    await main?.setFocus();
  } catch {
    /* ignore */
  }
}

export function isDesktopShell() {
  return isTauri();
}
