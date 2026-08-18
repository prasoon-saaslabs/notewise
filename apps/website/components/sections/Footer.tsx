import Link from "next/link";
import { FOOTER, NAV_LINKS } from "@/lib/constants";
import { GITHUB_URL } from "@/lib/siteConfig";
import { Logo } from "@/components/ui/Logo";

const OPEN_SOURCE_LINKS = [
  { label: "GitHub", href: GITHUB_URL, external: true },
  { label: "MIT License", href: "/open-source#license" },
  { label: "Data flow", href: "/privacy#data-flow" },
  { label: "Contributing", href: "/open-source#contributing" },
] as const;

const LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Recording consent", href: "/privacy#consent" },
  { label: "Security", href: "/privacy#security" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-paper-muted/40 pb-10 pt-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/" className="inline-block transition-opacity hover:opacity-90">
              <Logo markSize={36} wordmarkClassName="font-display text-2xl font-semibold" />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-secondary">
              {FOOTER.blurb}
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-wider text-teal">
              {FOOTER.tagline}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Product
              </p>
              <ul className="mt-3 space-y-2">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-secondary hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/download" className="text-sm text-ink-secondary hover:text-ink">
                    Download
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="text-sm text-ink-secondary hover:text-ink">
                    Documentation
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Open source
              </p>
              <ul className="mt-3 space-y-2">
                {OPEN_SOURCE_LINKS.map((item) => (
                  <li key={item.label}>
                    {"external" in item && item.external ? (
                      <a
                        href={item.href}
                        className="text-sm text-ink-secondary hover:text-ink"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link href={item.href} className="text-sm text-ink-secondary hover:text-ink">
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Legal
              </p>
              <ul className="mt-3 space-y-2">
                {LEGAL_LINKS.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-ink-secondary hover:text-ink">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SaaS Labs · NoteWise</p>
          <p>Powered by PyAI · Hear · Recap · Cast · Clone · Trace</p>
        </div>
      </div>
    </footer>
  );
}
