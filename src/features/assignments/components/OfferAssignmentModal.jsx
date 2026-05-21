import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Send, X } from "lucide-react";

import { listOutgoingActiveRelationships, offerAssignment } from "../api";
import { ActionButton } from "../AssignmentPrimitives";
import { humanize } from "../assignmentFormat";
import AssignmentTermsEditor from "./AssignmentTermsEditor";
import HandoffPayloadEditor from "./HandoffPayloadEditor";
import RelationshipPicker, { relationshipCompanyName } from "./RelationshipPicker";

const ASSIGNMENT_TYPE_BY_RELATIONSHIP = Object.freeze({
  amc_vendor: "vendor_appraisal",
  staff_overflow_vendor: "staff_overflow",
  review_provider: "review_provider",
  enterprise_child: "enterprise_delegated",
  billing_managed: "billing_managed",
  support_managed: "support_managed",
});

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value || {})
      .map(([key, entry]) => [key, typeof entry === "string" ? entry.trim() : entry])
      .filter(([, entry]) => entry !== "" && entry !== null && entry !== undefined)
  );
}

function toIsoDateTime(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function isAfter(first, second) {
  if (!first || !second) return false;
  return new Date(first).getTime() > new Date(second).getTime();
}

function isBefore(first, second) {
  if (!first || !second) return false;
  return new Date(first).getTime() < new Date(second).getTime();
}

function safeOfferErrorMessage(error) {
  const message = String(error?.message || "").toLowerCase();

  if (/duplicate|unique|already|active assignment/.test(message)) {
    return "An active assignment already exists for this relationship and order.";
  }
  if (/active company relationship|relationship.*active|inactive|suspended|archived|declined|expired/.test(message)) {
    return "This relationship is no longer active. Refresh relationships and choose an active relationship.";
  }
  if (/incompatible|assignment type|expected type/.test(message)) {
    return "This relationship type is not compatible with the selected assignment type.";
  }
  if (/not authorized|permission|not readable|not updateable|membership|required|42501/.test(message) || error?.code === "42501") {
    return "You do not have permission to offer this assignment from the current company context.";
  }
  return "Falcon could not offer this assignment. Review the relationship and assignment details, then try again.";
}

export default function OfferAssignmentModal({ open, order, onClose, onSuccess }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [relationships, setRelationships] = useState([]);
  const [relationshipsLoading, setRelationshipsLoading] = useState(false);
  const [relationshipsError, setRelationshipsError] = useState(null);
  const [relationshipId, setRelationshipId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [terms, setTerms] = useState({});
  const [handoffPayload, setHandoffPayload] = useState({});
  const [dueAt, setDueAt] = useState("");
  const [reviewDueAt, setReviewDueAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [allowReviewBeforeDue, setAllowReviewBeforeDue] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedRelationship = useMemo(
    () => relationships.find((relationship) => relationship.id === relationshipId) || null,
    [relationshipId, relationships]
  );
  const assignmentType = selectedRelationship
    ? ASSIGNMENT_TYPE_BY_RELATIONSHIP[selectedRelationship.relationship_type]
    : "";
  const reviewBeforeDue = isBefore(reviewDueAt, dueAt);

  const loadRelationships = async () => {
    setRelationshipsLoading(true);
    setRelationshipsError(null);
    try {
      const rows = await listOutgoingActiveRelationships();
      setRelationships(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.debug("Assignment relationship picker load failed", {
        code: error?.code,
        message: error?.message,
      });
      setRelationships([]);
      setRelationshipsError(error);
    } finally {
      setRelationshipsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setRelationshipId("");
    setInstructions("");
    setTerms({});
    setHandoffPayload({});
    setDueAt("");
    setReviewDueAt("");
    setExpiresAt("");
    setAllowReviewBeforeDue(false);
    setFormError("");
    setSubmitError("");
    loadRelationships();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const previousActiveElement = document.activeElement;
    closeButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousActiveElement?.focus?.();
    };
  }, [open, onClose, submitting]);

  if (!open) return null;

  const validate = () => {
    if (!order?.id) return "Order context is required to offer an assignment.";
    if (!relationshipId || !selectedRelationship) return "Choose an active outgoing relationship.";
    if (!assignmentType) return "This relationship type is not compatible with assignment offers.";
    if (!instructions.trim()) return "Instructions are required.";
    if (isAfter(expiresAt, dueAt)) return "Expiration should not be after the due date.";
    if (reviewBeforeDue && !allowReviewBeforeDue) {
      return "Review due date is before the due date. Confirm that timing before sending.";
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setSubmitError("");

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const assignmentId = await offerAssignment({
        orderId: order.id,
        assignedCompanyId: selectedRelationship.target_company_id,
        relationshipId,
        assignmentType,
        instructions: instructions.trim(),
        terms: compactObject(terms),
        handoffPayload: compactObject(handoffPayload),
        dueAt: toIsoDateTime(dueAt),
        reviewDueAt: toIsoDateTime(reviewDueAt),
        expiresAt: toIsoDateTime(expiresAt),
      });
      onSuccess?.(assignmentId);
    } catch (error) {
      console.debug("Assignment offer failed", {
        code: error?.code,
        message: error?.message,
      });
      setSubmitError(safeOfferErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose?.();
        }
      }}
    >
      <form
        ref={dialogRef}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-assignment-title"
        className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Owner Action</div>
            <h2 id="offer-assignment-title" className="mt-1 text-xl font-semibold text-slate-950">Offer Assignment</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create an assignment packet for order {order?.order_number || String(order?.id || "").slice(0, 8)}.
            </p>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Close offer assignment modal"
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

          <RelationshipPicker
            relationships={relationships}
            value={relationshipId}
            onChange={setRelationshipId}
            loading={relationshipsLoading}
            error={relationshipsError}
            onRetry={loadRelationships}
          />

          <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Assigned Company</div>
              <div className="mt-1 text-sm font-medium text-slate-800">
                {selectedRelationship ? relationshipCompanyName(selectedRelationship) : "Choose a relationship"}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Assignment Type</div>
              <div className="mt-1 text-sm font-medium text-slate-800">
                {assignmentType ? humanize(assignmentType) : "Derived from relationship"}
              </div>
            </div>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Instructions</span>
            <textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              rows={5}
              required
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Due</span>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Review Due</span>
              <input
                type="datetime-local"
                value={reviewDueAt}
                onChange={(event) => setReviewDueAt(event.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Expires</span>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </label>
          </div>

          {reviewBeforeDue && (
            <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <input
                type="checkbox"
                checked={allowReviewBeforeDue}
                onChange={(event) => setAllowReviewBeforeDue(event.target.checked)}
                className="mt-1"
              />
              <span>Allow review due date before the assignment due date.</span>
            </label>
          )}

          <AssignmentTermsEditor value={terms} onChange={setTerms} />
          <HandoffPayloadEditor value={handoffPayload} onChange={setHandoffPayload} />
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <ActionButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </ActionButton>
          <ActionButton type="submit" disabled={submitting || relationshipsLoading || !relationships.length} icon={Send}>
            {submitting ? "Offering..." : "Offer Assignment"}
          </ActionButton>
        </div>
      </form>
    </div>
  );
}
