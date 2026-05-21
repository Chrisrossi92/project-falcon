import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

function safeLifecycleErrorMessage(error) {
  const message = String(error?.message || "").toLowerCase();
  if (/not authorized|permission|membership|required|42501/.test(message) || error?.code === "42501") {
    return "You do not have permission to perform this relationship action from the current company context.";
  }
  if (/not found|not available|not readable/.test(message)) {
    return "This relationship is no longer available to this company context.";
  }
  if (/only invited|only active|only suspended|already archived|status|transition/.test(message)) {
    return "This relationship is no longer in the expected lifecycle state. Refresh and review the current status.";
  }
  return "Falcon could not complete this relationship action. Refresh and try again.";
}

export default function RelationshipActionConfirmModal({
  open,
  action,
  onClose,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setNotes("");
    setSubmitting(false);
    setError("");
    setTimeout(() => closeButtonRef.current?.focus(), 0);
  }, [open, action?.key]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;

    function onKeyDown(event) {
      if (event.key === "Escape" && !submitting) {
        onClose?.();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [open, onClose, submitting]);

  if (!open || !action) return null;

  const destructive = action.variant === "danger";

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onConfirm?.(notes.trim());
    } catch (confirmError) {
      console.debug("Relationship lifecycle confirmation failed", {
        code: confirmError?.code,
        message: confirmError?.message,
      });
      setError(safeLifecycleErrorMessage(confirmError));
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose?.();
      }}
    >
      <form
        ref={dialogRef}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="relationship-action-title"
        aria-describedby="relationship-action-description"
        className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Relationship Action</div>
            <h2 id="relationship-action-title" className="mt-1 text-xl font-semibold text-slate-950">{action.title}</h2>
            <p id="relationship-action-description" className="mt-1 text-sm text-slate-500">{action.description}</p>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Close relationship action modal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5">
          {error && (
            <div className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>{error}</div>
            </div>
          )}

          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Note</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              disabled={submitting}
              placeholder="Optional context for this lifecycle action"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
            />
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              destructive
                ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                : "border-slate-950 bg-slate-950 text-white hover:bg-slate-800"
            }`}
          >
            {submitting ? "Working..." : action.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
