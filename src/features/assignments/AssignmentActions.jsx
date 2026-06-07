import { useState } from "react";
import { CheckCircle2, FilePenLine, Play, Send, XCircle } from "lucide-react";

import {
  acceptAssignment,
  cancelAssignment,
  completeAssignment,
  declineAssignment,
  requestVendorAssignmentRevision,
  revokeAssignment,
  startAssignment,
  submitAssignment,
} from "./api";
import { ActionButton } from "./AssignmentPrimitives";

function ActionModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false,
  requireReason = false,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  busy,
}) {
  if (!open) return null;
  const trimmedReason = String(reason || "").trim();
  const disableConfirm = Boolean(busy) || (requireReason && !trimmedReason);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {message && <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>}
        </div>
        {requireReason && (
          <div className="px-4 py-3">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="assignment-action-reason">
              Reason
            </label>
            <textarea
              id="assignment-action-reason"
              value={reason}
              onChange={(event) => onReasonChange?.(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Add a concise reason for the owner and assignment record."
            />
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <ActionButton variant="secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </ActionButton>
          <ActionButton variant={destructive ? "danger" : "primary"} disabled={disableConfirm} onClick={onConfirm}>
            {busy ? "Working..." : confirmLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function RevisionRequestModal({
  open,
  instructions,
  dueAt,
  onInstructionsChange,
  onDueAtChange,
  onCancel,
  onConfirm,
  busy,
}) {
  if (!open) return null;
  const trimmedInstructions = String(instructions || "").trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-950">Request revision</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Send vendor-facing revision instructions for this submitted assignment. The prior report submission remains preserved.
          </p>
        </div>
        <div className="space-y-3 px-4 py-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="assignment-revision-instructions">
              Vendor-facing instructions
            </label>
            <textarea
              id="assignment-revision-instructions"
              value={instructions}
              onChange={(event) => onInstructionsChange?.(event.target.value)}
              rows={5}
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Describe the correction or supplemental report work needed."
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="assignment-revision-due-at">
              Revision due date
            </label>
            <input
              id="assignment-revision-due-at"
              type="datetime-local"
              value={dueAt}
              onChange={(event) => onDueAtChange?.(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Internal notes are not included in this workflow yet because vendor notifications share the revision payload.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <ActionButton variant="secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </ActionButton>
          <ActionButton disabled={Boolean(busy) || !trimmedInstructions} onClick={onConfirm}>
            {busy ? "Requesting..." : "Request Revision"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

export function AssignedOfferActions({ assignmentId, onChanged }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState("");

  async function run(action, fn) {
    setBusy(action);
    setError(null);
    try {
      await fn();
      await onChanged?.();
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setBusy("");
    }
  }

  function closeModal() {
    setModal(null);
    setReason("");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <ActionButton
          icon={CheckCircle2}
          disabled={Boolean(busy)}
          onClick={() => setModal("accept")}
        >
          Accept
        </ActionButton>
        <ActionButton
          icon={XCircle}
          variant="danger"
          disabled={Boolean(busy)}
          onClick={() => setModal("decline")}
        >
          Decline
        </ActionButton>
      </div>
      {error && <p className="text-sm text-rose-600">{error.message || "Assignment action failed."}</p>}
      <ActionModal
        open={modal === "accept"}
        title="Accept assignment"
        message="Accept this assignment for your company and make the work packet available."
        confirmLabel="Accept"
        busy={busy === "accept"}
        onCancel={closeModal}
        onConfirm={() => run("accept", () => acceptAssignment(assignmentId)).then((success) => success && closeModal())}
      />
      <ActionModal
        open={modal === "decline"}
        title="Decline assignment"
        message="Declining is a terminal response for this offer. Add a reason so the owner company has clear context."
        confirmLabel="Decline"
        destructive
        requireReason
        reason={reason}
        onReasonChange={setReason}
        busy={busy === "decline"}
        onCancel={closeModal}
        onConfirm={() => run("decline", () => declineAssignment(assignmentId, reason.trim())).then((success) => success && closeModal())}
      />
    </div>
  );
}

export function AssignedWorkActions({ assignmentId, status, onChanged }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(null);
  const [submissionNote, setSubmissionNote] = useState("");
  const [modal, setModal] = useState(null);

  async function run(action, fn) {
    setBusy(action);
    setError(null);
    try {
      await fn();
      setSubmissionNote("");
      await onChanged?.();
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setBusy("");
    }
  }

  const canStart = status === "accepted";
  const canSubmit = status === "in_progress";
  const hasActions = canStart || canSubmit;

  return (
    <div className="space-y-3">
      {!hasActions && (
        <p className="text-sm text-slate-500">No assigned-company action is currently available for this status.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {canStart && (
          <ActionButton
            icon={Play}
            disabled={Boolean(busy)}
            onClick={() => setModal("start")}
          >
            Start
          </ActionButton>
        )}
      </div>
      {canSubmit && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="assignment-submission-note">
            Submission note
          </label>
          <textarea
            id="assignment-submission-note"
            value={submissionNote}
            onChange={(event) => setSubmissionNote(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="Add a concise completion note for the owner company."
          />
          <div className="mt-2">
            <ActionButton
              icon={Send}
              disabled={Boolean(busy)}
              onClick={() =>
                run("submit", () =>
                  submitAssignment(assignmentId, {
                    note: submissionNote.trim(),
                    submitted_from: "assignment_frontend",
                  })
                )
              }
            >
              Submit
            </ActionButton>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-rose-600">{error.message || "Assignment action failed."}</p>}
      <ActionModal
        open={modal === "start"}
        title="Start assignment"
        message="Move this accepted assignment into active work for your company."
        confirmLabel="Start"
        busy={busy === "start"}
        onCancel={() => setModal(null)}
        onConfirm={() => run("start", () => startAssignment(assignmentId)).then((success) => success && setModal(null))}
      />
    </div>
  );
}

export function OwnerAssignmentActions({ assignmentId, status, onChanged }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState("");
  const [revisionInstructions, setRevisionInstructions] = useState("");
  const [revisionDueAt, setRevisionDueAt] = useState("");

  async function run(action, fn) {
    setBusy(action);
    setError(null);
    try {
      await fn();
      await onChanged?.();
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setBusy("");
    }
  }

  const canComplete = status === "submitted";
  const canRequestRevision = status === "submitted";
  const canCancel = ["offered", "accepted", "in_progress", "submitted"].includes(status);
  const canRevoke = status === "offered";
  const hasActions = canComplete || canRequestRevision || canCancel || canRevoke;

  function closeModal() {
    setModal(null);
    setReason("");
    setRevisionInstructions("");
    setRevisionDueAt("");
  }

  return (
    <div className="space-y-2">
      {!hasActions && (
        <p className="text-sm text-slate-500">No owner action is currently available for this assignment status.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {canComplete && (
          <ActionButton
            icon={CheckCircle2}
            disabled={Boolean(busy)}
            onClick={() => setModal("complete")}
          >
            Complete
          </ActionButton>
        )}
        {canRequestRevision && (
          <ActionButton
            icon={FilePenLine}
            variant="secondary"
            disabled={Boolean(busy)}
            onClick={() => setModal("revision")}
          >
            Request Revision
          </ActionButton>
        )}
        {canCancel && (
          <ActionButton
            variant="secondary"
            disabled={Boolean(busy)}
            onClick={() => setModal("cancel")}
          >
            Cancel
          </ActionButton>
        )}
        {canRevoke && (
          <ActionButton
            variant="danger"
            disabled={Boolean(busy)}
            onClick={() => setModal("revoke")}
          >
            Revoke
          </ActionButton>
        )}
      </div>
      {error && <p className="text-sm text-rose-600">{error.message || "Assignment action failed."}</p>}
      <ActionModal
        open={modal === "complete"}
        title="Complete assignment"
        message="Mark this submitted assignment complete for the owner company."
        confirmLabel="Complete"
        busy={busy === "complete"}
        onCancel={closeModal}
        onConfirm={() => run("complete", () => completeAssignment(assignmentId, "")).then((success) => success && closeModal())}
      />
      <RevisionRequestModal
        open={modal === "revision"}
        instructions={revisionInstructions}
        dueAt={revisionDueAt}
        onInstructionsChange={setRevisionInstructions}
        onDueAtChange={setRevisionDueAt}
        busy={busy === "revision"}
        onCancel={closeModal}
        onConfirm={() =>
          run("revision", () =>
            requestVendorAssignmentRevision(assignmentId, {
              revision_instructions: revisionInstructions.trim(),
              revision_due_at: revisionDueAt || null,
            })
          ).then((success) => success && closeModal())
        }
      />
      <ActionModal
        open={modal === "cancel"}
        title="Cancel assignment"
        message="Cancelling stops this assignment before completion. Add a reason so the assigned company has clear context."
        confirmLabel="Cancel assignment"
        requireReason
        reason={reason}
        onReasonChange={setReason}
        busy={busy === "cancel"}
        onCancel={closeModal}
        onConfirm={() => run("cancel", () => cancelAssignment(assignmentId, reason.trim())).then((success) => success && closeModal())}
      />
      <ActionModal
        open={modal === "revoke"}
        title="Revoke offer"
        message="Revoking withdraws this open offer before acceptance. This is a destructive assignment action."
        confirmLabel="Revoke offer"
        destructive
        requireReason
        reason={reason}
        onReasonChange={setReason}
        busy={busy === "revoke"}
        onCancel={closeModal}
        onConfirm={() => run("revoke", () => revokeAssignment(assignmentId, reason.trim())).then((success) => success && closeModal())}
      />
    </div>
  );
}
