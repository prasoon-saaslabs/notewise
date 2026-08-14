import Link from "next/link";
import { MarketingPageShell } from "@/components/site/MarketingPageShell";
import { FEATURES } from "@/lib/docs-data/features";
import { USER_STORIES } from "@/lib/docs-data/stories";

export const metadata = {
  title: "User stories — Notewise",
  description: "Real workflows showing how local capture and relationship memory compound over time.",
};

export default function StoriesPage() {
  return (
    <MarketingPageShell>
      <div className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-24">
        <p className="text-sm font-medium tracking-wide text-teal">User stories</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-ink md:text-5xl">
          How teams use Notewise
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
          Real workflows — from sales discovery to investor diligence — showing how local capture and
          relationship memory compound over time.
        </p>

        <div className="mt-10 flex flex-col gap-6">
          {USER_STORIES.map((story) => (
            <article key={story.id} className="nw-site-card overflow-hidden">
              <div className="border-b border-border bg-gradient-to-br from-teal-subtle/80 to-paper-elevated px-5 py-4 md:px-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="m-0 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      {story.persona} · {story.role}
                    </p>
                    <h2 className="m-0 mt-1 font-display text-xl text-ink">{story.title}</h2>
                  </div>
                </div>
                <p className="m-0 mt-3 text-sm leading-relaxed text-ink-secondary">
                  {story.situation}
                </p>
              </div>
              <div className="grid gap-6 px-5 py-5 md:grid-cols-2 md:px-6">
                <div>
                  <h3 className="m-0 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Flow
                  </h3>
                  <ol className="m-0 mt-2 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-ink-secondary">
                    {story.flow.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="m-0 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Outcome
                  </h3>
                  <p className="m-0 mt-2 text-sm leading-relaxed text-ink-secondary">
                    {story.outcome}
                  </p>
                  <h3 className="m-0 mt-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Features used
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {story.features.map((fid) => {
                      const feat = FEATURES.find((f) => f.docId === fid || f.id === fid);
                      const label = feat?.title ?? fid;
                      const docId = feat?.docId ?? fid;
                      return (
                        <Link
                          key={fid}
                          href={`/docs/${docId}`}
                          className="rounded-full bg-teal-muted px-2.5 py-1 text-xs font-semibold text-teal"
                        >
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </MarketingPageShell>
  );
}
