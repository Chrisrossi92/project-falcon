const EMPTY_ROWS = Object.freeze([]);
const DUE_SOON_DAYS = 7;

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function normalizeRows(rows) {
  return Array.isArray(rows) ? rows : EMPTY_ROWS;
}

function getDateValue(row) {
  return row.final_due_date || row.due_date || row.due_at || row.report_due_at || null;
}

function isDueSoon(row) {
  const rawDate = getDateValue(row);
  if (!rawDate) return false;

  const dueDate = new Date(rawDate);
  if (Number.isNaN(dueDate.getTime())) return false;

  const now = new Date();
  const dueSoon = new Date(now);
  dueSoon.setDate(now.getDate() + DUE_SOON_DAYS);

  return dueDate <= dueSoon;
}

function hasSiteVisitContext(row) {
  return Boolean(
    row.site_visit_at ||
      row.site_visit_date ||
      row.inspection_at ||
      row.inspection_date ||
      row.appointment_at ||
      row.scheduled_at,
  );
}

function countRows(rows, predicate) {
  return rows.filter(predicate).length;
}

function WorkbenchMetric({ label, value, caption }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{caption}</p>
    </div>
  );
}

function WorkbenchSection({ title, count, emptyCopy, children }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4" aria-label={title}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{count > 0 ? children : emptyCopy}</p>
        </div>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {count}
        </span>
      </div>
    </section>
  );
}

export default function AppraiserWorkbenchPreview({
  rows = EMPTY_ROWS,
  loading = false,
  appraiserLabel = "Appraiser",
} = {}) {
  const orderRows = normalizeRows(rows);
  const revisionCount = countRows(orderRows, (row) => {
    const status = normalizeStatus(row.status);
    return status === "needs_revisions" || status === "revision_requested";
  });
  const dueSoonCount = countRows(orderRows, isDueSoon);
  const siteVisitCount = countRows(orderRows, hasSiteVisitContext);

  return (
    <section className="space-y-4" aria-label="My Work preview">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase text-slate-500">{appraiserLabel}</p>
        <h2 className="text-2xl font-semibold text-slate-950">My Work</h2>
        <p className="max-w-3xl text-sm text-slate-600">
          Review assigned orders, revision requests, due dates, site visit context, files, notes,
          and submit/resubmit readiness from provided order rows.
        </p>
      </header>

      {loading ? (
        <p className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Loading assigned work preview...
        </p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <WorkbenchMetric
              label="Assigned Work"
              value={orderRows.length}
              caption="Provided assigned order rows"
            />
            <WorkbenchMetric
              label="Needs Revisions"
              value={revisionCount}
              caption="Rows currently marked for revision follow-up"
            />
            <WorkbenchMetric
              label="Due Soon"
              value={dueSoonCount}
              caption="Rows due within the next seven days or already overdue"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <WorkbenchSection
              title="Assigned Work"
              count={orderRows.length}
              emptyCopy="No assigned work rows were provided."
            >
              Assigned order rows are available for future My Work presentation.
            </WorkbenchSection>
            <WorkbenchSection
              title="Needs Revisions"
              count={revisionCount}
              emptyCopy="No revision requests are represented in these rows."
            >
              Revision follow-up can be derived from provided order status values.
            </WorkbenchSection>
            <WorkbenchSection
              title="Due Soon"
              count={dueSoonCount}
              emptyCopy="No due-soon assigned work is represented in these rows."
            >
              Due pressure is derived from existing order due date fields.
            </WorkbenchSection>
            <WorkbenchSection
              title="Site Visit / Calendar Context"
              count={siteVisitCount}
              emptyCopy="No site visit context is represented in these rows."
            >
              Site visit context is present in the provided order rows.
            </WorkbenchSection>
            <WorkbenchSection
              title="Recent Notes / Files"
              count={0}
              emptyCopy="Files and notes remain order-scoped and are not loaded in this passive preview."
            >
              Files and notes remain order-scoped and are not loaded in this passive preview.
            </WorkbenchSection>
          </div>
        </>
      )}
    </section>
  );
}
