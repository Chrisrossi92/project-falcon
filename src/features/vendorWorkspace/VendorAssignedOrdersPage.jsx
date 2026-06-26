import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchVendorWorkspaceAssignedOrders } from "@/features/vendorWorkspace/api.js";

const statusLabels = Object.freeze({
  accepted_not_started: "Accepted",
  in_progress: "In Progress",
  inspection_scheduled: "In Progress",
  report_submitted: "Submitted / Awaiting Review",
  awaiting_review: "Submitted / Awaiting Review",
  revision_requested: "Revision Requested",
  resubmitted_awaiting_review: "Resubmitted / Awaiting Review",
  completed_closed: "Completed",
});

const statusClasses = Object.freeze({
  accepted_not_started: "border-amber-200 bg-amber-50 text-amber-700",
  in_progress: "border-sky-200 bg-sky-50 text-sky-700",
  inspection_scheduled: "border-indigo-200 bg-indigo-50 text-indigo-700",
  report_submitted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  awaiting_review: "border-slate-200 bg-slate-50 text-slate-600",
  revision_requested: "border-rose-200 bg-rose-50 text-rose-700",
  resubmitted_awaiting_review: "border-violet-200 bg-violet-50 text-violet-700",
  completed_closed: "border-slate-200 bg-slate-100 text-slate-700",
});

function formatDate(value) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getMarket(order = {}) {
  return [order.city, order.state, order.postal_code].filter(Boolean).join(", ");
}

function isDueSoon(item) {
  if (!item?.due_at) return false;
  if (["completed_closed", "report_submitted", "awaiting_review", "resubmitted_awaiting_review"].includes(item.assignment_status)) {
    return false;
  }

  const dueAt = new Date(item.due_at);
  if (Number.isNaN(dueAt.getTime())) return false;

  const now = Date.now();
  const dueSoonAt = now + 72 * 60 * 60 * 1000;
  return dueAt.getTime() <= dueSoonAt;
}

function LoadingState() {
  return (
    <section aria-label="Loading assigned orders" className="grid gap-3 lg:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <article key={item} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-3 w-28 rounded bg-slate-200" />
          <div className="mt-4 h-5 w-56 rounded bg-slate-200" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
          </div>
        </article>
      ))}
    </section>
  );
}

function ErrorState({ onRetry }) {
  return (
    <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <div className="font-semibold">Assigned orders unavailable</div>
      <p className="mt-1">Assigned orders could not be loaded.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800"
      >
        Retry
      </button>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      <div className="font-semibold text-slate-950">No assignments yet.</div>
      <p className="mt-1">
        Accepted vendor assignments will appear here when AMC coordinators award work to your
        company.
      </p>
    </section>
  );
}

function SummaryCard({ label, value }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
    </article>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{value || "Not specified"}</dd>
    </div>
  );
}

function AssignedOrderCard({ item }) {
  const order = item?.order || {};
  const owner = item?.owner || {};
  const status = item?.assignment_status || "accepted_not_started";
  const statusLabel = statusLabels[status] || item?.status_label || "Assigned";
  const statusClass = statusClasses[status] || statusClasses.accepted_not_started;
  const market = getMarket(order);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {owner.company_name || "AMC coordinator"}
          </p>
          <h2 className="mt-2 text-base font-semibold text-slate-950">
            {order.property_address || "Property details pending"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{market || order.county || "Market pending"}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
        <DetailRow label="Order" value={order.order_number || "Order pending"} />
        <DetailRow label="Report Type" value={order.report_type || "Report type pending"} />
        <DetailRow label="Property Type" value={order.property_type || "Property type pending"} />
        <DetailRow label="Accepted" value={formatDate(item?.accepted_at)} />
        <DetailRow label="Due" value={formatDate(item?.due_at)} />
        <DetailRow label="Inspection / Appointment" value={item?.inspection_status} />
        <DetailRow
          label="Report State"
          value={
            item?.assignment_status === "resubmitted_awaiting_review"
              ? "Resubmitted / Awaiting Review"
              : item?.report_submitted
                ? "Submitted / Awaiting Review"
                : "Not submitted"
          }
        />
        <DetailRow label="Next Action" value={item?.next_action_label || "Review assignment"} />
      </dl>

      {item?.needs_attention ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
          Needs attention
        </div>
      ) : null}

      <div className="mt-5">
        {item?.assignment_work_key ? (
          <Link
            to={`/vendor-workspace/assigned-orders/${encodeURIComponent(item.assignment_work_key)}`}
            className="inline-flex rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
          >
            View Assignment
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500"
          >
            Assignment unavailable
          </button>
        )}
      </div>
    </article>
  );
}

export default function VendorAssignedOrdersPage() {
  const [assignedOrders, setAssignedOrders] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadAssignedOrders() {
      setIsLoading(true);
      setError(null);

      try {
        const nextAssignedOrders = await fetchVendorWorkspaceAssignedOrders();
        if (isMounted) setAssignedOrders(nextAssignedOrders);
      } catch (nextError) {
        if (isMounted) setError(nextError);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAssignedOrders();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const items = useMemo(
    () => (Array.isArray(assignedOrders?.items) ? assignedOrders.items : []),
    [assignedOrders?.items],
  );

  const counts = useMemo(() => ({
    active: items.filter((item) =>
      ["accepted_not_started", "in_progress", "inspection_scheduled", "revision_requested"].includes(
        item?.assignment_status,
      ),
    ).length,
    dueSoon: items.filter(isDueSoon).length,
    needsAttention: items.filter((item) => item?.needs_attention === true).length,
    submitted: items.filter((item) =>
      ["report_submitted", "awaiting_review", "resubmitted_awaiting_review"].includes(item?.assignment_status),
    ).length,
  }), [items]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Vendor Workspace
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Assignments</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Track active assignments, due dates, revision requests, submitted reports, and the next
          step for your company.
        </p>
      </section>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={() => setReloadKey((key) => key + 1)} />
      ) : (
        <>
          <section aria-label="Assigned orders summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Active Assignments" value={counts.active} />
            <SummaryCard label="Due Soon" value={counts.dueSoon} />
            <SummaryCard label="Revision Requested" value={items.filter((item) => item?.assignment_status === "revision_requested").length} />
            <SummaryCard label="Submitted / Awaiting Review" value={counts.submitted} />
          </section>

          {items.length > 0 ? (
            <section aria-label="Assigned orders list" className="grid gap-3 lg:grid-cols-2">
              {items.map((item, index) => (
                <AssignedOrderCard key={item?.assignment_work_key || index} item={item} />
              ))}
            </section>
          ) : (
            <EmptyState />
          )}
        </>
      )}
    </div>
  );
}
