import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Search, UserRound } from "lucide-react";
import type { EntityRecord } from "@notewise/api-client";

export function EntityListRail({
  entities,
  selectedId,
}: {
  entities: EntityRecord[];
  selectedId?: string;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entities;
    return entities.filter(
      (e) =>
        e.name.toLowerCase().includes(needle) ||
        (e.company || "").toLowerCase().includes(needle) ||
        e.kind.includes(needle),
    );
  }, [entities, q]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const ao = a.openItemCount ?? 0;
        const bo = b.openItemCount ?? 0;
        if (bo !== ao) return bo - ao;
        return a.name.localeCompare(b.name);
      }),
    [filtered],
  );

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] md:w-72 lg:w-80">
      <div className="border-b border-[var(--nw-border)] p-3">
        <h2 className="m-0 text-sm font-bold text-[var(--nw-ink)]">Relationships</h2>
        <p className="m-0 mt-0.5 text-[0.65rem] text-[var(--nw-ink-4)]">
          {entities.length} contact{entities.length === 1 ? "" : "s"} in memory
        </p>
        <label className="relative mt-2 block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--nw-ink-4)]" />
          <input
            className="w-full rounded-xl border border-[var(--nw-border)] bg-[var(--nw-surface-2)] py-2 pl-8 pr-3 text-xs outline-none focus:border-[var(--nw-accent)]"
            placeholder="Search people & companies"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>

      <ul className="m-0 min-h-0 flex-1 list-none overflow-auto p-2">
        {sorted.map((e) => {
          const active = selectedId === e.id;
          const Icon = e.kind === "company" ? Building2 : UserRound;
          const meetings = e.meetingIds?.length ?? 0;
          const open = e.openItemCount ?? 0;

          return (
            <li key={e.id}>
              <Link
                to={`/people/${e.id}`}
                className={`mb-1 block rounded-xl px-2.5 py-2 transition ${
                  active
                    ? "bg-[linear-gradient(135deg,rgb(var(--nw-accent-rgb)_/_0.12)_0%,rgb(14_165_233_/_0.08)_100%)] ring-1 ring-[rgb(var(--nw-accent-rgb)_/_0.2)]"
                    : "hover:bg-[var(--nw-surface-2)]"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                      active
                        ? "bg-[var(--nw-accent-dark)] text-white"
                        : "bg-[var(--nw-surface-2)] text-[var(--nw-ink-3)]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--nw-ink)]">
                      {e.name}
                    </span>
                    <span className="mt-0.5 flex flex-wrap gap-1.5">
                      <span className="text-[0.58rem] uppercase tracking-wide text-[var(--nw-ink-4)]">
                        {e.kind}
                      </span>
                      {meetings > 0 ? (
                        <span className="rounded-full bg-[var(--nw-surface-solid)] px-1.5 py-px text-[0.58rem] font-semibold text-[var(--nw-ink-3)] ring-1 ring-[var(--nw-border)]">
                          {meetings} mtg{meetings === 1 ? "" : "s"}
                        </span>
                      ) : null}
                      {open > 0 ? (
                        <span className="rounded-full bg-[rgb(254_243_199)] px-1.5 py-px text-[0.58rem] font-semibold text-[rgb(146_64_14)] ring-1 ring-[rgb(251_191_36_/_0.35)]">
                          {open} open
                        </span>
                      ) : null}
                    </span>
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
        {!sorted.length ? (
          <li className="px-2 py-6 text-center text-xs text-[var(--nw-ink-4)]">
            {q.trim() ? "No matches." : "Record or import meetings to build relationship memory."}
          </li>
        ) : null}
      </ul>
    </aside>
  );
}
