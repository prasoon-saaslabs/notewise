import { MARQUEE } from "@/lib/constants";
import { Reveal } from "@/components/ui/Reveal";

export function LogoMarquee() {
  const items = [...MARQUEE.items, ...MARQUEE.items];

  return (
    <section className="border-y border-border bg-paper-elevated py-10">
      <Reveal className="mx-auto max-w-6xl px-4 text-center md:px-6">
        <p className="text-sm font-medium text-ink-muted">{MARQUEE.label}</p>
      </Reveal>

      <div className="relative mt-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-paper-elevated to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-paper-elevated to-transparent" />

        <div className="marquee-track flex w-max items-center gap-12 whitespace-nowrap px-6">
          {items.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="font-display text-xl tracking-tight text-ink/35 md:text-2xl"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
