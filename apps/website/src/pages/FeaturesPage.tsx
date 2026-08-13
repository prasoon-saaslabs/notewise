import { Link } from "react-router-dom";
import { FEATURES } from "../data/features";

export function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <p className="m-0 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-accent-dark)]">
        Features
      </p>
      <h1 className="m-0 mt-2 text-3xl font-bold tracking-tight md:text-4xl">
        Everything in Notewise
      </h1>
      <p className="m-0 mt-3 max-w-2xl text-sm leading-relaxed text-[var(--nw-ink-3)]">
        From first capture to relationship intelligence — each feature is documented with setup
        notes and tips.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Link key={f.id} to={`/docs/${f.docId}`} className="nw-site-card flex gap-4 p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <h2 className="m-0 text-base font-bold text-[var(--nw-ink)]">{f.title}</h2>
                <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--nw-ink-3)]">
                  {f.description}
                </p>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
