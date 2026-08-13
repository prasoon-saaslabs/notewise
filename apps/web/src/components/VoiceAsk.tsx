import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import type { AskResponse } from "@notewise/api-client";
import type { BrainCitation } from "./MeetingBrain";

const SOURCE_LABEL: Record<string, string> = {
  recap: "PyAI Recap",
  ollama: "Local LLM",
  retrieval: "Transcript matches",
  recap_failed: "Transcript matches",
  recap_scope: "Transcript matches",
  no_evidence: "No matches",
};

export function VoiceAsk({
  entityId,
  autoFocus,
  onCitationClick,
}: {
  entityId?: string;
  autoFocus?: boolean;
  onCitationClick?: (citation: BrainCitation) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (autoFocus) {
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [autoFocus]);

  const run = async (speak: boolean) => {
    const question = q.trim();
    if (!question) return;
    setBusy(true);
    setError(null);
    try {
      const res = speak
        ? await api.voiceAsk(question)
        : await api.ask(question, entityId);
      setResult(res);
      if (res.audioBase64) {
        const src = `data:audio/mpeg;base64,${res.audioBase64}`;
        const audio = new Audio(src);
        void audio.play().catch(() => undefined);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ask failed");
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const source = result?.source ? SOURCE_LABEL[result.source] || result.source : null;

  return (
    <div className="rounded-xl bg-[rgb(248_250_252_/_0.6)] p-3 ring-1 ring-[var(--nw-border)]">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nw-accent-dark)]" />
          <input
            ref={inputRef}
            className="w-full rounded-xl border border-[var(--nw-border)] bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[var(--nw-accent)]"
            placeholder={
              entityId
                ? "What did they say about pricing or security?"
                : "What has Acme said about security?"
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void run(false);
            }}
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nw-accent-dark)] px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"
          disabled={busy || !q.trim()}
          onClick={() => void run(false)}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Ask
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-semibold ring-1 ring-[var(--nw-border)] disabled:opacity-50"
          disabled={busy || !q.trim()}
          onClick={() => void run(true)}
          title="Speak answer (Hear → retrieve → Cast)"
        >
          <Mic className="h-3.5 w-3.5" />
        </button>
      </div>

      {error ? (
        <p className="mt-2 m-0 text-xs text-[var(--nw-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-3 border-t border-[var(--nw-border)] pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-3)]">
              Answer
            </p>
            {source ? (
              <span className="rounded-full bg-[var(--nw-accent-soft)] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide text-[var(--nw-accent-dark)]">
                {source}
              </span>
            ) : null}
          </div>
          {result.sourceDetail ? (
            <p className="mb-2 m-0 rounded-lg bg-[rgb(255_251_235)] px-2.5 py-2 text-xs text-[rgb(180_83_9)]">
              {result.sourceDetail}
            </p>
          ) : null}
          {result.answer?.length ? (
            <ul className="m-0 list-none space-y-2 p-0">
              {result.answer.map((b, i) => {
                const cite = b.citations?.[0];
                return (
                  <li
                    key={i}
                    className="rounded-lg bg-white px-3 py-2 text-sm leading-relaxed text-[var(--nw-ink-2)] ring-1 ring-[var(--nw-border)]"
                  >
                    {b.text}
                    {cite ? (
                      onCitationClick ? (
                        <button
                          type="button"
                          className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg bg-[var(--nw-accent-soft)] px-2.5 py-1.5 text-left text-[0.65rem] font-semibold text-[var(--nw-accent-dark)] transition hover:bg-[rgb(14_116_144_/_0.18)]"
                          onClick={() =>
                            onCitationClick({
                              meetingId: cite.meetingId,
                              meetingTitle: cite.meetingTitle,
                              lineId: cite.lineId,
                              startMs: cite.startMs,
                              text: cite.text,
                              speaker: cite.speaker,
                            })
                          }
                        >
                          <span className="truncate">
                            Jump to {cite.meetingTitle || "meeting"} ·{" "}
                            {Math.floor((cite.startMs || 0) / 1000)}s
                          </span>
                          <span aria-hidden>→</span>
                        </button>
                      ) : (
                        <span className="mt-1 block text-[0.65rem] font-medium text-[var(--nw-accent-dark)]">
                          {cite.meetingTitle} · {Math.floor((cite.startMs || 0) / 1000)}s
                        </span>
                      )
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="m-0 text-sm text-[var(--nw-ink-3)]">
              No matching meetings yet — record a meeting first.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 m-0 text-[0.72rem] text-[var(--nw-ink-4)]">
          Searches your library, then synthesizes with PyAI Recap (requires recap:read on your key).
        </p>
      )}
    </div>
  );
}
