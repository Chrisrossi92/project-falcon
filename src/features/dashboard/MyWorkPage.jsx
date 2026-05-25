import { Link, useNavigate } from "react-router-dom";

import DashboardCalendarPanel from "@/components/dashboard/DashboardCalendarPanel";
import { WorkspaceSurface } from "@/components/workspace/WorkspaceSurface";
import { useDashboardSummary } from "@/lib/hooks/useDashboardSummary";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";

function displayName(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function firstNameFromIdentity(appContext) {
  const identity = displayName(
    appContext?.display_name || appContext?.name || appContext?.full_name || appContext?.email,
    "",
  );

  if (!identity) return "";

  return identity.split(/\s+/)[0].replace(/@.*$/, "");
}

function possessiveName(name) {
  if (!name) return "My Work";
  return `${name}'s Work`;
}

export default function MyWorkPage() {
  const navigate = useNavigate();
  const summary = useDashboardSummary();
  const {
    isAdmin,
    isReviewer,
    isAppraiser,
    loading,
    ordersRows,
    appContext,
  } = summary;
  const canUseAppraiserWorkspace = Boolean(isAppraiser && !isAdmin && !isReviewer);
  const companyLabel = displayName(appContext?.company_name, "Current company");
  const appraiserWorkTitle = possessiveName(firstNameFromIdentity(appContext));

  if (!canUseAppraiserWorkspace && !loading) {
    return (
      <WorkspaceSurface
        variant="primary"
        className="space-y-4 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.07)]"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            My Work
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Staff appraiser workspace
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            This workspace is reserved for staff appraiser execution. Use Operations Dashboard or
            Orders for the current role context.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/dashboard"
            className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Open Operations Dashboard
          </Link>
          <Link
            to="/orders"
            className="inline-flex rounded-lg border border-slate-900 bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open Orders
          </Link>
        </div>
      </WorkspaceSurface>
    );
  }

  return (
    <div className="space-y-5">
      <WorkspaceSurface
        variant="primary"
        className="bg-white/95 px-4 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.07)] sm:px-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {companyLabel}
            </div>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">
              {appraiserWorkTitle}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Assigned appraisal work, due pressure, revisions, inspections, and waiting context.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[300px]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Work View
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-slate-950">
                Staff Appraiser
              </div>
            </div>
            <div className="rounded-xl border border-slate-900 bg-slate-950 px-3 py-2 text-white">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                Active Orders
              </div>
              <div className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums">
                {loading ? "-" : ordersRows?.length ?? 0}
              </div>
            </div>
          </div>
        </div>
      </WorkspaceSurface>

      <WorkspaceSurface
        variant="secondary"
        className="space-y-3 bg-white/95 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)]"
        aria-label="My Work schedule pressure"
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Schedule
          </div>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Site Visits & Due Dates
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Assigned order schedule pressure from existing My Work data.
          </p>
        </div>
        <DashboardCalendarPanel
          orders={ordersRows || []}
          role="appraiser"
          mode="appraiser"
          fixedHeader={false}
          useFallbackLoader={false}
          onOpenOrder={(orderId) => {
            if (orderId) navigate(`/orders/${orderId}`);
          }}
        />
      </WorkspaceSurface>

      <WorkspaceSurface
        variant="primary"
        className="space-y-3 bg-white/95 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)]"
        aria-label="My Work active orders"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Work Queue
            </div>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Active Orders</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Assigned orders from the established Orders worklist.
            </p>
          </div>
          <span className="mt-2 inline-flex w-fit rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 sm:mt-0">
            {loading ? "-" : ordersRows?.length ?? 0}
          </span>
        </div>
        {loading ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Loading assigned orders...
          </p>
        ) : (
          <UnifiedOrdersTable
            role="appraiser"
            rowsOverride={ordersRows || []}
            pageSize={10}
            scope="dashboard"
          />
        )}
      </WorkspaceSurface>
    </div>
  );
}
