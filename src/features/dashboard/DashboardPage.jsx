// src/features/dashboard/DashboardPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useDashboardSummary } from "@/lib/hooks/useDashboardSummary";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import DashboardCalendarPanel from "@/components/dashboard/DashboardCalendarPanel";
import Card from "@/components/ui/Card";
import useSession from "@/lib/hooks/useSession";
import useOrderEvents from "@/lib/hooks/useOrderEvents";
import useRole from "@/lib/hooks/useRole";
import { useMemo, useState } from "react";

const DASHBOARD_CONFIG = {
  owner:     { showOrdersTable: true, showReviewQueue: false },
  admin:     { showOrdersTable: true, showReviewQueue: false },
  appraiser: { showOrdersTable: true, showReviewQueue: false },
  client:    { showOrdersTable: true, showReviewQueue: false },
  reviewer:  { showOrdersTable: true, showReviewQueue: false }, // show reviewer queue in orders table
};

export default function DashboardPage() {
  const nav = useNavigate();
  const roleHook = useRole() || {};
  const summary = useDashboardSummary();
  const { session } = useSession() || {};
  const {
    role: summaryRole,
    isAdmin: summaryIsAdmin,
    isReviewer: summaryIsReviewer,
    loading: summaryLoading,
    tableFilters,
    ordersRows,
    user,
  } = summary;
  const normalizedRole = roleHook.role || summaryRole || "appraiser";
  const isAdmin = roleHook.isAdmin ?? summaryIsAdmin;
  const isReviewer = roleHook.isReviewer ?? summaryIsReviewer;
  const loading = summaryLoading || roleHook.loading;
  const reviewerId = isReviewer ? roleHook.userId || user?.id || null : null;

  const cfg = DASHBOARD_CONFIG[normalizedRole] || DASHBOARD_CONFIG.appraiser;
  const [statusFilter, setStatusFilter] = useState("");

  const statusFilters = useMemo(
    () => (tableFilters?.statusIn && tableFilters.statusIn.length ? tableFilters.statusIn[0] : ""),
    [tableFilters?.statusIn]
  );

  const chipValue = statusFilter || statusFilters || "";

  const appliedFilters = useMemo(() => {
    const next = { ...(tableFilters || {}) };
    if (chipValue) {
      next.statusIn = [chipValue];
      next.page = 0;
    } else {
      next.statusIn = [];
      next.page = next.page || 0;
    }
    return next;
  }, [tableFilters, chipValue]);

  const toggleStatus = (val) => {
    setStatusFilter((curr) => (curr === val ? "" : val));
  };

  const statusChips = [
    { label: "All", value: "" },
    { label: "Ready for Client", value: "ready_for_client" },
    { label: "In Review", value: "in_review" },
    { label: "Needs Revisions", value: "needs_revisions" },
    { label: "New", value: "new" },
  ];

  const title = isReviewer
    ? "Reviewer Dashboard"
    : isAdmin
    ? "Admin Dashboard"
    : "My Dashboard";

  const ordersCount = summary.orders.count ?? 0;

  const handleOpenOrder = (orderId) => {
    if (!orderId) return;
    nav(`/orders/${orderId}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{title}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          label={isAdmin || isReviewer ? "All Orders" : "My Orders"}
          value={summary.orders.count}
          loading={loading}
        />
        <SummaryCard label="In Progress" value={summary.orders.inProgress} loading={loading} />
        <SummaryCard label="Due in 7 Days" value={summary.orders.dueIn7} loading={loading} />
      </div>

      {/* Calendar section */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Calendar</h2>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <DashboardCalendarPanel
            orders={ordersRows || []}
            onOpenOrder={handleOpenOrder}
            fixedHeader={true}
            mode={isReviewer ? "reviewerQueue" : undefined}
            reviewerId={isReviewer ? reviewerId : undefined}
          />
        </div>
      </section>

      {/* Orders section */}
      {cfg.showOrdersTable && (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              {isAdmin || isReviewer ? "Orders" : "My Orders"}
            </h2>
            <div className="text-sm text-slate-500">
              {ordersCount} order{ordersCount === 1 ? "" : "s"}
            </div>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              {statusChips.map((chip) => {
                const active = chipValue === chip.value;
                return (
                  <button
                    key={chip.value || "all"}
                    onClick={() => toggleStatus(chip.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      active
                        ? "border-slate-800 bg-slate-800 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          )}
          <UnifiedOrdersTable
            role={normalizedRole}
            mode={isReviewer ? "reviewerQueue" : undefined}
            reviewerId={isReviewer ? reviewerId : undefined}
            filters={appliedFilters}
            pageSize={10}
            scope="dashboard"
          />
        </section>
      )}

      {/* Placeholder for future review queue */}
      {cfg.showReviewQueue && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide">
            Review Queue
          </h2>
          <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
            Review queue will be wired once reviewer RLS is added.
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({ label, value, loading }) {
  return (
    <Card className="h-full">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{loading ? "—" : value ?? 0}</div>
    </Card>
  );
}
