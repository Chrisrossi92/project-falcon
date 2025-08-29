// src/pages/orders/OrderDetail.jsx
import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useOrder } from "@/lib/hooks/useOrders";
import { useRole } from "@/lib/hooks/useRole";
import AssignPanel from "@/components/orders/AssignPanel";
import OrderActions from "@/components/orders/OrderActions";
import OrderActivity from "@/components/orders/OrderActivity";
import OrderDatesPanel from "@/components/orders/OrderDatesPanel";
import QuickStatusPanel from "@/components/orders/QuickStatusPanel";


function Field({ label, value }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 border-b last:border-0">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="col-span-2 text-sm text-gray-900">
        {value ?? <span className="text-gray-400">—</span>}
      </div>
    </div>
  );
}

function fmtDate(d) {
  try {
    if (!d) return null;
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleString();
  } catch {
    return String(d || "");
  }
}

export default function OrderDetail() {
  const { id } = useParams();
  const { data: order, loading, error, reload } = useOrder(id);
  const { isAdmin, isReviewer } = useRole() || {};

  // IMPORTANT: all hooks above any early return.
  const displayPriority = useMemo(() => {
    if (!order) return "—";
    const pri = order.priority;
    if (pri) return pri;
    const due = order.final_due_date || order.due_date;
    if (!due) return "—";
    try {
      const d = new Date(due);
      const now = new Date();
      const isOverdue =
        d < now && String(order.status || "").toLowerCase() !== "complete";
      return isOverdue ? "overdue" : "normal";
    } catch {
      return "—";
    }
  }, [order]);

  const refresh = () => window.location.reload();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
          <span className="text-sm">Loading order…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load order: {error.message || "Unknown error"}
        </div>
        <div className="mt-4">
          <Link className="text-indigo-600 hover:underline" to="/orders">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Order not found or you don’t have access.
        </div>
        <div className="mt-4">
          <Link className="text-indigo-600 hover:underline" to="/orders">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const {
    order_number,
    address,
    client_name,
    status,
    due_date,
    site_visit_date,
    review_due_date,
    final_due_date,
    appraiser_name,
    reviewer_name,
    created_at,
    last_activity_at,
  } = order;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {order_number || "Order"} {address ? `• ${address}` : ""}
          </h1>
          <p className="text-sm text-gray-500">
            {client_name ? client_name : "—"}
            {status ? ` • ${String(status).replaceAll("_", " ")}` : ""}
          </p>
        </div>
        <Link
          to="/orders"
          className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
        >
          Back to Orders
        </Link>
      </div>

      {/* Details */}
      <div className="bg-white border rounded-xl p-4">
        <Field label="Address" value={address} />
        <Field label="Client" value={client_name} />
        <Field label="Status" value={status} />
        <Field label="Priority" value={displayPriority} />
        <Field label="Appraiser" value={appraiser_name} />
        <Field label="Reviewer" value={reviewer_name} />
        <Field label="Site Visit" value={fmtDate(site_visit_date)} />
        <Field label="Review Due" value={fmtDate(review_due_date)} />
        <Field label="Final Due" value={fmtDate(final_due_date)} />
        <Field label="Created" value={fmtDate(created_at)} />
        <Field label="Last Activity" value={fmtDate(last_activity_at)} />
        <Field label="Global Due" value={fmtDate(due_date)} />
      </div>

      {/* Admin-only: Assign appraiser/reviewer */}
      {isAdmin && <AssignPanel order={order} onAfterChange={reload} />}
      {(isAdmin || isReviewer) && <OrderDatesPanel order={order} onAfterChange={reload} />}
      {isAdmin && <QuickStatusPanel order={order} onAfterChange={reload} />}

      {/* Actions (reviewer/admin) */}
      <OrderActions order={order} onAfterAction={reload} />

      {/* Activity */}
      <OrderActivity orderId={order.id} />
    </div>
  );
}


