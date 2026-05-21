import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Send, X } from "lucide-react";

import { inviteRelationship } from "../api";
import { RELATIONSHIP_TYPES } from "../relationshipFormat";
import TargetCompanyPicker from "./TargetCompanyPicker";

function safeInviteErrorMessage(error) {
  const message = String(error?.message || "").toLowerCase();
  if (/already|duplicate|active|invited|suspended/.test(message)) return "A current relationship already blocks this invitation.";
  if (/relationship type|incompatible|target|source/.test(message)) return "This company cannot be invited with the selected relationship type.";
  if (/not authorized|permission|membership|required|42501/.test(message) || error?.code === "42501") {
    return "You do not have permission to invite company relationships from this company context.";
  }
  return "Falcon could not send this relationship invitation. Refresh company discovery and try again.";
}

export default function InviteRelationshipModal({ open, onClose, onInvited }) {
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const [relationshipType, setRelationshipType] = useState("");
  const [target, setTarget] = useState(null);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRelationshipType("");
    setTarget(null);
    setNotes("");
    setFormError("");
    setSubmitError("");
    setTimeout(() => closeButtonRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKeyDown = (event) => {
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
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [open, onClose, submitting]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setSubmitError("");
    if (!relationshipType) {
      setFormError("Choose a relationship type.");
      return;
    }
    if (!target?.eligible_for_invite) {
      setFormError("Choose an eligible target company.");
      return;
    }
    setSubmitting(true);
    try {
      const relationshipId = await inviteRelationship({
        targetCompanyId: target.company_id,
        relationshipType,
        notes: notes.trim() || null,
      });
      onInvited?.(relationshipId);
    } catch (error) {
      console.debug("Relationship invite failed", {
        code: error?.code,
        message: error?.message,
      });
      setSubmitError(safeInviteErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

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
        aria-labelledby="invite-relationship-title"
        aria-describedby="invite-relationship-description"
        className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Relationship Invite</div>
            <h2 id="invite-relationship-title" className="mt-1 text-xl font-semibold text-slate-950">Invite Company</h2>
            <p id="invite-relationship-description" className="mt-1 text-sm text-slate-500">
              Discover a target company and send a relationship invitation. This does not grant operational visibility.
            </p>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Close invite modal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-5 px-5 py-5">
          {(formError || submitError) && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>{formError || submitError}</div>
            </div>
          )}

          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Step 1 · Relationship Type</span>
            <select
              value={relationshipType}
              onChange={(event) => {
                setRelationshipType(event.target.value);
                setTarget(null);
              }}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            >
              <option value="">Choose relationship type</option>
              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type.key} value={type.key}>{type.label}</option>
              ))}
            </select>
          </label>

          <section aria-labelledby="target-company-step-title">
            <h3 id="target-company-step-title" className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Step 2 · Target Company
            </h3>
            <TargetCompanyPicker relationshipType={relationshipType} value={target} onChange={setTarget} />
          </section>

          {target && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-semibold">Selected:</span> {target.company_name}
            </div>
          )}

          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Step 3 · Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
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
            disabled={submitting || !relationshipType || !target?.eligible_for_invite}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </form>
    </div>
  );
}
