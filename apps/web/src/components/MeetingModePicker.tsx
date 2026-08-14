import { useEffect, useState } from "react";
import { Briefcase, Loader2 } from "lucide-react";
import type { MeetingMode } from "@notewise/api-client";
import { api } from "../lib/api";
import { FALLBACK_MEETING_MODES, mergeMeetingModes, modeHint } from "../lib/meetingModes";

const pillClass = (active: boolean, disabled: boolean, pending: boolean) =>
  `rounded-full px-3 py-1.5 text-xs font-semibold transition backdrop-blur-sm ${
    disabled ? "cursor-not-allowed opacity-55" : ""
  } ${
    active
      ? `border border-[rgb(var(--nw-accent-rgb)_/_0.32)] bg-[rgb(var(--nw-accent-rgb)_/_0.16)] text-[var(--nw-accent-dark)] shadow-[0_4px_16px_rgb(var(--nw-accent-rgb)_/_0.1)] ${
          pending ? "nw-mode-pill-pending" : ""
        }`
      : "bg-[var(--nw-glass-bg)] text-[var(--nw-ink-2)] ring-1 ring-[var(--nw-border)] hover:bg-[rgb(var(--nw-accent-rgb)_/_0.08)]"
  }`;

export function MeetingModePicker({
  value,
  onChange,
  disabled = false,
  pending = false,
  showHint = true,
  compact = false,
}: {
  value: string;
  onChange: (modeId: string) => void;
  disabled?: boolean;
  pending?: boolean;
  showHint?: boolean;
  compact?: boolean;
}) {
  const [modes, setModes] = useState<MeetingMode[]>(FALLBACK_MEETING_MODES);

  useEffect(() => {
    void api
      .listModes()
      .then((list) => setModes(mergeMeetingModes(list)))
      .catch(() => setModes(FALLBACK_MEETING_MODES));
  }, []);

  const active = modes.find((m) => m.id === value) ?? modes[0];

  return (
    <div className={pending ? "nw-mode-picker-pending relative" : undefined}>
      {!compact ? (
        <div className="relative mb-2 flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
          <Briefcase className="h-3.5 w-3.5" />
          Meeting mode
          {pending ? (
            <span className="inline-flex items-center gap-1 font-normal normal-case tracking-normal text-[var(--nw-accent-dark)]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Regenerating…
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="relative flex flex-wrap gap-1.5">
        {modes.map((m) => {
          const activeMode = m.id === value;
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled || pending || activeMode}
              onClick={() => onChange(m.id)}
              className={pillClass(activeMode, disabled || pending, pending && activeMode)}
              title={m.pack_id ? `PyAI pack: ${m.pack_id}` : undefined}
            >
              {activeMode && pending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {m.name}
                </span>
              ) : (
                m.name
              )}
            </button>
          );
        })}
      </div>
      {showHint ? (
        <p className="relative mt-2 m-0 text-[0.72rem] leading-relaxed text-[var(--nw-ink-3)]">
          Shapes PyAI Recap —{" "}
          <span
            className={`font-medium text-[var(--nw-ink-2)] transition-opacity duration-300 ${
              pending ? "opacity-60" : "opacity-100"
            }`}
          >
            {modeHint(active?.id)}
          </span>
          {active?.pack_id ? (
            <span className="block text-[0.65rem] text-[var(--nw-ink-4)]">
              Pack: {active.pack_id}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
