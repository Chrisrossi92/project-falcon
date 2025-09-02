// src/pages/orders/OrderDetail.jsx
import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useOrder } from "@/lib/hooks/useOrders";
import { useRole } from "@/lib/hooks/useRole";
import DetailTemplate from "@/templates/DetailTemplate";
import AssignPanel from "@/components/orders/AssignPanel";
import OrderDatesPanel from "@/components/orders/OrderDatesPanel";
import OrderActions from "@/components/orders/OrderActions";
import OrderActivity from "@/components/orders/OrderActivity";
import LoadingBlock from "@/components/ui/LoadingBlock";
import ErrorCallout from "@/components/ui/ErrorCallout";
import Card from "@/components/ui/Card.jsx";

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

  // all hooks above returns; compute displayPriority safely
  const displayPriority = useMemo(() => {
    if (!order) return "—";
    if (order.priority) return order.priority;
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

  if (loading) return <LoadingBlock label="Loading order…" />;
  if (error) return <ErrorCallout>Failed to load order: {error.message}</ErrorCallout>;
  if (!order)
    return <ErrorCallout>Order not found or you don’t have access.</ErrorCallout>;

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

  const title = `${order_number || "Order"}${address ? ` • ${address}` : ""}`;
  const subtitle = `${client_name || "—"}${
    status ? ` • ${String(status).replaceAll("_", " ")}` : ""
  }`;

  return (
    <DetailTemplate
      title={title}
      subtitle={subtitle}
      back={
        <Link to="/orders" className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50">
          Back
        </Link>
      }
    >
      <Card>
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
      </Card>

      {isAdmin && <AssignPanel order={order} onAfterChange={reload} />}
      {(isAdmin || isReviewer) && (
        <OrderDatesPanel order={order} onAfterChange={reload} />
      )}

      <OrderActions order={order} onAfterAction={reload} />
      <OrderActivity orderId={order.id} />
    </DetailTemplate>
  );
}



