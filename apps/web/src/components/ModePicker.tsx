import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { MeetingMode } from "@notewise/api-client";

export function ModePicker() {
  const [modes, setModes] = useState<MeetingMode[]>([]);
  const [id, setId] = useState(() => localStorage.getItem("og-mode-id") || "sales-discovery");

  useEffect(() => {
    void api.listModes().then(setModes).catch(() => undefined);
  }, []);

  return (
    <label className="flex items-center gap-2 text-xs text-[var(--nw-ink-3)]">
      Mode
      <select
        className="rounded-lg border border-[var(--nw-border)] bg-white px-2 py-1 text-xs text-[var(--nw-ink)]"
        value={id}
        onChange={(e) => {
          setId(e.target.value);
          localStorage.setItem("og-mode-id", e.target.value);
        }}
      >
        {(modes.length ? modes : [{ id: "sales-discovery", name: "Sales discovery" }]).map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </label>
  );
}
