import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";
import { Button } from "@notewise/ui";

type Props = Readonly<{
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  pending?: boolean;
  error?: string | null;
}>;

export function DeleteMeetingModal({
  open,
  title,
  onClose,
  onConfirm,
  pending = false,
  error = null,
}: Props) {
  if (!open) return null;

  return createPortal(
    <div
      className="nw-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
      onClick={() => !pending && onClose()}
    >
      <div
        className="nw-modal-dialog w-full max-w-md rounded-2xl p-5"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-meeting-title"
        aria-describedby="delete-meeting-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--nw-danger-soft)] text-[var(--nw-danger)]">
              <Trash2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3
                id="delete-meeting-title"
                className="m-0 text-base font-semibold text-[var(--nw-ink)]"
              >
                Delete meeting?
              </h3>
              <p
                id="delete-meeting-desc"
                className="m-0 mt-1 text-sm leading-relaxed text-[var(--nw-ink-3)]"
              >
                This permanently removes{" "}
                <span className="font-medium text-[var(--nw-ink-2)]">{title}</span>
                , including its transcript, notes, and audio. This cannot be undone.
              </p>
            </div>
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
        {error ? (
          <p className="nw-alert mb-3 w-full max-w-none" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Deleting…" : "Delete permanently"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
