import { useEffect, useRef } from "react";
import { Copy, X } from "lucide-react";

type Turn = {
  id: string;
  speaker: string;
  text: string;
};

type Props = {
  turns: Turn[];
  interim: string;
  recording: boolean;
  paused: boolean;
  onClose: () => void;
};

export function SimpleTranscriptPanel({
  turns,
  interim,
  recording,
  paused,
  onClose,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns.length, interim]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const status = paused ? "Paused" : recording ? "Live" : "Transcript";

  return (
    <section className="flex min-h-0 flex-col border-t border-[var(--nw-border)] md:border-t-0 md:border-l">
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--nw-border)] px-4 py-3 md:px-5">
        <h2 className="m-0 text-sm font-medium text-[var(--nw-accent)]">
          Live transcript
        </h2>
        <span className="rounded-full bg-[var(--nw-surface-2)] px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-[var(--nw-ink-4)]">
          {status}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--nw-ink-4)] transition hover:bg-[var(--nw-surface-2)] hover:text-[var(--nw-ink)]"
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
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--nw-ink-4)] transition hover:bg-[var(--nw-surface-2)] hover:text-[var(--nw-ink)]"
            aria-label="Close transcript"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto px-4 py-4 md:px-5"
        aria-live="polite"
      >
        {turns.length === 0 && !interim ? (
          <p className="m-0 text-sm text-[var(--nw-ink-4)]">Listening…</p>
        ) : (
          <div className="text-sm leading-relaxed text-[var(--nw-ink-2)]">
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
          </div>
        )}
      </div>
    </section>
  );
}
