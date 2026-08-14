import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useLocation, useNavigate } from "react-router-dom";
import { MiniCapturePanel } from "./MiniCapturePanel";
import {
  CaptureSessionContext,
  useCaptureSession,
} from "./CaptureSessionContext";
import { isCaptureActive } from "./miniCaptureSync";
import { isDesktopShell, openMiniCaptureWindow } from "./desktopMiniWindow";
import {
  isSimpleNoteSurface,
  SIMPLE_NOTE_PATH,
} from "../features/simple/simpleCapture";
import {
  DISMISS_MINI_EVENT,
  FORCE_FLOAT_EVENT,
  MINI_LAYOUT_EVENT,
  PIP_READY_EVENT,
  setPipReadyListener,
  type PipMount,
} from "./documentPip";

/**
 * Mini player host.
 * - Never opens Document PiP on Start (avoids empty “dead” windows).
 * - Auto float / desktop window when you leave Capture or hide the tab.
 * - Manual Pop out still uses Document PiP (user gesture).
 */
export function MiniCaptureHost() {
  const session = useCaptureSession();
  const location = useLocation();
  const navigate = useNavigate();
  const isMiniRoute = location.pathname.startsWith("/mini-capture");
  const active = isCaptureActive(session);
  const onSimpleNotePage = isSimpleNoteSurface(location.pathname);
  const onPrimaryCaptureSurface = onSimpleNotePage;
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const pipWinRef = useRef<Window | null>(null);
  const pipRootElRef = useRef<HTMLElement | null>(null);
  const pipReactRootRef = useRef<Root | null>(null);
  const [pipActive, setPipActive] = useState(false);
  const [forceFloat, setForceFloat] = useState(false);
  const [floatExpanded, setFloatExpanded] = useState(false);
  const dismissRef = useRef<() => void>(() => undefined);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const teardownPipRoot = useCallback(() => {
    if (pipReactRootRef.current) {
      try {
        pipReactRootRef.current.unmount();
      } catch {
        /* ignore */
      }
      pipReactRootRef.current = null;
    }
    pipRootElRef.current = null;
  }, []);

  const renderPipPanel = useCallback(() => {
    const el = pipRootElRef.current;
    if (!el) return;
    if (!pipReactRootRef.current) {
      pipReactRootRef.current = createRoot(el);
    }
    pipReactRootRef.current.render(
      <CaptureSessionContext.Provider value={sessionRef.current}>
        <MiniCapturePanel onExpand={() => dismissRef.current()} />
      </CaptureSessionContext.Provider>
    );
  }, []);

  const attachPip = useCallback(
    (detail: PipMount) => {
      if (!detail?.root || !detail.window) return;
      if (
        pipWinRef.current &&
        pipWinRef.current !== detail.window &&
        !pipWinRef.current.closed
      ) {
        try {
          pipWinRef.current.close();
        } catch {
          /* ignore */
        }
      }
      teardownPipRoot();
      pipWinRef.current = detail.window;
      pipRootElRef.current = detail.root;
      setPipActive(true);
      setForceFloat(false);
      renderPipPanel();
      detail.window.addEventListener("pagehide", () => {
        if (pipWinRef.current === detail.window) {
          teardownPipRoot();
          pipWinRef.current = null;
          setPipActive(false);
        }
      });
    },
    [renderPipPanel, teardownPipRoot]
  );

  const dismissMini = useCallback(() => {
    setForceFloat(false);
    const pip = pipWinRef.current;
    pipWinRef.current = null;
    teardownPipRoot();
    setPipActive(false);
    if (pip && !pip.closed) {
      try {
        pip.close();
      } catch {
        /* ignore */
      }
    }
    if (!isSimpleNoteSurface(location.pathname)) {
      navigate(SIMPLE_NOTE_PATH);
    }
    try {
      window.focus();
    } catch {
      /* ignore */
    }
  }, [location.pathname, navigate, teardownPipRoot]);

  dismissRef.current = dismissMini;

  useEffect(() => {
    if (!pipActive) return;
    renderPipPanel();
  }, [pipActive, session, renderPipPanel]);

  useEffect(() => {
    setPipReadyListener(attachPip);
    const onPipReady = (ev: Event) => {
      const detail = (ev as CustomEvent<PipMount>).detail;
      if (detail) attachPip(detail);
    };
    const onForceFloat = () => {
      if (!pipWinRef.current || pipWinRef.current.closed) {
        setForceFloat(true);
      }
    };
    const onDismiss = () => dismissMini();
    const onMiniLayout = (ev: Event) => {
      const expanded = Boolean(
        (ev as CustomEvent<{ expanded?: boolean }>).detail?.expanded
      );
      setFloatExpanded(expanded);
    };
    window.addEventListener(PIP_READY_EVENT, onPipReady);
    window.addEventListener(FORCE_FLOAT_EVENT, onForceFloat);
    window.addEventListener(DISMISS_MINI_EVENT, onDismiss);
    window.addEventListener(MINI_LAYOUT_EVENT, onMiniLayout);
    return () => {
      setPipReadyListener(null);
      window.removeEventListener(PIP_READY_EVENT, onPipReady);
      window.removeEventListener(FORCE_FLOAT_EVENT, onForceFloat);
      window.removeEventListener(DISMISS_MINI_EVENT, onDismiss);
      window.removeEventListener(MINI_LAYOUT_EVENT, onMiniLayout);
    };
  }, [attachPip, dismissMini]);

  useEffect(() => {
    if (!active) {
      if (pipWinRef.current && !pipWinRef.current.closed) {
        try {
          pipWinRef.current.close();
        } catch {
          /* ignore */
        }
      }
      pipWinRef.current = null;
      teardownPipRoot();
      setPipActive(false);
      setForceFloat(false);
    }
  }, [active, teardownPipRoot]);

  // Desktop: overlay when leaving Capture or switching to another app — never on Start.
  useEffect(() => {
    if (!active || pipActive) return;

    const presentAway = () => {
      if (isDesktopShell()) {
        void openMiniCaptureWindow();
        return;
      }
      setForceFloat(true);
    };

    if (!onPrimaryCaptureSurface) {
      presentAway();
    } else {
      setForceFloat(false);
    }

    const onVis = () => {
      if (!isCaptureActive(sessionRef.current)) return;
      if (document.hidden) presentAway();
      else if (isSimpleNoteSurface(location.pathname)) {
        setForceFloat(false);
      }
    };

    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [active, onPrimaryCaptureSurface, pipActive, location.pathname]);

  if (isMiniRoute || !active) return null;

  const showInAppFloat =
    !pipActive &&
    !isDesktopShell() &&
    !onSimpleNotePage &&
    forceFloat;

  return showInAppFloat ? (
    <div
      className={`nw-mini-float ${
        floatExpanded ? "nw-mini-float--expanded" : ""
      }`}
      style={{ right: pos.x, bottom: pos.y }}
      onPointerDown={(e) => {
        if (
          (e.target as HTMLElement).closest(
            "button, textarea, a, input, .nw-notes-editor, .ProseMirror"
          )
        )
          return;
        dragRef.current = {
          dx: e.clientX + pos.x,
          dy: e.clientY + pos.y,
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragRef.current) return;
        setPos({
          x: Math.max(8, dragRef.current.dx - e.clientX),
          y: Math.max(8, dragRef.current.dy - e.clientY),
        });
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
    >
      <MiniCapturePanel onExpand={dismissMini} />
    </div>
  ) : null;
}
