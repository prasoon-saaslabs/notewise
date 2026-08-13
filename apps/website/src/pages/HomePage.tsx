import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { FEATURES } from "../data/features";

export function HomePage() {
  return (
    <>
      <section className="nw-site-hero px-4 pb-16 pt-14 md:px-6 md:pb-24 md:pt-20">
        <div className="mx-auto max-w-6xl">
          <p className="m-0 inline-flex items-center gap-1.5 rounded-full bg-[var(--nw-accent-soft)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--nw-accent-dark)]">
            <Sparkles className="h-3 w-3" />
            Open source · MIT
          </p>
          <h1 className="m-0 mt-5 max-w-3xl text-4xl font-bold tracking-tight text-[var(--nw-ink)] md:text-5xl md:leading-[1.08]">
            Meeting intelligence that stays on your Mac
          </h1>
          <p className="m-0 mt-5 max-w-2xl text-lg leading-relaxed text-[var(--nw-ink-3)]">
            Notewise captures calls without a bot, writes notes where every claim links to the
            transcript, and builds relationship memory across people and companies — powered by PyAI,
            stored in SQLite on your disk.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/download"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--nw-accent-dark)] px-5 py-3 text-sm font-semibold text-white"
            >
              Download for macOS <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/docs/getting-started"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--nw-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--nw-ink-2)]"
            >
              Read the docs
            </Link>
          </div>
          <dl className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Capture", value: "No bot in your call" },
              { label: "Notes", value: "Receipts on every claim" },
              { label: "Memory", value: "People over time" },
            ].map((s) => (
              <div key={s.label} className="nw-site-card px-4 py-3">
                <dt className="text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
                  {s.label}
                </dt>
                <dd className="m-0 mt-1 text-sm font-semibold text-[var(--nw-ink)]">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-[var(--nw-border)] bg-white px-4 py-16 md:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="m-0 text-2xl font-bold tracking-tight">Built for how you actually work</h2>
          <p className="m-0 mt-2 max-w-2xl text-sm text-[var(--nw-ink-3)]">
            Not a dashboard of vanity metrics — a calm workspace for capture, prep, and recall.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.slice(0, 6).map((f) => {
              const Icon = f.icon;
              return (
                <Link key={f.id} to={`/docs/${f.docId}`} className="nw-site-card block p-5">
                  <Icon className="h-5 w-5 text-[var(--nw-accent-dark)]" />
                  <h3 className="m-0 mt-3 text-base font-bold text-[var(--nw-ink)]">{f.title}</h3>
                  <p className="m-0 mt-1.5 text-sm leading-relaxed text-[var(--nw-ink-3)]">
                    {f.description}
                  </p>
                </Link>
              );
            })}
          </div>
          <Link
            to="/features"
            className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[var(--nw-accent-dark)]"
          >
            All features <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="border-t border-[var(--nw-border)] px-4 py-16 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="m-0 text-2xl font-bold">Free and open source</h2>
            <p className="m-0 mt-2 max-w-lg text-sm text-[var(--nw-ink-3)]">
              No subscription. No seat limits. Fork it, self-host it, audit every line. You bring
              your own PyAI key for speech and notes.
            </p>
          </div>
          <Link
            to="/open-source"
            className="rounded-xl border border-[var(--nw-border)] bg-white px-5 py-3 text-sm font-semibold"
          >
            Why open source
          </Link>
        </div>
      </section>
    </>
  );
}
