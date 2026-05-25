import { WorkspaceSurface } from "@/components/workspace/WorkspaceSurface";

const EMPTY_ROWS = Object.freeze([]);
const DUE_SOON_DAYS = 7;
const MAX_PRIMARY_ITEMS = 5;

const metricToneClasses = {
  urgent: "border-slate-400 bg-slate-950 text-white ring-1 ring-slate-800",
  due: "border-amber-200 bg-amber-50 text-amber-950",
  revision: "border-blue-200 bg-blue-50 text-blue-950",
  inspection: "border-emerald-200 bg-emerald-50 text-emerald-950",
  waiting: "border-slate-300 bg-slate-100 text-slate-900",
};

const sectionToneClasses = {
  priority: "border-slate-400 bg-slate-950 text-white shadow-[0_18px_42px_rgba(15,23,42,0.16)]",
  urgent: "border-slate-300 bg-white",
  due: "border-amber-200 bg-amber-50/80",
  revision: "border-blue-200 bg-blue-50/75",
  inspection: "border-emerald-200 bg-emerald-50/70",
  waiting: "border-slate-300 bg-slate-100/90",
  quiet: "border-slate-200 bg-slate-50/85",
};

const contextToneClasses = {
  attention: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-slate-200 bg-slate-50 text-slate-700",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  revision: "border-blue-200 bg-blue-50 text-blue-900",
};

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

