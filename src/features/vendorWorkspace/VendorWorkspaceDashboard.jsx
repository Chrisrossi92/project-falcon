import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { fetchVendorWorkspaceDashboardSummary } from "@/features/vendorWorkspace/api.js";

const dashboardCards = Object.freeze([
  {
    key: "available_work",
    label: "Available Work",
    helper: "Open opportunities awaiting a vendor response.",
    path: "/vendor-workspace/available-work",
  },
  {
    key: "pending_bids",
    label: "Pending Bids",
    helper: "Submitted bids still under review.",
    path: "/vendor-workspace/my-bids",
  },
  {
    key: "assignment_offers",
    label: "Assignment Offers",
    helper: "Awards waiting for acceptance or decline.",
  },
  {
    key: "active_assigned_orders",
    label: "Active Assigned Orders",
    helper: "Accepted, in-progress, or revision-requested work.",
    path: "/vendor-workspace/assigned-orders",
  },
  {
    key: "submitted_awaiting_review",
    label: "Submitted / Awaiting Review",
    helper: "Reports submitted to the coordinator.",
    path: "/vendor-workspace/assigned-orders",
  },
  {
    key: "needs_attention",
    label: "Needs Attention",
    helper: "Due soon, overdue, or waiting on vendor action.",
  },
]);

const priorityLabels = Object.freeze({
  normal: "Normal",
  due_soon: "Due soon",
  overdue: "Overdue",
});

const priorityClasses = Object.freeze({
  normal: "border-slate-200 bg-slate-50 text-slate-600",
  due_soon: "border-amber-200 bg-amber-50 text-amber-700",
  overdue: "border-rose-200 bg-rose-50 text-rose-700",
});

function formatCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : "0";
}

function formatDueDate(value) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getOrderLine(order = {}) {
  return [
    order.property_address,
    order.city,
    order.state,
    order.postal_code,
  ].filter(Boolean).join(", ");
}

function LoadingState() {
  return (
    <section aria-label="Loading Vendor Workspace dashboard" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {dashboardCards.map((card) => (
        <article key={card.key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="h-3 w-28 rounded bg-slate-200" />
          <div className="mt-4 h-8 w-16 rounded bg-slate-200" />
          <div className="mt-4 h-3 w-full rounded bg-slate-100" />
        </article>
      ))}
    </section>
  );
}

function ErrorState({ onRetry }) {
  return (
    <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <div className="font-semibold">Vendor dashboard unavailable</div>
      <p className="mt-1">Dashboard summary could not be loaded.</p>
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

function ActionCard({ action }) {
  const order = action?.order || {};
  const owner = action?.owner || {};
  const priority = action?.priority || "normal";
  const priorityClass = priorityClasses[priority] || priorityClasses.normal;
  const orderLine = getOrderLine(order);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{action?.label || "Review item"}</h3>
          <p className="mt-1 text-xs text-slate-500">{owner.company_name || "AMC coordinator"}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${priorityClass}`}>
          {priorityLabels[priority] || priorityLabels.normal}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-slate-500">Order</dt>
          <dd className="mt-1 text-slate-900">{order.order_number || "Order pending"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Due</dt>
          <dd className="mt-1 text-slate-900">{formatDueDate(action?.due_at)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-semibold text-slate-500">Property</dt>
          <dd className="mt-1 text-slate-900">{orderLine || "Property details pending"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Product</dt>
          <dd className="mt-1 text-slate-900">{order.report_type || "Report type pending"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Property Type</dt>
          <dd className="mt-1 text-slate-900">{order.property_type || "Property type pending"}</dd>
        </div>
      </dl>
    </article>
  );
}

function DashboardCard({ card, count }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">{card.label}</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">{card.helper}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-500">
          {card.path ? "Open" : "Read-only"}
        </span>
      </div>
      <div className="mt-5 text-3xl font-semibold text-slate-950">
        {formatCount(count)}
      </div>
    </>
  );

  if (card.path) {
    return (
      <Link
        to={card.path}
        className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {content}
    </article>
  );
}

export default function VendorWorkspaceDashboard() {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      setIsLoading(true);
      setError(null);

      try {
        const nextSummary = await fetchVendorWorkspaceDashboardSummary();
        if (isMounted) setSummary(nextSummary);
      } catch (nextError) {
        if (isMounted) setError(nextError);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const counts = summary?.counts || {};
  const actions = Array.isArray(summary?.actions) ? summary.actions : [];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Authenticated vendor access
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Vendor Workspace</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Manage available work, bids, assignments, documents, and profile details.
        </p>
      </section>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={() => setReloadKey((key) => key + 1)} />
      ) : (
        <>
          <section aria-label="Vendor dashboard counts" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboardCards.map((card) => (
              <DashboardCard key={card.key} card={card} count={counts[card.key]} />
            ))}
          </section>

          <section className="space-y-3" aria-label="My Next Actions">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">My Next Actions</h2>
              <p className="mt-1 text-sm text-slate-500">Read-only summary. Action pages are coming later.</p>
            </div>

            {actions.length > 0 ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {actions.map((action, index) => (
                  <ActionCard
                    key={`${action?.kind || "action"}-${action?.label || "item"}-${action?.due_at || index}`}
                    action={action}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
                No vendor action items need attention right now.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
