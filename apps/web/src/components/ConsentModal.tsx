import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function ConsentModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const open = () => setOpen(true);
    window.addEventListener("og-need-consent", open);
    if (localStorage.getItem("og-consent") === "1") return () => window.removeEventListener("og-need-consent", open);
    void api
      .getEnrollment()
      .then((e) => {
        if (!(e as { consentAccepted?: boolean }).consentAccepted) setOpen(true);
      })
      .catch(() => setOpen(true));
    return () => window.removeEventListener("og-need-consent", open);
  }, []);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--nw-modal-backdrop)] p-4">
      <div className="max-w-md rounded-2xl bg-[var(--nw-surface-solid)] p-5 ring-1 ring-[var(--nw-border)]">
        <h2 className="m-0 text-lg font-bold text-[var(--nw-ink)]">Recording consent</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--nw-ink-2)]">
          Notewise records microphone and (on desktop) system audio. Laws differ: some places
          require every participant to agree. Confirm you have consent before you start.
        </p>
        <p className="mt-2 text-xs text-[var(--nw-ink-4)]">
          Audio goes only to the Hear endpoint you configured. It is not stored on disk after the
          call.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl px-3 py-2 text-sm text-[var(--nw-ink-3)]"
            onClick={() => setOpen(false)}
          >
            Not now
          </button>
          <button
            type="button"
            className="rounded-xl bg-[var(--nw-accent-dark)] px-3 py-2 text-sm font-semibold text-white"
            onClick={() => {
              localStorage.setItem("og-consent", "1");
              void api.acceptConsent().catch(() => undefined);
              setOpen(false);
            }}
          >
            I have consent
          </button>
        </div>
      </div>
    </div>
  );
}
