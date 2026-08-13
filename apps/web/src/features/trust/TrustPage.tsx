import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { PageMotion } from "../../components/PageMotion";

export function TrustPage() {
  const trust = useQuery({ queryKey: ["trust"], queryFn: () => api.getTrust() });
  const privacy = useQuery({ queryKey: ["privacy"], queryFn: () => api.getPrivacy() });
  const runs = trust.data?.runs ?? [];
  const flow = trust.data?.dataFlow ?? {};
  const p = privacy.data;

  return (
    <PageMotion className="h-full overflow-auto p-4">
      <h1 className="m-0 text-2xl font-bold">Trust & data flow</h1>
      <p className="mt-1 text-sm text-[var(--nw-ink-3)]">
        Named exits, citation gates, and what actually leaves this machine.
      </p>
      {p ? (
        <section className="mt-4 rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] p-4 text-sm">
          <h2 className="m-0 text-base font-semibold">{p.title}</h2>
          <p className="mt-2">{p.audio}</p>
          <p>{p.text}</p>
          <p>{p.atRest}</p>
          <p className="text-[var(--nw-ink-4)]">{p.consent}</p>
        </section>
      ) : null}
      <section className="mt-4 rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] p-4 text-sm">
        <h2 className="m-0 text-base font-semibold">Data flow</h2>
        <dl className="mt-2 grid gap-1">
          {Object.entries(flow).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="w-28 font-semibold capitalize">{k}</dt>
              <dd className="m-0 text-[var(--nw-ink-2)]">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-[var(--nw-ink-4)]">SQLite: {trust.data?.dbPath}</p>
      </section>
      <section className="mt-4 rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] p-4">
        <h2 className="m-0 text-base font-semibold">Recent runs</h2>
        <ul className="mt-2 m-0 list-none p-0 text-sm">
          {runs.map((r) => (
            <li key={String(r.id)} className="border-b border-[var(--nw-border)] py-2">
              <b>{String(r.exit)}</b> · cited {String(r.claimsCited)} · blocked {String(r.claimsBlocked)} ·{" "}
              {String(r.tokens)} tok · {String(r.elapsedMs)}ms
            </li>
          ))}
          {!runs.length ? <li className="text-[var(--nw-ink-4)]">No runs yet.</li> : null}
        </ul>
      </section>
    </PageMotion>
  );
}
