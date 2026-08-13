import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Hint = {
  kind: string;
  hint?: string | null;
  commitment?: string | null;
  agendaCoverage?: string[];
  prior?: { text: string };
  skipped?: boolean;
};

export function CopilotPanel({ meetingId }: { meetingId: string | null }) {
  const [hint, setHint] = useState<Hint | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (e.shiftKey && e.metaKey && e.code === "KeyH")) {
        setHidden(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const hideShare = () => {
      if (document.visibilityState === "hidden") setHidden(true);
    };
    document.addEventListener("visibilitychange", hideShare);
    return () => document.removeEventListener("visibilitychange", hideShare);
  }, []);

  useEffect(() => {
    const onUtter = (ev: Event) => {
      if (hidden) return;
      const detail = (ev as CustomEvent).detail as { text?: string; meetingId?: string };
      const mid = detail.meetingId || meetingId;
      if (!mid || !detail.text) return;
      const agenda = JSON.parse(localStorage.getItem("og-agenda") || "[]") as string[];
      void api
        .copilotHint(mid, detail.text, agenda)
        .then((res) => {
          if (!res.skipped) setHint(res);
        })
        .catch(() => undefined);
    };
    window.addEventListener("og-utterance", onUtter);
    return () => window.removeEventListener("og-utterance", onUtter);
  }, [meetingId, hidden]);

  if (hidden || !hint) return null;
  return (
    <div className="pointer-events-auto rounded-2xl border border-[var(--nw-border)] bg-white/95 p-3 text-sm shadow-none">
      <div className="flex items-start justify-between gap-2">
        <p className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-accent-dark)]">
          Live copilot · {hint.kind}
        </p>
        <button type="button" className="text-xs text-[var(--nw-ink-4)]" onClick={() => setHidden(true)}>
          Hide
        </button>
      </div>
      {hint.hint ? <p className="mt-1 m-0 text-[var(--nw-ink)]">{hint.hint}</p> : null}
      {hint.prior?.text ? (
        <p className="mt-1 m-0 text-xs text-[var(--nw-ink-3)]">Last time: {hint.prior.text}</p>
      ) : null}
      {hint.commitment ? (
        <p className="mt-1 m-0 text-xs text-[rgb(185_28_28)]">Commitment: {hint.commitment}</p>
      ) : null}
      {hint.agendaCoverage?.length ? (
        <p className="mt-1 m-0 text-xs text-[var(--nw-ink-3)]">
          Agenda: {hint.agendaCoverage.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
