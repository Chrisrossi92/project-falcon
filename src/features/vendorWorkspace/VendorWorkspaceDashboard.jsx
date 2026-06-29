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

const pipelineStages = Object.freeze([
  {
    key: "assignment_offers",
    label: "Offers",
    helper: "Awards waiting for acceptance or decline.",
  },
  {
    key: "available_work",
    label: "Available",
    helper: "Open opportunities awaiting a vendor response.",
    path: "/vendor-workspace/available-work",
  },
  {
    key: "pending_bids",
    label: "Submitted",
    helper: "Submitted bids still under review.",
    path: "/vendor-workspace/my-bids",
  },
  {
    key: "active_assigned_orders",
    label: "Assignments",
    helper: "Accepted, in-progress, or revision-requested work.",
    path: "/vendor-workspace/assigned-orders",
  },
  {
    key: "needs_attention",
    label: "Due / Revisions",
    helper: "Due soon, overdue, or waiting on vendor action.",
  },
  {
    key: "submitted_awaiting_review",
    label: "Submitted Reports",
    helper: "Reports submitted to the coordinator.",
    path: "/vendor-workspace/assigned-orders",
  },
]);

const loadingCards = Object.freeze([
  "available_work",
  "active_assigned_orders",
  "assignment_offers",
  "needs_attention",
  "pending_bids",
  "submitted_awaiting_review",
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

function formatAgendaDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Scheduled";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const dayDelta = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (dayDelta === 0) return "Today";
  if (dayDelta === 1) return "Tomorrow";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatAgendaTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
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

function getAgendaItems(actions) {
  return actions
    .filter((action) => action?.due_at)
    .map((action, index) => ({
      action,
      date: new Date(action.due_at),
      key: `${action?.kind || "schedule"}-${action?.label || "item"}-${action.due_at}-${index}`,
    }))
    .filter((item) => !Number.isNaN(item.date.getTime()))
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .slice(0, 5);
}

function LoadingState() {
  return (
    <WorkspaceSummaryCards label="Loading Vendor Workspace dashboard" columns="xl:grid-cols-3">
      {loadingCards.map((cardKey) => (
        <article key={cardKey} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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

function PipelineStage({ stage, count }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">{stage.label}</h3>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          {stage.path ? "Open" : "Status"}
        </span>
      </div>
      <div className="mt-4 text-3xl font-semibold text-slate-950">
        {formatCount(count)}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{stage.helper}</p>
    </>
  );

  if (stage.path) {
    return (
      <Link
        to={stage.path}
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

function PipelineOverview({ counts }) {
  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      aria-labelledby="vendor-pipeline-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="vendor-pipeline-heading" className="text-base font-semibold text-slate-950">
            Your Pipeline
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            A compact view of where vendor work currently sits.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-500">
          Live summary
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {pipelineStages.map((stage) => (
          <PipelineStage key={stage.key} stage={stage} count={counts[stage.key]} />
        ))}
      </div>
    </section>
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
  const agendaItems = getAgendaItems(actions);

  return (
    <WorkspaceSection
      title="Upcoming Schedule"
      subtitle="A compact agenda for appointments, due dates, and assignment milestones already visible to this workspace."
      label="Calendar"
      className="p-4"
      action={(
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-500">
          Agenda
        </span>
      )}
    >
      <div className="mt-4">
        {agendaItems.length ? (
          <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {agendaItems.map(({ action, key }) => {
              const order = action?.order || {};
              const orderLine = getOrderLine(order);
              return (
                <li key={key} className="grid gap-3 p-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {formatAgendaDate(action.due_at)}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-950">
                      {formatAgendaTime(action.due_at)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-950">
                      {action?.label || "Vendor task"}
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-600">
                      {orderLine || order.order_number || "Assignment details pending"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {action?.priority ? priorityLabels[action.priority] || action.priority : "Scheduled"}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <WorkspaceEmptyState>No upcoming appointments or due dates.</WorkspaceEmptyState>
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
          <WorkspaceSection
            title="Primary Work"
            subtitle="Pipeline position and next actions shape today's queue."
            label="Vendor workspace overview"
            className="p-5"
          >
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.8fr)]">
              <PipelineOverview counts={counts} />

              <WorkspaceSection
                title="Next actions"
                subtitle="Read-only summary of items that may need attention."
                label="My Next Actions"
                className="space-y-3 bg-slate-50/80"
              >
                {actions.length > 0 ? (
                  <div className="grid gap-3">
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
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            title="Scheduling Awareness"
            subtitle="Compact schedule space for upcoming appointments and due dates."
            label="Scheduling Awareness"
            className="p-5"
          >
            <div className="mt-4">
              <CalendarPreview actions={actions} />
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            title="Business Management"
            subtitle="Administrative tools stay available without competing with today's work queue."
            label="Business Management"
            className="p-5"
          >
            <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <WorkspaceSummaryCards label="Business management cards" columns="xl:grid-cols-2">
                <WorkspaceTile
                  label="Payments"
                  value={formatCount(counts.payments || 0)}
                  helper="Track invoice and payment states for eligible work."
                  path="/vendor-workspace/payments"
                />
                <WorkspaceTile
                  label="Coverage"
                  value="Profile"
                  helper="Review coverage, products, contacts, and profile update requests."
                  path="/vendor-workspace/profile"
                />
                <WorkspaceTile
                  label="Recent Uploads"
                  value="View"
                  helper="Report and invoice files remain scoped to assignment/payment pages."
                />
              </WorkspaceSummaryCards>

              <div className="grid gap-3">
                <RecentUploadsPreview />
              </div>
            </div>
          </WorkspaceSection>
        </>
      )}
    </PortalPageShell>
  );
}
