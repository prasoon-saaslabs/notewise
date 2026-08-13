import { MiniCapturePanel } from "./MiniCapturePanel";
import { createCaptureChannel, type CaptureSyncMessage } from "./miniCaptureSync";
import { focusMainWindow } from "./desktopMiniWindow";

export function MiniCapturePage() {
  return (
    <div className="nw-mini-page">
      <MiniCapturePanel
        onExpand={() => {
          const ch = createCaptureChannel();
          ch?.postMessage({
            kind: "command",
            command: { type: "focus-main" },
          } satisfies CaptureSyncMessage);
          ch?.close();
          void focusMainWindow();
        }}
      />
    </div>
  );
}