function getFirstDate(row, keys) {
  for (const key of keys) {
    const rawDate = row?.[key];
    if (!rawDate) continue;
    const date = new Date(rawDate);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function getFirstNumber(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value == null || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function formatShortDate(date) {
  if (!date) return null;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
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

function isOverdue(row) {
  return getDuePressure(row) === "overdue";
}

function isDueSoon(row) {
  return getDuePressure(row) === "due soon";
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
  if (isOverdue(row)) return "Overdue";
  if (isDueSoon(row)) return "Due soon";
  if (isWaitingOrBlocked(row)) return "Waiting / blocked";
  if (hasSiteVisitContext(row)) return "Inspection context";
  return "Assigned work";
}

function getOperationalInputLabel(row) {
  const input = normalizeStatus(row.input_type || row.operational_input_type);
  const labels = {
    inspection_scheduled: "Operational input: inspection scheduled",
    report_on_track: "Operational input: report on track",
    waiting_on_client: "Operational input: waiting on client",
  };

  return labels[input] || null;
}

function getWaitingContext(row) {
  const context =
    row.operational_context || row.context || row.blocker || row.next_step || row.status_label;

  if (typeof context === "string" && context.trim()) return context.trim();
  if (row.access_notes && isWaitingOrBlocked(row)) return "Access notes may explain the wait.";
  if (isWaitingOrBlocked(row)) return "Waiting/blocker evidence is present on the row.";
  return null;
}

function getFileReadinessContext(row) {
  const fileCount = getFirstNumber(row, [
    "active_document_count",
    "document_count",
    "file_count",
    "files_count",
  ]);

  if (fileCount == null) return null;
  if (fileCount === 0) return "No supporting files loaded.";
  if (fileCount === 1) return "1 supporting file loaded.";
  return `${fileCount} supporting files loaded.`;
}

function getReviewContext(row) {
  const status = normalizeStatus(row.status);
  const reviewDue = getFirstDate(row, ["review_due_at", "review_due_date"]);

  if (isRevision(row)) return "Reviewer revisions are open.";
  if (status === "in_review") {
    return reviewDue ? `Review due ${formatShortDate(reviewDue)}.` : "Order is waiting in review.";
  }
  return null;
}

function getActivityContext(row) {
  const activityDate = getFirstDate(row, [
    "last_activity_at",
    "last_note_at",
    "updated_at",
    "created_at",
  ]);

  if (!activityDate) return null;
  return `Last loaded update ${formatShortDate(activityDate)}.`;
}

function getInspectionContext(row) {
  const inspectionDate = getFirstDate(row, [
    "site_visit_at",
    "site_visit_date",
    "inspection_at",
    "inspection_date",
    "appointment_at",
    "scheduled_at",
  ]);

  return inspectionDate ? `Inspection ${formatShortDate(inspectionDate)}.` : null;
}

function getOrderContextChips(row) {
  const chips = [];
  const addChip = (id, label, tone = "info") => {
    if (!label) return;
    chips.push({ id, label, tone });
  };

  addChip("review", getReviewContext(row), isRevision(row) ? "revision" : "info");
  addChip("operational-input", getOperationalInputLabel(row), "ready");
  addChip("waiting", getWaitingContext(row), "attention");
  addChip("inspection", getInspectionContext(row), "ready");
  addChip("files", getFileReadinessContext(row), "info");
  addChip("activity", getActivityContext(row), "info");

  return chips;
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
    ...rows.filter(isOverdue),
    ...rows.filter(isRevision),
    ...rows.filter(isDueSoon),
    ...rows.filter(isWaitingOrBlocked),
    ...rows.filter(hasSiteVisitContext),
    ...rows,
  ]).slice(0, MAX_PRIMARY_ITEMS);
}

function getPressureRows(rows) {
  return dedupeRows([
    ...rows.filter(isOverdue),
    ...rows.filter(isDueSoon),
    ...rows.filter(isRevision),
    ...rows.filter(hasSiteVisitContext),
    ...rows.filter(isWaitingOrBlocked),
  ]);
}

function WorkbenchMetric({ label, value, caption, tone = "waiting" }) {
  return (
    <WorkspaceSurface
      as="div"
      variant="evidence"
      className={`${metricToneClasses[tone] || metricToneClasses.waiting} p-3 shadow-sm`}
    >
      <p className="text-xs font-semibold uppercase opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-sm opacity-75">{caption}</p>
    </WorkspaceSurface>
  );
}

function OrderWorkItem({ row, compact = false, subdued = false }) {
  const orderId = getOrderId(row);
  const label = getOrderLabel(row);
  const href = orderId ? `/orders/${orderId}` : "/orders";
  const contextChips = getOrderContextChips(row).slice(0, compact ? 3 : 4);

  return (
    <article
      className={`rounded-lg border px-3 py-3 ${
        subdued ? "border-slate-200 bg-white/70" : "border-slate-200 bg-white"
      }`}
    >
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
      {contextChips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label={`${label} read-only context`}>
          {contextChips.map((chip) => (
            <span
              key={chip.id}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                contextToneClasses[chip.tone] || contextToneClasses.info
              }`}
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function WorkbenchSection({ title, count, emptyCopy, children, className = "", tone = "urgent" }) {
  return (
    <WorkspaceSurface
      variant="evidence"
      className={`${sectionToneClasses[tone] || sectionToneClasses.urgent} p-4 shadow-sm ${className}`}
      aria-label={title}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          {count > 0 ? (
            <div className="mt-3 space-y-2">{children}</div>
          ) : (
            <p className="mt-1 text-sm opacity-75">{emptyCopy}</p>
          )}
        </div>
        <span className="rounded bg-white/80 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm">
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
  const overdueRows = orderRows.filter(isOverdue);
  const dueSoonRows = orderRows.filter(isDueSoon);
  const revisionRows = orderRows.filter(isRevision);
  const siteVisitRows = orderRows.filter(hasSiteVisitContext);
  const waitingRows = orderRows.filter(isWaitingOrBlocked);
  const pressureRows = getPressureRows(orderRows);
  const lowerPriorityRows = orderRows.filter((row) => !pressureRows.includes(row)).slice(0, 4);

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
              label="Urgent Work"
              value={priorityRows.length}
              caption="Rows surfaced first from overdue and active pressure"
              tone="urgent"
            />
            <WorkbenchMetric
              label="Due Soon"
              value={dueSoonRows.length + overdueRows.length}
              caption="Rows overdue or due within seven days"
              tone="due"
            />
            <WorkbenchMetric
              label="Revisions"
              value={revisionRows.length}
              caption="Rows marked for appraiser revision follow-up"
              tone="revision"
            />
            <WorkbenchMetric
              label="Inspections"
              value={siteVisitRows.length}
              caption="Rows with site visit or schedule context"
              tone="inspection"
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
              label="Urgent Work"
              value={priorityRows.length}
              caption="Rows surfaced first from overdue and active pressure"
              tone="urgent"
            />
            <WorkbenchMetric
              label="Due Soon"
              value={dueSoonRows.length + overdueRows.length}
              caption="Rows overdue or due within seven days"
              tone="due"
            />
            <WorkbenchMetric
              label="Revisions"
              value={revisionRows.length}
              caption="Rows marked for appraiser revision follow-up"
              tone="revision"
            />
            <WorkbenchMetric
              label="Inspections"
              value={siteVisitRows.length}
              caption="Rows with site visit or schedule context"
              tone="inspection"
            />
          </div>

          <WorkbenchSection
            title="Priority Work"
            count={priorityRows.length}
            emptyCopy="No assigned order rows need priority placement from the provided data."
            tone="priority"
          >
            {priorityRows.map((row, index) => (
              <OrderWorkItem key={getOrderKey(row, index)} row={row} />
            ))}
          </WorkbenchSection>

          <div className="grid gap-3 xl:grid-cols-2">
            <WorkbenchSection
              title="Urgent / Overdue"
              count={overdueRows.length}
              emptyCopy="No overdue assigned work is represented in these rows."
              tone="urgent"
            >
              {overdueRows.map((row, index) => (
                <OrderWorkItem key={getOrderKey(row, index)} row={row} compact />
              ))}
            </WorkbenchSection>
            <WorkbenchSection
              title="Due Soon"
              count={dueSoonRows.length}
              emptyCopy="No due-soon assigned work is represented in these rows."
              tone="due"
            >
              {dueSoonRows.map((row, index) => (
                <OrderWorkItem key={getOrderKey(row, index)} row={row} compact />
              ))}
            </WorkbenchSection>
            <WorkbenchSection
              title="Revisions Required"
              count={revisionRows.length}
              emptyCopy="No revision requests are represented in these rows."
              tone="revision"
            >
              {revisionRows.map((row, index) => (
                <OrderWorkItem key={getOrderKey(row, index)} row={row} compact />
              ))}
            </WorkbenchSection>
            <WorkbenchSection
              title="Upcoming Inspections"
              count={siteVisitRows.length}
              emptyCopy="No upcoming inspection context is represented in these rows."
              tone="inspection"
            >
              {siteVisitRows.map((row, index) => (
                <OrderWorkItem key={getOrderKey(row, index)} row={row} compact />
              ))}
            </WorkbenchSection>
            <WorkbenchSection
              title="Waiting / Blocked Context"
              count={waitingRows.length}
              emptyCopy="No waiting or blocked context is represented in these rows."
              tone="waiting"
            >
              {waitingRows.map((row, index) => (
                <OrderWorkItem key={getOrderKey(row, index)} row={row} compact />
              ))}
            </WorkbenchSection>
            <WorkbenchSection
              title="Lower-Priority Work"
              count={lowerPriorityRows.length}
              emptyCopy="No lower-priority assigned work remains outside today's priority grouping."
              tone="quiet"
            >
              {lowerPriorityRows.map((row, index) => (
                <OrderWorkItem key={getOrderKey(row, index)} row={row} compact subdued />
              ))}
            </WorkbenchSection>
          </div>
        </>
      )}
    </WorkspaceSurface>
  );
}
