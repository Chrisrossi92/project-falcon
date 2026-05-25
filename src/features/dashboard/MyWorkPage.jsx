import { Link } from "react-router-dom";

import { WorkspaceSurface } from "@/components/workspace/WorkspaceSurface";
import { useDashboardSummary } from "@/lib/hooks/useDashboardSummary";
import AppraiserWorkbenchPreview from "@/features/dashboard/workbenches/AppraiserWorkbenchPreview";

function displayName(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

export default function MyWorkPage() {
  const summary = useDashboardSummary();
  const {
    role,
    isAdmin,
    isReviewer,
    isAppraiser,
    loading,
    ordersRows,
    appContext,
  } = summary;
  const canUseAppraiserWorkspace = Boolean(isAppraiser && !isAdmin && !isReviewer);
  const companyLabel = displayName(appContext?.company_name, "Current company");

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
              Staff Appraiser
            </div>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">
              My Work
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              A focused execution station for assigned appraisal work, due pressure, revisions,
              inspections, and waiting context.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[320px]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Company
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-slate-950">
                {companyLabel}
              </div>
            </div>
            <div className="rounded-xl border border-slate-900 bg-slate-950 px-3 py-2 text-white">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                Assigned Rows
              </div>
              <div className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums">
                {loading ? "-" : ordersRows?.length ?? 0}
              </div>
            </div>
          </div>
        </div>
      </WorkspaceSurface>

      <AppraiserWorkbenchPreview
        rows={ordersRows || []}
        loading={loading}
        appraiserLabel={role === "appraiser" ? "Staff Appraiser" : "Appraiser"}
      />
    </div>
  );
}
