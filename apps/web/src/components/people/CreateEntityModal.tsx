import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, UserRound, X } from "lucide-react";
import { Button } from "@notewise/ui";
import type { EntityRecord } from "@notewise/api-client";

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
  onSubmit: (body: {
    name: string;
    kind: EntityRecord["kind"];
    company?: string | null;
  }) => void;
  pending?: boolean;
  error?: string | null;
}>;

export function CreateEntityModal({
  open,
  onClose,
  onSubmit,
  pending = false,
  error = null,
}: Props) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<EntityRecord["kind"]>("person");
  const [company, setCompany] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setKind("person");
    setCompany("");
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="nw-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
      onClick={() => !pending && onClose()}
    >
      <div
        className="nw-modal-dialog w-full max-w-md rounded-2xl p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-entity-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3
              id="create-entity-title"
              className="m-0 text-base font-semibold text-[var(--nw-ink)]"
            >
              Add contact
            </h3>
            <p className="m-0 mt-1 text-sm text-[var(--nw-ink-3)]">
              Create a person or company in your relationship memory.
            </p>
          </div>
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--nw-ink-4)] hover:bg-[var(--nw-surface-2)]"
            onClick={onClose}
            disabled={pending}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              name: name.trim(),
              kind,
              company: kind === "person" ? company.trim() || null : null,
            });
          }}
        >
          <div className="flex gap-2">
            {(
              [
                ["person", "Person", UserRound],
                ["company", "Company", Building2],
              ] as const
            ).map(([value, label, Icon]) => {
              const active = kind === value;
              return (
                <button
                  key={value}
                  type="button"
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "border-[rgb(var(--nw-accent-rgb)_/_0.35)] bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]"
                      : "border-[var(--nw-border)] bg-[var(--nw-surface-solid)] text-[var(--nw-ink-2)] hover:border-[var(--nw-accent)]"
                  }`}
                  onClick={() => setKind(value)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--nw-ink-3)]">
            Name
            <input
              autoFocus
              value={name}
              maxLength={200}
              onChange={(e) => setName(e.target.value)}
              className="nw-page-input rounded-xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-3 py-2.5 text-sm font-normal text-[var(--nw-ink)] outline-none"
              placeholder={kind === "company" ? "Acme Corp" : "Jane Smith"}
            />
          </label>

          {kind === "person" ? (
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--nw-ink-3)]">
              Company <span className="font-normal text-[var(--nw-ink-4)]">(optional)</span>
              <input
                value={company}
                maxLength={200}
                onChange={(e) => setCompany(e.target.value)}
                className="nw-page-input rounded-xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-3 py-2.5 text-sm font-normal text-[var(--nw-ink)] outline-none"
                placeholder="Where they work"
              />
            </label>
          ) : null}

          {error ? (
            <p className="nw-alert m-0 w-full max-w-none" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={pending || !name.trim()}>
              {pending ? "Adding…" : "Add contact"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
