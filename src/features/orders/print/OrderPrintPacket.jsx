import { formatPhoneForDisplay } from "@/lib/utils/phoneFormat";
import { formatOperationalDate } from "@/lib/utils/dateOnly";

const fallback = "-";

const pick = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "") ?? null;

const formatDate = (value) => {
  return formatOperationalDate(value, fallback);
};

const formatDateTime = (value) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString();
};

const statusLabel = (value) =>
  String(value || "unknown")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const money = (value) =>
  value == null
    ? fallback
    : Number(value).toLocaleString(undefined, { style: "currency", currency: "USD" });

const RETIRED_LIFECYCLE_NOTICES = Object.freeze({
  archived: {
    title: "Archived order",
    body:
      "This order was removed from active operational lists and preserved for read-only history. The archive state does not delete documents, activity, assignments, or the order number.",
  },
  cancelled: {
    title: "Cancelled order",
    body:
      "This legitimate order was stopped before completion and preserved for read-only history. Cancellation does not delete documents, activity, assignments, or the order number.",
  },
  voided: {
    title: "Voided order",
    body:
      "This order was administratively invalidated and preserved for read-only history. Voiding does not delete documents, activity, assignments, or the order number.",
  },
});

function Field({ label, value, wide = false }) {
  return (
    <div
      className={`min-w-0 border-b border-slate-100 pb-2 print:border-slate-200 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 print:text-[9px]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm leading-5 text-slate-950 print:text-[11px] print:leading-4">
        {value || fallback}
      </dd>
    </div>
  );
}

function Section({ title, children, compact = false }) {
  return (
    <section className="order-print-section break-inside-avoid rounded border border-slate-200 bg-white p-4 shadow-sm print:rounded-none print:border-x-0 print:border-b-0 print:border-t print:border-slate-300 print:p-3 print:shadow-none">
      <h2 className="border-b border-slate-100 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 print:border-slate-200 print:text-[10px]">
        {title}
      </h2>
      <dl
        className={`mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 print:mt-2 print:grid-cols-2 print:gap-x-8 print:gap-y-2 ${
          compact ? "lg:grid-cols-3 print:grid-cols-3" : ""
        }`}
      >
        {children}
      </dl>
    </section>
  );
}

function countLabel(count) {
  return `${count} ${Number(count) === 1 ? "file" : "files"}`;
}

function buildActivitySummary(order) {
  const events = [
    {
      label: "Order created",
      value: formatDateTime(order.created_at),
    },
    {
      label: "Last updated",
      value: formatDateTime(order.updated_at),
    },
  ];

  if (order.site_visit_at) {
    events.push({ label: "Site visit scheduled", value: formatDateTime(order.site_visit_at) });
  }

  if (order.completed_at) {
    events.push({ label: "Completed", value: formatDateTime(order.completed_at) });
  }

  return events;
}

function getRetiredLifecycleNotice(order) {
  if (order.is_archived) return RETIRED_LIFECYCLE_NOTICES.archived;

  const status = String(order.status || "").toLowerCase();
  if (status === "cancelled") return RETIRED_LIFECYCLE_NOTICES.cancelled;
  if (status === "voided") return RETIRED_LIFECYCLE_NOTICES.voided;

  return null;
}

export default function OrderPrintPacket({
  order,
  clientName,
  amcName,
  appraiserName,
  fileCount = null,
  documentCategoryCounts = [],
  generatedAt = new Date(),
}) {
  if (!order) return null;

  const titleNo = order.order_number || (order.id ? String(order.id).slice(0, 8) : fallback);
  const addr1 = order.address_line1 || order.address || order.property_address || "";
  const addr2 =
    [order.city, order.state].filter(Boolean).join(", ") +
    (order.postal_code || order.zip ? ` ${order.postal_code || order.zip}` : "");
  const propertyAddress = [addr1, addr2].filter(Boolean).join(", ");
  const contactName = pick(order.property_contact_name, order.entry_contact_name);
  const contactPhone = formatPhoneForDisplay(pick(order.property_contact_phone, order.entry_contact_phone));
  const reviewDue = pick(order.review_due_at);
  const finalDue = pick(order.final_due_at, order.due_date);
  const effectiveClientName = pick(clientName, order.client_name);
  const effectiveAmcName = pick(amcName, order.amc_name, order.lender_name);
  const effectiveAppraiserName = pick(appraiserName, order.appraiser_name);
  const lifecycleState = order.is_archived
    ? "Archived"
    : ["cancelled", "voided"].includes(String(order.status || "").toLowerCase())
      ? statusLabel(order.status)
      : "Active";
  const activitySummary = buildActivitySummary(order);
  const documentCount =
    fileCount != null ? countLabel(fileCount) : "File count unavailable";
  const safeDocumentCategoryCounts = Array.isArray(documentCategoryCounts)
    ? documentCategoryCounts.filter((item) => item?.label && Number(item.count) > 0)
    : [];
  const retiredLifecycleNotice = getRetiredLifecycleNotice(order);

  return (
    <article
      aria-label="Read-only print packet"
      className="order-print-packet mx-auto max-w-5xl space-y-4 bg-white text-slate-950 print:max-w-none print:space-y-0"
    >
      <header className="order-print-header break-inside-avoid rounded border border-slate-200 bg-slate-50 p-4 print:rounded-none print:border-0 print:border-b print:border-slate-300 print:bg-white print:px-0 print:pb-3 print:pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Internal Order Print Packet
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950 print:text-xl">
              Order {titleNo}
            </h1>
            <p className="mt-1 text-sm leading-5 text-slate-600 print:text-xs">
              {propertyAddress || fallback}
            </p>
          </div>
          <div className="rounded border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-500 sm:text-right print:border-0 print:p-0 print:text-[10px]">
            <div>Generated {formatDateTime(generatedAt)}</div>
            <div>Read-only internal summary</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs print:mt-2 print:text-[10px]">
          <span className="rounded border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 print:border-slate-300">
            {statusLabel(order.status)}
          </span>
          <span className="rounded border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 print:border-slate-300">
            {lifecycleState}
          </span>
          <span className="rounded border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 print:border-slate-300">
            {documentCount}
          </span>
        </div>
      </header>

      {retiredLifecycleNotice && (
        <section
          aria-label="Retired lifecycle notice"
          className="order-print-section break-inside-avoid rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 print:rounded-none print:border-x-0 print:border-amber-300 print:bg-white print:px-0 print:py-2 print:text-[11px]"
        >
          <div className="font-semibold">{retiredLifecycleNotice.title}</div>
          <p className="mt-1 leading-5 print:leading-4">{retiredLifecycleNotice.body}</p>
        </section>
      )}

      <Section title="Order Summary" compact>
        <Field label="Order Number" value={titleNo} />
        <Field label="Status" value={statusLabel(order.status)} />
        <Field label="Lifecycle" value={lifecycleState} />
        <Field label="Report Type" value={order.report_type} />
        <Field label="Property Type" value={order.property_type} />
        <Field label="Base Fee" value={money(order.base_fee)} />
      </Section>

      <Section title="Subject / Property">
        <Field label="Address" value={addr1} />
        <Field label="City / State / Postal" value={addr2} />
        <Field label="Property Contact" value={contactName} />
        <Field label="Property Contact Phone" value={contactPhone} />
        <Field label="Access Notes" value={order.access_notes} wide />
        <Field label="Special Instructions" value={order.notes} wide />
      </Section>

      <Section title="Client And Participants">
        <Field label="Client" value={effectiveClientName} />
        <Field label="AMC / Lender" value={effectiveAmcName} />
        <Field label="Appraiser" value={effectiveAppraiserName} />
        <Field label="Reviewer" value={order.reviewer_name} />
      </Section>

      <Section title="Key Dates">
        <Field label="Created" value={formatDateTime(order.created_at)} />
        <Field label="Updated" value={formatDateTime(order.updated_at)} />
        <Field label="Site Visit" value={formatDateTime(order.site_visit_at)} />
        <Field label="Review Due" value={formatDate(reviewDue)} />
        <Field label="Final Due" value={formatDate(finalDue)} />
        <Field label="Completed" value={formatDateTime(order.completed_at)} />
      </Section>

      <Section title="Status And Activity Summary">
        <Field label="Current Status" value={statusLabel(order.status)} />
        <Field label="Current Lifecycle" value={lifecycleState} />
        {activitySummary.slice(0, 4).map((event) => (
          <Field key={event.label} label={event.label} value={event.value} />
        ))}
      </Section>

      <Section title="Files Summary">
        <Field label="Available Files" value={documentCount} />
        <div className="min-w-0 border-b border-slate-100 pb-2 print:border-slate-200">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 print:text-[9px]">
            Document Categories
          </dt>
          <dd className="mt-2">
            {safeDocumentCategoryCounts.length > 0 ? (
              <ul
                aria-label="Document category counts"
                className="flex flex-wrap gap-2 text-xs text-slate-700 print:text-[10px]"
              >
                {safeDocumentCategoryCounts.map((item) => (
                  <li
                    key={item.label}
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-1 print:border-slate-300 print:bg-white"
                  >
                    <span className="font-medium text-slate-950">{item.label}</span>:{" "}
                    {countLabel(item.count)}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm leading-5 text-slate-950 print:text-[11px] print:leading-4">
                Category counts unavailable
              </span>
            )}
          </dd>
        </div>
        <Field
          label="File Handling"
          value="File downloads, signed URLs, storage paths, and document contents are not included in this packet."
        />
      </Section>

      <footer className="break-inside-avoid border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
        This packet is an internal read-only summary generated from currently authorized Order
        Detail data. It does not mutate workflow, lifecycle, assignment, document, activity, or
        notification state.
      </footer>
    </article>
  );
}
