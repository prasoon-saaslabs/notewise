import Link from "next/link";
import { MarketingPageShell } from "@/components/site/MarketingPageShell";
import { DOC_SECTIONS } from "@/lib/docs-data/docs";

export const metadata = {
  title: "Documentation — Notewise",
  description: "Guides for every feature in Notewise — from installation to relationship intelligence.",
};

export default function DocsIndexPage() {
  return (
    <MarketingPageShell>
      <div className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-24">
        <p className="text-sm font-medium tracking-wide text-teal">Documentation</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-ink md:text-5xl">
          Guides & reference
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
          Guides for every feature in Notewise — from installation to relationship intelligence.
        </p>
        <ul className="m-0 mt-10 grid list-none gap-3 p-0 sm:grid-cols-2">
          {DOC_SECTIONS.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/docs/${doc.id}`}
                className="nw-site-card block p-5 transition hover:border-teal/30"
              >
                <h2 className="m-0 text-base font-semibold text-ink">{doc.title}</h2>
                <p className="m-0 mt-1.5 text-sm text-ink-secondary">{doc.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MarketingPageShell>
  );
}
