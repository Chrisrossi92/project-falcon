import { WorkspaceSurface } from "@/components/workspace/WorkspaceSurface";

const EMPTY_ROWS = Object.freeze([]);
const DUE_SOON_DAYS = 7;

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function normalizeRows(rows) {
  return Array.isArray(rows) ? rows : EMPTY_ROWS;
}

function getReviewDueDate(row) {
  return row.review_due_at || row.review_due_date || row.final_due_date || row.due_date || null;
}

function isDueSoon(row) {
  const rawDate = getReviewDueDate(row);
  if (!rawDate) return false;

  const dueDate = new Date(rawDate);
  if (Number.isNaN(dueDate.getTime())) return false;

  const now = new Date();
  const dueSoon = new Date(now);
  dueSoon.setDate(now.getDate() + DUE_SOON_DAYS);

  return dueDate <= dueSoon;
}

function hasRevisionLoop(row) {
  const status = normalizeStatus(row.status);
  const revisionCount = Number(row.revision_count || row.revision_loop_count || 0);

  return revisionCount > 0 || status === "needs_revisions" || status === "revision_requested";
}

function countRows(rows, predicate) {
  return rows.filter(predicate).length;
}

function WorkbenchMetric({ label, value, caption }) {
  return (
    <WorkspaceSurface as="div" variant="evidence" className="bg-white p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{caption}</p>
    </WorkspaceSurface>
  );
}

function WorkbenchSection({ title, count, emptyCopy, children }) {
  return (
    <WorkspaceSurface variant="evidence" className="bg-white p-4" aria-label={title}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{count > 0 ? children : emptyCopy}</p>
        </div>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {count}
        </span>
      </div>
    </WorkspaceSurface>
  );
}

export default function ReviewerWorkbenchPreview({
  rows = EMPTY_ROWS,
  loading = false,
  reviewerLabel = "Reviewer",
} = {}) {
  const orderRows = normalizeRows(rows);
  const inReviewCount = countRows(orderRows, (row) => {
    const status = normalizeStatus(row.status);
    return status === "in_review" || status === "pending_final_approval";
  });
  const resubmittedCount = countRows(orderRows, (row) => {
    const status = normalizeStatus(row.status);
    return Boolean(row.resubmitted || status === "resubmitted" || status === "submitted_to_review");
  });
  const duePressureCount = countRows(orderRows, isDueSoon);
  const revisionFollowUpCount = countRows(orderRows, hasRevisionLoop);

  return (
    <WorkspaceSurface
      variant="secondary"
      className="space-y-4 p-4"
      aria-label="Review Queue preview"
    >
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase text-slate-500">{reviewerLabel}</p>
        <h2 className="text-2xl font-semibold text-slate-950">Review Queue</h2>
        <p className="max-w-3xl text-sm text-slate-600">
          Review submitted work, resubmissions, revision loops, due pressure, report/file context,
          and review-note readiness from provided order rows.
        </p>
      </header>

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Loading review queue preview...
        </p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <WorkbenchMetric
              label="In Review"
              value={inReviewCount}
              caption="Rows currently represented as review work"
            />
            <WorkbenchMetric
              label="Resubmitted Work"
              value={resubmittedCount}
              caption="Rows marked as resubmitted or submitted to review"
            />
            <WorkbenchMetric
              label="Due Soon / Overdue Review"
              value={duePressureCount}
              caption="Rows due within the next seven days or already overdue"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <WorkbenchSection
              title="In Review"
              count={inReviewCount}
              emptyCopy="No review rows were provided."
            >
              Review queue rows are available for future review workbench presentation.
            </WorkbenchSection>
            <WorkbenchSection
              title="Resubmitted Work"
              count={resubmittedCount}
              emptyCopy="No resubmitted work is represented in these rows."
            >
              Resubmitted work can be derived from provided row flags or status values.
            </WorkbenchSection>
            <WorkbenchSection
              title="Due Soon / Overdue Review"
              count={duePressureCount}
              emptyCopy="No due-soon or overdue review work is represented in these rows."
            >
              Review due pressure is derived from existing order due date fields.
            </WorkbenchSection>
            <WorkbenchSection
              title="Revision Follow-Up"
              count={revisionFollowUpCount}
              emptyCopy="No revision loops are represented in these rows."
            >
              Revision follow-up is represented by revision counts or status values.
            </WorkbenchSection>
            <WorkbenchSection
              title="Review Notes / Files"
              count={0}
              emptyCopy="Review notes and files remain order-scoped and are not loaded in this passive preview."
            >
              Review notes and files remain order-scoped and are not loaded in this passive preview.
            </WorkbenchSection>
          </div>
        </>
      )}
    </WorkspaceSurface>
  );
}
