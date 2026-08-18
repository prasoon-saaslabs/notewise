import Link from "next/link";
import { MarketingPageShell } from "@/components/site/MarketingPageShell";
import { FEATURES } from "@/lib/docs-data/features";

export const metadata = {
  title: "Features — Notewise",
  description: "From first capture to relationship intelligence — each feature documented with setup notes and tips.",
};

export default function FeaturesPage() {
  return (
    <MarketingPageShell>
      <div className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-24">
        <p className="text-sm font-medium tracking-wide text-teal">Features</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-ink md:text-5xl">
          Everything in Notewise
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
          From first capture to relationship intelligence — each feature is documented with setup
          notes and tips.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.id}
                href={`/docs/${f.docId}`}
                className="nw-site-card flex gap-4 p-5 transition hover:border-teal/30"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-muted text-teal">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <h2 className="m-0 text-base font-semibold text-ink">{f.title}</h2>
                  <p className="m-0 mt-1 text-sm leading-relaxed text-ink-secondary">
                    {f.description}
                  </p>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </MarketingPageShell>
  );
}
