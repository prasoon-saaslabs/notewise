import { useEffect, useRef, type RefObject } from "react";
import { Copy, X } from "lucide-react";

type Turn = {
  id: string;
  speaker: string;
  text: string;
};

export function SimpleTranscriptPopup({
  open,
  onClose,
  turns,
  interim,
  recording,
  paused,
  containerRef,
}: {
  open: boolean;
  onClose: () => void;
  turns: Turn[];
  interim: string;
  recording: boolean;
  paused: boolean;
  containerRef: RefObject<HTMLElement | null>;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose, containerRef]);

  useEffect(() => {
    if (!scrollRef.current || !open) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns.length, interim, open]);

  if (!open) return null;

  const status = paused ? "Paused" : recording ? "Live" : "Transcript";

  return (
    <div
      role="dialog"
      aria-label="Live transcript"
      className="absolute bottom-[calc(100%+0.5rem)] left-1/2 z-50 flex max-h-[min(360px,50vh)] w-[min(320px,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] shadow-[var(--nw-shadow-lg)]"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--nw-border)] px-3 py-2">
        <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--nw-ink-4)]">
          {status}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-md text-[var(--nw-ink-4)] transition hover:bg-[var(--nw-surface-2)] hover:text-[var(--nw-ink)]"
            aria-label="Copy transcript"
            onClick={() => {
              const text = [
                ...turns.map((t) => `${t.speaker}: ${t.text}`),
                interim,
              ]
                .filter(Boolean)
                .join("\n");
              void navigator.clipboard?.writeText(text);
            }}
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-md text-[var(--nw-ink-4)] transition hover:bg-[var(--nw-surface-2)] hover:text-[var(--nw-ink)]"
            aria-label="Close transcript"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-[140px] flex-1 overflow-auto px-3 py-2.5 text-sm leading-relaxed text-[var(--nw-ink-2)]"
      >
        {turns.length === 0 && !interim ? (
          <p className="m-0 text-[var(--nw-ink-4)]">Listening…</p>
        ) : (
          <>
            {turns.map((t) => (
              <p key={t.id} className="m-0 mb-2">
                <span className="font-semibold text-[var(--nw-accent-dark)]">
                  {t.speaker}:{" "}
                </span>
                {t.text}
              </p>
            ))}
            {interim ? (
              <p className="m-0 italic text-[var(--nw-ink-4)]">{interim}</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
