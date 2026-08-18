import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Sparkles, X } from "lucide-react";
import {
  useAiWorkspace,
  type AiWorkspaceOptions,
} from "../hooks/useAiWorkspace";
import { AiWorkspaceContent } from "./AiWorkspaceContent";

type Props = AiWorkspaceOptions & {
  className?: string;
};

type PanelCoords = {
  top: number;
  left: number;
  width: number;
};

function computePanelCoords(trigger: HTMLElement): PanelCoords {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(352, window.innerWidth - 16);
  const left = Math.max(
    8,
    Math.min(rect.right - width, window.innerWidth - width - 8),
  );
  return {
    top: rect.bottom + 8,
    left,
    width,
  };
}

export function AiWorkspacePopover({
  className = "",
  sessionLive,
  hasNotes,
  ...rest
}: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const workspace = useAiWorkspace({
    sessionLive,
    hasNotes,
    ...rest,
  });

  const subtitle = sessionLive
    ? "Mode applies to this capture"
    : hasNotes
      ? "Change mode to regenerate notes"
      : "Set context before you record";

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setCoords(computePanelCoords(trigger));
  }, []);

  useEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (workspace.createOpen) return;
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !workspace.createOpen) {
        close();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, workspace.createOpen, close]);

  const panel =
    open && coords
      ? createPortal(
          <div
            id={panelId}
            ref={panelRef}
            role="dialog"
            aria-label="AI workspace"
            className="fixed z-[300]"
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
            }}
          >
            <section className="overflow-hidden rounded-2xl border border-[rgb(var(--nw-accent-rgb)_/_0.18)] bg-[var(--nw-surface-solid)] shadow-[var(--nw-shadow-lg)]">
              <div className="pointer-events-none absolute inset-0 nw-accent-panel-gradient opacity-95" />
              <header className="relative flex items-start gap-2 border-b border-[rgb(var(--nw-accent-rgb)_/_0.12)] bg-[var(--nw-surface-solid)] px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-semibold tracking-tight text-[var(--nw-ink)]">
                    AI workspace
                  </p>
                  <p className="m-0 text-[0.68rem] text-[var(--nw-ink-3)]">
                    {subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--nw-ink-4)] transition hover:bg-[var(--nw-surface-2)] hover:text-[var(--nw-ink)]"
                  aria-label="Close AI workspace"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    close();
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </header>
              <div className="relative flex max-h-[min(70vh,28rem)] flex-col gap-4 overflow-auto bg-[var(--nw-surface-solid)] p-4">
                <AiWorkspaceContent
                  modeId={workspace.modeId}
                  modeError={workspace.modeError}
                  showRegenOverlay={workspace.showRegenOverlay}
                  activeModeName={workspace.activeModeName}
                  canRegenerate={workspace.canRegenerate}
                  onModeChange={workspace.handleModeChange}
                  entities={workspace.entities}
                  entityId={workspace.entityId}
                  onSelectEntity={workspace.selectEntity}
                  onClearEntity={workspace.clearEntity}
                  onOpenCreateEntity={workspace.openCreateEntity}
                  createOpen={workspace.createOpen}
                  createPending={workspace.createPending}
                  createError={workspace.createError}
                  onCloseCreateEntity={workspace.closeCreateEntity}
                  onCreateEntity={workspace.handleCreateEntity}
                />
              </div>
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className={`relative shrink-0 ${className}`} ref={rootRef}>
        <button
          ref={triggerRef}
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-[var(--nw-radius-pill)] border px-3 py-1.5 text-xs font-semibold transition ${
            open
              ? "border-[rgb(var(--nw-accent-rgb)_/_0.32)] bg-[rgb(var(--nw-accent-rgb)_/_0.1)] text-[var(--nw-accent-dark)] shadow-[0_4px_16px_rgb(var(--nw-accent-rgb)_/_0.08)]"
              : "border-[var(--nw-border)] bg-[var(--nw-surface-solid)] text-[var(--nw-ink-2)] hover:border-[rgb(var(--nw-accent-rgb)_/_0.25)] hover:text-[var(--nw-accent-dark)]"
          }`}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? panelId : undefined}
          onClick={() => {
            setOpen((v) => {
              const next = !v;
              if (next) {
                requestAnimationFrame(updatePosition);
              }
              return next;
            });
          }}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>AI workspace</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>
      </div>
      {panel}
    </>
  );
}
