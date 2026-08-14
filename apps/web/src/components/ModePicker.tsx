import { useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  DEFAULT_MEETING_MODE_ID,
  FALLBACK_MEETING_MODES,
  mergeMeetingModes,
} from "../lib/meetingModes";
import type { MeetingMode } from "@notewise/api-client";

export function ModePicker() {
  const [modes, setModes] = useState<MeetingMode[]>(FALLBACK_MEETING_MODES);
  const [id, setId] = useState(
    () => localStorage.getItem("og-mode-id") || DEFAULT_MEETING_MODE_ID,
  );

  useEffect(() => {
    void api
      .listModes()
      .then((list) => setModes(mergeMeetingModes(list)))
      .catch(() => setModes(FALLBACK_MEETING_MODES));
  }, []);

  return (
    <label className="flex items-center gap-2 text-xs text-[var(--nw-ink-3)]">
      Mode
      <select
        className="rounded-lg border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-2 py-1 text-xs text-[var(--nw-ink)]"
        value={id}
        onChange={(e) => {
          setId(e.target.value);
          localStorage.setItem("og-mode-id", e.target.value);
        }}
      >
        {modes.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </label>
  );
}
