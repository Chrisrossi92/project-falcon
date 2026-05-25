import { WorkspaceSurface } from "@/components/workspace/WorkspaceSurface";

const EMPTY_ROWS = Object.freeze([]);
const DUE_SOON_DAYS = 7;
const MAX_PRIMARY_ITEMS = 4;

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function normalizeRows(rows) {
  return Array.isArray(rows) ? rows : EMPTY_ROWS;
}

function getDateValue(row) {
  return row.final_due_date || row.due_date || row.due_at || row.report_due_at || null;
}

function getDueDate(row) {
  const rawDate = getDateValue(row);
  if (!rawDate) return null;

  const dueDate = new Date(rawDate);
  return Number.isNaN(dueDate.getTime()) ? null : dueDate;
}

function getDuePressure(row) {
  const dueDate = getDueDate(row);
  if (!dueDate) return "none";

  const now = new Date();
  const dueSoon = new Date(now);
  dueSoon.setDate(now.getDate() + DUE_SOON_DAYS);

  if (dueDate < now) return "overdue";
  if (dueDate <= dueSoon) return "due soon";
  return "none";
}

function isDueSoonOrOverdue(row) {
  return getDuePressure(row) !== "none";
}

function isRevision(row) {
  const status = normalizeStatus(row.status);
  return status === "needs_revisions" || status === "revision_requested";
}

