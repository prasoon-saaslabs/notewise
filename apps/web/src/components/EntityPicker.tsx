import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { EntityRecord } from "@notewise/api-client";
import { PreCallBriefCard } from "./PreCallBriefCard";

export function EntityPicker() {
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [id, setId] = useState(() => localStorage.getItem("og-entity-id") || "");

  useEffect(() => {
    void api.listEntities().then(setEntities).catch(() => undefined);
  }, []);

  if (!entities.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-xs text-[var(--nw-ink-3)]">
        Meeting with
        <select
          className="min-w-0 flex-1 rounded-lg border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-2 py-1 text-xs text-[var(--nw-ink)]"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            if (e.target.value) localStorage.setItem("og-entity-id", e.target.value);
            else localStorage.removeItem("og-entity-id");
          }}
        >
          <option value="">—</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
      {id ? <PreCallBriefCard entityId={id} /> : null}
    </div>
  );
}
