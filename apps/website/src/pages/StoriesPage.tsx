import { Link } from "react-router-dom";
import { USER_STORIES } from "../data/stories";
import { FEATURES } from "../data/features";

export function StoriesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <p className="m-0 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-accent-dark)]">
        User stories
      </p>
      <h1 className="m-0 mt-2 text-3xl font-bold tracking-tight md:text-4xl">
        How teams use Notewise
      </h1>
      <p className="m-0 mt-3 max-w-2xl text-sm leading-relaxed text-[var(--nw-ink-3)]">
        Real workflows — from sales discovery to investor diligence — showing how local capture and
        relationship memory compound over time.
      </p>

      <div className="mt-10 flex flex-col gap-6">
        {USER_STORIES.map((story) => (
          <article key={story.id} className="nw-site-card overflow-hidden">
            <div className="border-b border-[var(--nw-border)] bg-[linear-gradient(135deg,rgb(14_116_144_/_0.06)_0%,#fff_60%)] px-5 py-4 md:px-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
                    {story.persona} · {story.role}
                  </p>
                  <h2 className="m-0 mt-1 text-xl font-bold text-[var(--nw-ink)]">{story.title}</h2>
                </div>
              </div>
              <p className="m-0 mt-3 text-sm leading-relaxed text-[var(--nw-ink-2)]">
                {story.situation}
              </p>
            </div>
            <div className="grid gap-6 px-5 py-5 md:grid-cols-2 md:px-6">
              <div>
                <h3 className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
                  Flow
                </h3>
                <ol className="m-0 mt-2 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-[var(--nw-ink-2)]">
                  {story.flow.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
              <div>
                <h3 className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
                  Outcome
                </h3>
                <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--nw-ink-2)]">
                  {story.outcome}
                </p>
                <h3 className="m-0 mt-4 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
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
                        to={`/docs/${docId}`}
                        className="rounded-full bg-[var(--nw-accent-soft)] px-2.5 py-1 text-[0.65rem] font-semibold text-[var(--nw-accent-dark)]"
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
  );
}