function isWaitingOrBlocked(row) {
  const status = normalizeStatus(row.status);
  const operationalInput = normalizeStatus(row.input_type || row.operational_input_type);
  const context = normalizeStatus(
    row.operational_context || row.context || row.blocker || row.next_step || row.status_label,
  );

  return (
    status.includes("waiting") ||
    status.includes("blocked") ||
    status.includes("hold") ||
    operationalInput === "waiting_on_client" ||
    context.includes("waiting") ||
    context.includes("blocked")
  );
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

function getOrderId(row) {
  return row.id || row.order_id || row.orderId || null;
}

function getOrderKey(row, index) {
  return getOrderId(row) || `${getOrderLabel(row)}-${index}`;
}

function getOrderLabel(row) {
  return (
    row.order_number ||
    row.orderNumber ||
    row.file_number ||
    row.fileNumber ||
    row.address ||
    row.property_address ||
    getOrderId(row) ||
    "Assigned order"
  );
}

function getOrderMeta(row) {
  const client = row.client_name || row.clientName || row.borrower_name || row.borrowerName;
  const address = row.address || row.property_address || row.propertyAddress;

  if (client && address) return `${client} / ${address}`;
  return client || address || "Order detail context";
}

function formatDueDate(row) {
  const dueDate = getDueDate(row);
  if (!dueDate) return "No due date";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(dueDate);
}

function getWorkReason(row) {
  if (isRevision(row)) return "Revision follow-up";
  if (getDuePressure(row) === "overdue") return "Overdue";
  if (getDuePressure(row) === "due soon") return "Due soon";
  if (isWaitingOrBlocked(row)) return "Waiting / blocked";
  if (hasSiteVisitContext(row)) return "Inspection context";
  return "Assigned work";
}

function dedupeRows(rows) {
  const seen = new Set();

  return rows.filter((row, index) => {
    const key = getOrderId(row) || `${getOrderLabel(row)}-${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getPriorityRows(rows) {
  return dedupeRows([
    ...rows.filter(isRevision),
    ...rows.filter((row) => getDuePressure(row) === "overdue"),
    ...rows.filter((row) => getDuePressure(row) === "due soon"),
    ...rows.filter(isWaitingOrBlocked),
    ...rows.filter(hasSiteVisitContext),
    ...rows,
  ]).slice(0, MAX_PRIMARY_ITEMS);
}

function WorkbenchMetric({ label, value, caption }) {
  return (
    <WorkspaceSurface as="div" variant="evidence" className="bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{caption}</p>
    </WorkspaceSurface>
  );
}

function OrderWorkItem({ row, compact = false }) {
  const orderId = getOrderId(row);
  const label = getOrderLabel(row);
  const href = orderId ? `/orders/${orderId}` : "/orders";

  return (
    <article className="rounded-lg border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={href}
            className="text-sm font-semibold text-slate-950 underline-offset-4 hover:text-blue-700 hover:underline"
          >
            {label}
          </a>
          <p className="mt-1 truncate text-sm text-slate-600">{getOrderMeta(row)}</p>
        </div>
        <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {getWorkReason(row)}
        </span>
      </div>
      {!compact && (
        <p className="mt-2 text-xs font-semibold uppercase text-slate-500">
          Due {formatDueDate(row)}
        </p>
      )}
    </article>
  );
}

function WorkbenchSection({ title, count, emptyCopy, children, className = "" }) {
  return (
    <WorkspaceSurface
      variant="evidence"
      className={`bg-white p-4 shadow-sm ${className}`}
      aria-label={title}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {count > 0 ? (
            <div className="mt-3 space-y-2">{children}</div>
          ) : (
            <p className="mt-1 text-sm text-slate-600">{emptyCopy}</p>
          )}
        </div>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {count}
        </span>
      </div>
    </WorkspaceSurface>
  );
}

export default function AppraiserWorkbenchPreview({
  rows = EMPTY_ROWS,
  loading = false,
  appraiserLabel = "Appraiser",
  compact = false,
} = {}) {
  const orderRows = normalizeRows(rows);
  const priorityRows = getPriorityRows(orderRows);
  const revisionRows = orderRows.filter(isRevision);
  const dueSoonRows = orderRows.filter(isDueSoonOrOverdue);
  const siteVisitRows = orderRows.filter(hasSiteVisitContext);
  const waitingRows = orderRows.filter(isWaitingOrBlocked);
  const lowerPriorityRows = orderRows.filter((row) => !priorityRows.includes(row)).slice(0, 3);

  if (compact) {
    return (
      <WorkspaceSurface variant="secondary" className="space-y-4 p-4" aria-label="My Work summary">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-slate-500">{appraiserLabel}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">My Work</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Open the dedicated appraiser workspace for priority work, due pressure, revisions,
              inspections, and waiting context from the current assigned rows.
            </p>
          </div>
          <a
            href="/my-work"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-900 bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open My Work
          </a>
        </header>

        {loading ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Loading assigned work summary...
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <WorkbenchMetric
              label="Priority Work"
              value={priorityRows.length}
              caption="Rows surfaced first from today's pressure"
            />
            <WorkbenchMetric
              label="Due / Overdue"
              value={dueSoonRows.length}
              caption="Rows due within seven days or already overdue"
            />
            <WorkbenchMetric
              label="Revisions"
              value={revisionRows.length}
              caption="Rows marked for appraiser revision follow-up"
            />
            <WorkbenchMetric
              label="Inspections"
              value={siteVisitRows.length}
              caption="Rows with site visit or schedule context"
            />
          </div>
        )}
      </WorkspaceSurface>
    );
  }

  return (
    <WorkspaceSurface variant="secondary" className="space-y-5 p-4" aria-label="My Work preview">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase text-slate-500">{appraiserLabel}</p>
        <h2 className="text-2xl font-semibold text-slate-950">My Work</h2>
        <p className="max-w-3xl text-sm text-slate-600">
          Start with the assigned orders that need attention today: revisions, due pressure,
          inspection context, and waiting or blocked work derived from the current order rows.
        </p>
      </header>

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Loading assigned work preview...
        </p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <WorkbenchMetric
              label="Priority Work"
              value={priorityRows.length}
              caption="Rows surfaced first from today's pressure"
            />
            <WorkbenchMetric
              label="Due / Overdue"
              value={dueSoonRows.length}
              caption="Rows due within seven days or already overdue"
            />
            <WorkbenchMetric
              label="Revisions"
              value={revisionRows.length}
              caption="Rows marked for appraiser revision follow-up"
            />
            <WorkbenchMetric
              label="Inspections"
              value={siteVisitRows.length}
              caption="Rows with site visit or schedule context"
            />
          </div>

          <WorkbenchSection
            title="Priority Work"
            count={priorityRows.length}
            emptyCopy="No assigned order rows need priority placement from the provided data."
            className="border-slate-300"
          >
            {priorityRows.map((row, index) => (
              <OrderWorkItem key={getOrderKey(row, index)} row={row} />
            ))}
          </WorkbenchSection>

          <div className="grid gap-3 xl:grid-cols-2">
            <WorkbenchSection
              title="Due Soon / Overdue"
              count={dueSoonRows.length}
              emptyCopy="No due-soon or overdue assigned work is represented in these rows."
            >
              {dueSoonRows.map((row, index) => (
                <OrderWorkItem key={getOrderKey(row, index)} row={row} compact />
              ))}
            </WorkbenchSection>
            <WorkbenchSection
              title="Revisions Required"
              count={revisionRows.length}
              emptyCopy="No revision requests are represented in these rows."
            >
              {revisionRows.map((row, index) => (
                <OrderWorkItem key={getOrderKey(row, index)} row={row} compact />
              ))}
            </WorkbenchSection>
            <WorkbenchSection
              title="Upcoming Inspections"
              count={siteVisitRows.length}
              emptyCopy="No upcoming inspection context is represented in these rows."
            >
              {siteVisitRows.map((row, index) => (
                <OrderWorkItem key={getOrderKey(row, index)} row={row} compact />
              ))}
            </WorkbenchSection>
            <WorkbenchSection
              title="Waiting / Blocked Context"
              count={waitingRows.length}
              emptyCopy="No waiting or blocked context is represented in these rows."
            >
              {waitingRows.map((row, index) => (
                <OrderWorkItem key={getOrderKey(row, index)} row={row} compact />
              ))}
            </WorkbenchSection>
            <WorkbenchSection
              title="Lower-Priority Work"
              count={lowerPriorityRows.length}
              emptyCopy="No lower-priority assigned work remains outside today's priority grouping."
            >
              {lowerPriorityRows.map((row, index) => (
                <OrderWorkItem key={getOrderKey(row, index)} row={row} compact />
              ))}
            </WorkbenchSection>
          </div>
        </>
      )}
    </WorkspaceSurface>
  );
}
