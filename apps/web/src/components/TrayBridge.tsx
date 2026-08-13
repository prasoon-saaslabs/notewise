import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCaptureSession } from "../capture/CaptureSessionContext";
import { closeMiniCaptureWindow, isDesktopShell } from "../capture/desktopMiniWindow";
import { focusDesktopMainWindow } from "../lib/desktopTray";

export function TrayBridge() {
  const { start, stop } = useCaptureSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isDesktopShell()) return;
    let unsubs: Array<() => void> = [];
    void (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      unsubs.push(
        await listen("og://tray-start", () => {
          void focusDesktopMainWindow();
          localStorage.setItem("og-channel-mode", "stereo");
          void start();
        }),
      );
      unsubs.push(
        await listen("og://tray-stop", () => {
          void focusDesktopMainWindow();
          stop();
        }),
      );
      unsubs.push(
        await listen("og://open-library", () => {
          void focusDesktopMainWindow();
          navigate("/library");
        }),
      );
      unsubs.push(
        await listen("og://open-capture", () => {
          void focusDesktopMainWindow();
          navigate("/");
        }),
      );
      unsubs.push(
        await listen("og://open-settings", () => {
          void focusDesktopMainWindow();
          navigate("/settings");
        }),
      );
      unsubs.push(
        await listen("og://panic-hide", () => {
          void closeMiniCaptureWindow();
        }),
      );
    })();
    const panic = (e: KeyboardEvent) => {
      if (e.shiftKey && e.metaKey && e.code === "KeyH") {
        e.preventDefault();
        void closeMiniCaptureWindow();
      }
    };
    window.addEventListener("keydown", panic);
    return () => {
      unsubs.forEach((u) => u());
      window.removeEventListener("keydown", panic);
    };
  }, [start, stop, navigate]);

  return null;
}
