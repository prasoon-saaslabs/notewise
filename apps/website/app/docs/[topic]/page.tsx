import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingPageShell } from "@/components/site/MarketingPageShell";
import { DOC_SECTIONS, getDoc } from "@/lib/docs-data/docs";

type PageProps = {
  params: Promise<{ topic: string }>;
};

export async function generateStaticParams() {
  return DOC_SECTIONS.map((doc) => ({ topic: doc.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { topic } = await params;
  const doc = getDoc(topic);
  if (!doc) return { title: "Docs — Notewise" };
  return {
    title: `${doc.title} — Notewise Docs`,
    description: doc.summary,
  };
}

export default async function DocTopicPage({ params }: PageProps) {
  const { topic } = await params;
  const doc = getDoc(topic);
  if (!doc) notFound();

  const idx = DOC_SECTIONS.findIndex((d) => d.id === doc.id);
  const prev = idx > 0 ? DOC_SECTIONS[idx - 1] : null;
  const next = idx < DOC_SECTIONS.length - 1 ? DOC_SECTIONS[idx + 1] : null;

  return (
    <MarketingPageShell>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 md:grid-cols-[220px_1fr] md:px-6 md:pb-24">
        <aside className="hidden md:block">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            On this page
          </p>
          <nav className="mt-3 flex flex-col gap-1">
            {DOC_SECTIONS.map((d) => (
              <Link
                key={d.id}
                href={`/docs/${d.id}`}
                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                  d.id === doc.id
                    ? "bg-teal-muted text-teal"
                    : "text-ink-secondary hover:bg-paper-muted hover:text-ink"
                }`}
              >
                {d.title}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="min-w-0">
          <p className="text-sm font-medium tracking-wide text-teal">Docs</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">{doc.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-secondary">{doc.summary}</p>

          <div className="marketing-prose mt-8">
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

          <nav className="mt-12 flex flex-wrap justify-between gap-4 border-t border-border pt-6 text-sm">
            {prev ? (
              <Link href={`/docs/${prev.id}`} className="font-semibold text-teal hover:text-teal-hover">
                ← {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`/docs/${next.id}`} className="font-semibold text-teal hover:text-teal-hover">
                {next.title} →
              </Link>
            ) : null}
          </nav>
        </article>
      </div>
    </MarketingPageShell>
  );
}
