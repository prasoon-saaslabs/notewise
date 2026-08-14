import { cn } from "@/lib/utils";

export function NotepadMock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-paper-elevated shadow-[0_24px_80px_rgba(0,0,0,0.08)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-2 text-xs text-ink-muted">Acme Corp — sales discovery</span>
        <span className="ml-auto rounded-full bg-teal-muted px-2 py-0.5 text-[10px] font-medium text-teal">
          Citation gate: pass
        </span>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Scratch notes
          </p>
          <div className="space-y-2 rounded-xl bg-paper p-3 text-xs leading-relaxed text-ink-secondary">
            <p>• SSO objection again — need SAML?</p>
            <p>• Promised SOC 2 report — send before Friday</p>
            <p>• Pricing tiers still open</p>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Notes with receipts
          </p>
          <div className="space-y-2 rounded-xl bg-paper-muted p-3 text-xs leading-relaxed">
            <p>
              <span className="rounded-sm bg-highlight px-1">Pilot delayed</span> pending legal
              sign-off on terms page.{" "}
              <button type="button" className="rounded bg-teal/10 px-1 font-mono text-[10px] text-teal">
                14:22
              </button>
            </p>
            <p className="text-ink-secondary">
              Meera to send SOC 2 report by Friday.{" "}
              <button type="button" className="rounded bg-teal/10 px-1 font-mono text-[10px] text-teal">
                14:31
              </button>
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Send SOC 2 report", owner: "Meera", due: "Fri" },
            { label: "Legal terms follow-up", owner: "Priya", due: "Mon" },
          ].map((item) => (
            <span
              key={item.label}
              className="rounded-full border border-border bg-paper px-2.5 py-1 text-[10px] text-ink-secondary"
            >
              {item.label} · {item.owner} · {item.due}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
