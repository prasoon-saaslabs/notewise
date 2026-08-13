import { Link, useParams } from "react-router-dom";
import { DOC_SECTIONS, getDoc } from "../data/docs";

export function DocsIndexPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="m-0 text-3xl font-bold tracking-tight">Documentation</h1>
      <p className="m-0 mt-3 max-w-2xl text-sm text-[var(--nw-ink-3)]">
        Guides for every feature in Notewise — from installation to relationship intelligence.
      </p>
      <ul className="m-0 mt-10 grid list-none gap-3 p-0 sm:grid-cols-2">
        {DOC_SECTIONS.map((doc) => (
          <li key={doc.id}>
            <Link to={`/docs/${doc.id}`} className="nw-site-card block p-5">
              <h2 className="m-0 text-base font-bold text-[var(--nw-ink)]">{doc.title}</h2>
              <p className="m-0 mt-1.5 text-sm text-[var(--nw-ink-3)]">{doc.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DocPage() {
  const { topic } = useParams<{ topic: string }>();
  const doc = topic ? getDoc(topic) : undefined;

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-[var(--nw-ink-3)]">Doc not found.</p>
        <Link to="/docs" className="mt-2 inline-block text-sm font-semibold text-[var(--nw-accent-dark)]">
          Back to docs
        </Link>
      </div>
    );
  }

  const idx = DOC_SECTIONS.findIndex((d) => d.id === doc.id);
  const prev = idx > 0 ? DOC_SECTIONS[idx - 1] : null;
  const next = idx < DOC_SECTIONS.length - 1 ? DOC_SECTIONS[idx + 1] : null;

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[220px_1fr] md:px-6 md:py-16">
      <aside className="hidden md:block">
        <p className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
          On this page
        </p>
        <nav className="mt-3 flex flex-col gap-1">
          {DOC_SECTIONS.map((d) => (
            <Link
              key={d.id}
              to={`/docs/${d.id}`}
              className={`rounded-lg px-2 py-1.5 text-xs font-medium ${
                d.id === doc.id
                  ? "bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]"
                  : "text-[var(--nw-ink-3)] hover:bg-[var(--nw-surface-2)]"
              }`}
            >
              {d.title}
            </Link>
          ))}
        </nav>
      </aside>

      <article className="min-w-0">
        <p className="m-0 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-accent-dark)]">
          Docs
        </p>
        <h1 className="m-0 mt-2 text-3xl font-bold tracking-tight">{doc.title}</h1>
        <p className="m-0 mt-3 text-base text-[var(--nw-ink-3)]">{doc.summary}</p>

        <div className="nw-prose mt-8">
          {doc.body.map((para) => (
            <p key={para.slice(0, 40)}>{para}</p>
          ))}
          {doc.tips?.length ? (
            <>
              <h2>Tips</h2>
              <ul>
                {doc.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <nav className="mt-12 flex flex-wrap justify-between gap-4 border-t border-[var(--nw-border)] pt-6 text-sm">
          {prev ? (
            <Link to={`/docs/${prev.id}`} className="font-semibold text-[var(--nw-accent-dark)]">
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/docs/${next.id}`} className="font-semibold text-[var(--nw-accent-dark)]">
              {next.title} →
            </Link>
          ) : null}
        </nav>
      </article>
    </div>
  );
}
