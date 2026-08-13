/** Document Picture-in-Picture helpers (Chromium / Edge). Must run from a user gesture. */

export type PipMount = {
  window: Window;
  root: HTMLElement;
};

export function isDocumentPipSupported(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

/** Resolved theme tokens copied from the main app (matches packages/ui tokens.css). */
const NW_THEME_VARS = [
  "--nw-ink",
  "--nw-ink-2",
  "--nw-ink-3",
  "--nw-ink-4",
  "--nw-paper",
  "--nw-surface",
  "--nw-surface-solid",
  "--nw-surface-2",
  "--nw-surface-3",
  "--nw-border",
  "--nw-border-strong",
  "--nw-accent",
  "--nw-accent-dark",
  "--nw-accent-soft",
  "--nw-accent-subtle",
  "--nw-accent-2",
  "--nw-accent-glow",
  "--nw-accent-rgb",
  "--nw-highlight",
  "--nw-dark-room",
  "--nw-mint",
  "--nw-danger",
  "--nw-danger-soft",
  "--nw-success",
  "--nw-success-soft",
  "--nw-you",
  "--nw-other",
  "--nw-font-display",
  "--nw-font-sans",
  "--nw-font-mono",
  "--nw-radius-md",
  "--nw-radius-lg",
  "--nw-radius-xl",
  "--nw-radius-pill",
  "--nw-shadow-md",
  "--nw-shadow-lg",
  "--nw-glass",
  "--nw-glass-bg",
  "--nw-glass-bg-strong",
  "--nw-glass-border",
  "--nw-glass-highlight",
  "--nw-glass-shadow",
  "--nw-shell-glow-2",
  "--nw-focus-ring",
  "--nw-gradient-surface",
  "--nw-gradient-panel",
  "--nw-gradient-accent-panel",
  "--nw-gradient-cta",
  "--nw-gradient-shimmer",
  "--nw-hover-bg",
  "--nw-danger-hover-bg",
  "--nw-scratch-bg",
  "--nw-scratch-border",
  "--nw-scratch-bg-box",
  "--nw-modal-backdrop",
  "--nw-guest-bg",
  "--nw-guest-text",
  "--nw-guest-border",
] as const;

/** Minimal styles so the mini panel is usable even if stylesheet copy fails. */
const PIP_CRITICAL_CSS = `
html, body {
  margin: 0;
  height: 100%;
  background: var(--nw-paper);
  color: var(--nw-ink);
}
#nw-pip-root { height:100%; display:flex; flex-direction:column; min-height:0; }
.nw-mini-panel {
  height:100%; min-height:0; display:flex; flex-direction:column;
  padding:12px; box-sizing:border-box;
  background: var(--nw-gradient-surface);
  font-family: var(--nw-font-sans), system-ui, sans-serif;
  color: var(--nw-ink);
}
.nw-mini-icon-btn {
  appearance:none; border:1px solid var(--nw-glass-border); background:var(--nw-glass-bg);
  border-radius:10px; width:32px; height:32px; display:grid; place-items:center;
  color:var(--nw-ink-3); cursor:pointer; flex-shrink:0;
}
.nw-mini-icon-btn:hover {
  color:var(--nw-accent-dark);
  background:var(--nw-glass-bg-strong);
  border-color:var(--nw-glass-border);
}
.nw-page-input {
  background: var(--nw-surface-solid);
  color: var(--nw-ink);
}
.nw-page-input::placeholder { color: var(--nw-ink-4); opacity: 1; }
.nw-mini-transcript { max-height:140px; overflow:auto; }
.nw-pulse-dot {
  width:8px; height:8px; border-radius:999px; background:var(--nw-accent);
  display:inline-block; animation:nw-pulse 1.2s ease-in-out infinite;
}
@keyframes nw-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
`;

let activePipDocument: Document | null = null;

/** Mirror active theme from the main app onto the PiP document root. */
export function copyThemeToPipDocument(pipDoc: Document) {
  const source = document.documentElement;
  const target = pipDoc.documentElement;

  const theme = source.getAttribute("data-theme");
  if (theme) {
    target.setAttribute("data-theme", theme);
  } else {
    target.removeAttribute("data-theme");
  }

  const computed = getComputedStyle(source);
  const rootStyle = target.style;
  for (const key of NW_THEME_VARS) {
    const value = computed.getPropertyValue(key).trim();
    if (value) rootStyle.setProperty(key, value);
  }

  pipDoc.body.style.colorScheme = computed.colorScheme || "light";
}

/** Re-apply theme to an open PiP window after the user switches themes. */
export function syncActivePipTheme() {
  if (activePipDocument) copyThemeToPipDocument(activePipDocument);
}

function copyStylesTo(pipDoc: Document) {
  copyThemeToPipDocument(pipDoc);

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

  copyThemeToPipDocument(pipDoc);
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
    activePipDocument = pipDoc;
    pipDoc.documentElement.style.height = "100%";
    pipDoc.body.style.cssText =
      "margin:0;height:100%;background:var(--nw-paper);color:var(--nw-ink);font-family:var(--nw-font-sans),system-ui,sans-serif;overflow:hidden;";

    try {
      copyStylesTo(pipDoc);
    } catch (err) {
      console.warn("PiP style copy failed (using critical CSS only)", err);
    }

    const root = pipDoc.createElement("div");
    root.id = "nw-pip-root";
    root.style.cssText = "height:100%;display:flex;flex-direction:column;min-height:0;";
    pipDoc.body.appendChild(root);

    pipWindow.addEventListener("pagehide", () => {
      if (activePipDocument === pipDoc) activePipDocument = null;
    });

    return { window: pipWindow, root };
  } catch (err) {
    console.warn("Document PiP failed", err);
    activePipDocument = null;
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
