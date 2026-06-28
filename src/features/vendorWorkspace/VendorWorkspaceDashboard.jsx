import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  WorkspaceEmptyState,
  WorkspaceSection,
  WorkspaceSummaryCard,
  WorkspaceSummaryCards,
} from "@/components/dashboard/WorkspaceDashboard";
import { PortalPageShell } from "@/components/portal";
import { fetchVendorWorkspaceDashboardSummary } from "@/features/vendorWorkspace/api.js";

const dashboardCards = Object.freeze([
  {
    key: "available_work",
    label: "Available Work / Bids",
    helper: "Open opportunities awaiting a vendor response.",
    path: "/vendor-workspace/available-work",
  },
  {
    key: "pending_bids",
    label: "Submitted Bids",
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
    label: "Assignments",
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
    <WorkspaceSummaryCards label="Loading Vendor Workspace dashboard" columns="xl:grid-cols-3">
      {dashboardCards.map((card) => (
        <article key={card.key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="h-3 w-28 rounded bg-slate-200" />
          <div className="mt-4 h-8 w-16 rounded bg-slate-200" />
          <div className="mt-4 h-3 w-full rounded bg-slate-100" />
        </article>
      ))}
    </WorkspaceSummaryCards>
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

function WorkspaceTile({ label, value, helper, path }) {
  return (
    <WorkspaceSummaryCard
      label={label}
      value={value}
      helper={helper}
      to={path}
    />
  );
}

function CalendarPreview({ actions }) {
  const datedActions = actions
    .filter((action) => action?.due_at)
    .slice(0, 3);

  return (
    <WorkspaceSection
      title="Calendar"
      subtitle="Upcoming due dates from assigned work and active responses."
      label="Calendar"
      className="p-5"
      action={(
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-500">
          Read-only
        </span>
      )}
    >
      <div className="mt-4 grid gap-2">
        {datedActions.length ? (
          datedActions.map((action, index) => (
            <div key={`${action?.label || "calendar"}-${action.due_at}-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-950">{action?.label || "Vendor task"}</div>
              <div className="mt-1 text-xs text-slate-500">{formatDueDate(action.due_at)}</div>
            </div>
          ))
        ) : (
          <WorkspaceEmptyState>No upcoming vendor calendar items are available.</WorkspaceEmptyState>
        )}
      </div>
    </WorkspaceSection>
  );
}

function RecentUploadsPreview() {
  return (
    <WorkspaceSection
      title="Recent Uploads"
      subtitle="Report and invoice upload history appears on assignment and payment detail cards."
      label="Recent Uploads"
      className="p-5"
    >
      <div className="mt-4">
        <WorkspaceEmptyState>No recent upload summary is available from the dashboard feed.</WorkspaceEmptyState>
      </div>
    </WorkspaceSection>
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
  const assignmentsCount = Number(counts.active_assigned_orders || 0);
  const availableAndBidsCount =
    Number(counts.available_work || 0) + Number(counts.pending_bids || 0);

  return (
    <PortalPageShell
      label="Vendor Workspace"
      title="Your work queue"
      description="Review available opportunities, manage active assignments, track due dates, and follow payment status from one vendor-facing workspace."
    >
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={() => setReloadKey((key) => key + 1)} />
      ) : (
        <>
          <WorkspaceSummaryCards label="Vendor workspace overview" columns="xl:grid-cols-3">
            <WorkspaceTile
              label="Assignments"
              value={formatCount(assignmentsCount)}
              helper="Accepted, in-progress, revision, and submitted work."
              path="/vendor-workspace/assigned-orders"
            />
            <WorkspaceTile
              label="Calendar"
              value={formatCount(actions.filter((action) => action?.due_at).length)}
              helper="Upcoming due dates from current vendor work."
            />
            <WorkspaceTile
              label="Recent Uploads"
              value="View"
              helper="Report and invoice files remain scoped to assignment/payment pages."
            />
            <WorkspaceTile
              label="Coverage"
              value="Profile"
              helper="Review coverage, products, contacts, and profile update requests."
              path="/vendor-workspace/profile"
            />
            <WorkspaceTile
              label="Payments"
              value={formatCount(counts.payments || 0)}
              helper="Track invoice and payment states for eligible work."
              path="/vendor-workspace/payments"
            />
            <WorkspaceTile
              label="Available Work / Bids"
              value={formatCount(availableAndBidsCount)}
              helper="Open opportunities and bids under coordinator review."
              path="/vendor-workspace/available-work"
            />
          </WorkspaceSummaryCards>

          <WorkspaceSummaryCards label="Vendor dashboard counts" columns="xl:grid-cols-3">
            {dashboardCards.map((card) => (
              <DashboardCard key={card.key} card={card} count={counts[card.key]} />
            ))}
          </WorkspaceSummaryCards>

          <div className="grid gap-3 xl:grid-cols-2">
            <CalendarPreview actions={actions} />
            <RecentUploadsPreview />
          </div>

          <WorkspaceSection
            title="Next actions"
            subtitle="Read-only summary of items that may need attention."
            label="My Next Actions"
            className="space-y-3"
          >
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
              <WorkspaceEmptyState className="rounded-lg bg-white p-5 text-slate-600 shadow-sm">
                No vendor action items need attention right now.
              </WorkspaceEmptyState>
            )}
          </WorkspaceSection>
        </>
      )}
    </PortalPageShell>
  );
}
