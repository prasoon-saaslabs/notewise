/** Document Picture-in-Picture helpers (Chromium / Edge). Must run from a user gesture. */

export type PipMount = {
  window: Window;
  root: HTMLElement;
};

export function isDocumentPipSupported(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

/** Minimal styles so the mini panel is usable even if stylesheet copy fails. */
const PIP_CRITICAL_CSS = `
html, body { margin:0; height:100%; background:#f8fafc; }
#nw-pip-root { height:100%; display:flex; flex-direction:column; min-height:0; }
.nw-mini-panel {
  height:100%; min-height:0; display:flex; flex-direction:column;
  padding:12px; box-sizing:border-box;
  background:linear-gradient(180deg,#fff 0%,#f8fafc 100%);
  font-family:var(--nw-font-sans),system-ui,sans-serif;
  color:var(--nw-ink,#0f172a);
}
.nw-mini-icon-btn {
  appearance:none; border:1px solid var(--nw-border,#e2e8f0); background:#fff;
  border-radius:10px; width:32px; height:32px; display:grid; place-items:center;
  color:var(--nw-ink-3,#64748b); cursor:pointer; flex-shrink:0;
}
.nw-mini-icon-btn:hover { color:var(--nw-accent-dark,#0f766e); background:var(--nw-accent-soft,#ccfbf1); }
.nw-mini-transcript { max-height:140px; overflow:auto; }
.nw-pulse-dot {
  width:8px; height:8px; border-radius:999px; background:var(--nw-accent,#14b8a6);
  display:inline-block; animation:nw-pulse 1.2s ease-in-out infinite;
}
@keyframes nw-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
`;

const CSS_VARS = [
  "--nw-ink",
  "--nw-ink-2",
  "--nw-ink-3",
  "--nw-ink-4",
  "--nw-paper",
  "--nw-border",
  "--nw-accent",
  "--nw-accent-dark",
  "--nw-accent-soft",
  "--nw-danger",
  "--nw-success",
  "--nw-success-soft",
  "--nw-surface-2",
  "--nw-font-sans",
] as const;

function copyStylesTo(pipDoc: Document) {
  const critical = pipDoc.createElement("style");
  critical.setAttribute("data-nw-pip-critical", "1");
  critical.textContent = PIP_CRITICAL_CSS;
  pipDoc.head.appendChild(critical);

  for (const node of document.querySelectorAll("link[rel='stylesheet'], style")) {
    try {
      if (node instanceof HTMLLinkElement) {
        const link = pipDoc.createElement("link");
        link.rel = "stylesheet";
        // Absolute URL — PiP document is not same path as the app
        link.href = node.href;
        if (node.media) link.media = node.media;
        pipDoc.head.appendChild(link);
      } else if (node instanceof HTMLStyleElement) {
        const style = pipDoc.createElement("style");
        style.textContent = node.textContent ?? "";
        pipDoc.head.appendChild(style);
      }
    } catch {
      /* ignore one bad sheet */
    }
  }

  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = Array.from(sheet.cssRules)
          .map((r) => r.cssText)
          .join("\n");
        if (!rules) continue;
        const style = pipDoc.createElement("style");
        style.textContent = rules;
        pipDoc.head.appendChild(style);
      } catch {
        if (sheet.href) {
          const link = pipDoc.createElement("link");
          link.rel = "stylesheet";
          link.href = sheet.href;
          pipDoc.head.appendChild(link);
        }
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const vars = getComputedStyle(document.documentElement);
    const rootStyle = pipDoc.documentElement.style;
    for (const key of CSS_VARS) {
      const v = vars.getPropertyValue(key);
      if (v) rootStyle.setProperty(key, v);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Open a Document PiP window. Call directly from a click handler (same async chain).
 * Never leaves an orphan empty window on failure.
 */
export async function openDocumentPip(opts?: {
  width?: number;
  height?: number;
}): Promise<PipMount | null> {
  if (!isDocumentPipSupported()) return null;
  const api = (
    window as unknown as {
      documentPictureInPicture: {
        requestWindow: (o?: {
          width?: number;
          height?: number;
          preferInitialWindowPlacement?: boolean;
        }) => Promise<Window>;
        window?: Window | null;
      };
    }
  ).documentPictureInPicture;

  // Close any existing Doc PiP first (API allows one)
  try {
    const existing = api.window;
    if (existing && !existing.closed) existing.close();
  } catch {
    /* ignore */
  }

  let pipWindow: Window | null = null;
  try {
    pipWindow = await api.requestWindow({
      width: opts?.width ?? 360,
      height: opts?.height ?? 340,
      preferInitialWindowPlacement: true,
    });

    const pipDoc = pipWindow.document;
    pipDoc.documentElement.style.height = "100%";
    pipDoc.body.style.cssText =
      "margin:0;height:100%;background:#f8fafc;font-family:var(--nw-font-sans),system-ui,sans-serif;overflow:hidden;";

    try {
      copyStylesTo(pipDoc);
    } catch (err) {
      console.warn("PiP style copy failed (using critical CSS only)", err);
    }

    const root = pipDoc.createElement("div");
    root.id = "nw-pip-root";
    root.style.cssText = "height:100%;display:flex;flex-direction:column;min-height:0;";
    pipDoc.body.appendChild(root);

    return { window: pipWindow, root };
  } catch (err) {
    console.warn("Document PiP failed", err);
    if (pipWindow && !pipWindow.closed) {
      try {
        pipWindow.close();
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}

export const PIP_READY_EVENT = "notewise:pip-ready";
export const MINI_LAYOUT_EVENT = "og-mini-layout";

export function resizeDocumentPipWindow(width: number, height: number) {
  try {
    if (typeof window.resizeTo === "function") {
      window.resizeTo(width, height);
    }
  } catch {
    /* PiP resize not supported */
  }
}
export const FORCE_FLOAT_EVENT = "notewise:force-float";
export const DISMISS_MINI_EVENT = "notewise:dismiss-mini";

type PipReadyListener = (mount: PipMount) => void;
let pipReadyListener: PipReadyListener | null = null;

/** Prefer direct delivery over CustomEvent so the mount attaches in the same turn. */
export function setPipReadyListener(listener: PipReadyListener | null) {
  pipReadyListener = listener;
}

export function notifyPipReady(mount: PipMount) {
  if (pipReadyListener) {
    pipReadyListener(mount);
    return;
  }
  window.dispatchEvent(new CustomEvent(PIP_READY_EVENT, { detail: mount }));
}

export function notifyForceFloat() {
  window.dispatchEvent(new CustomEvent(FORCE_FLOAT_EVENT));
}

export function notifyDismissMini() {
  window.dispatchEvent(new CustomEvent(DISMISS_MINI_EVENT));
}
