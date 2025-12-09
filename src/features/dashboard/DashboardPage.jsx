// src/features/dashboard/DashboardPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useDashboardSummary } from "@/lib/hooks/useDashboardSummary";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import DashboardCalendarPanel from "@/components/dashboard/DashboardCalendarPanel";
import Card from "@/components/ui/Card";

const DASHBOARD_CONFIG = {
  owner:     { showOrdersTable: true, showReviewQueue: false },
  admin:     { showOrdersTable: true, showReviewQueue: false },
  appraiser: { showOrdersTable: true, showReviewQueue: false },
  client:    { showOrdersTable: true, showReviewQueue: false },
  reviewer:  { showOrdersTable: false, showReviewQueue: false }, // we'll add review queue later
};

export default function DashboardPage() {
  const nav = useNavigate();
  const summary = useDashboardSummary();
  const { role, isAdmin, isReviewer, loading, tableFilters, ordersRows } = summary;

  const cfg = DASHBOARD_CONFIG[role] || DASHBOARD_CONFIG.appraiser;

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
          <UnifiedOrdersTable role={role} filters={tableFilters} pageSize={10} />
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
