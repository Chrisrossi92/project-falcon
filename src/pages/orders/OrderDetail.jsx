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
import Card from "@/components/ui/Card.jsx";
import StatusBadge from "@/features/orders/StatusBadge";
import { labelForStatus } from "@/lib/constants/orderStatus";

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

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : null);
const fmtDateOnly = (d) => (d ? new Date(d).toLocaleDateString() : null);

export default function OrderDetail() {
  const { id } = useParams();
  const { data: order, loading, error, reload } = useOrder(id);
  const { isAdmin, isReviewer } = useRole() || {};

  const derived = useMemo(() => {
    if (!order) return { title: "Order", subtitle: "", statusText: "", priority: "—" };

    const orderNumber = order.order_no ?? order.order_number ?? "Order";
    const address = order.address || "";
    const statusText = labelForStatus(order.status);
    const title = address ? `${orderNumber} • ${address}` : orderNumber;
    const subtitle = [order.client_name, statusText].filter(Boolean).join(" • ");

    // Simple “priority” based on due date vs now (Complete never shows overdue)
    const due = order.due_date ? new Date(order.due_date) : null;
    let priority = "—";
    if (due && String(order.status || "").toLowerCase() !== "complete") {
      priority = due < new Date() ? "overdue" : "normal";
    }

    return { title, subtitle, statusText, priority };
  }, [order]);

  if (loading) return <div className="p-4 text-sm text-gray-600">Loading order…</div>;
  if (error) return <div className="p-4 text-sm text-red-600">Failed to load order: {error.message}</div>;
  if (!order) return <div className="p-4 text-sm text-amber-700">Order not found or you don’t have access.</div>;

  return (
    <DetailTemplate
      title={derived.title}
      subtitle={derived.subtitle}
      headerRight={
        order.status ? (
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
          </div>
        ) : null
      }
      back={
        <Link to="/orders" className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50">
          Back
        </Link>
      }
    >
      {/* Core info */}
      <Card>
        <Field label="Order #" value={order.order_no ?? order.order_number ?? null} />
        <Field label="Client" value={order.client_name} />
        <Field label="Address" value={order.address} />
        <Field label="Status" value={derived.statusText || order.status || null} />
        <Field label="Priority" value={derived.priority} />
        <Field label="Appraiser" value={order.appraiser_name} />
        <Field label="Ordered" value={fmtDate(order.date_ordered)} />
        <Field label="Due" value={fmtDateOnly(order.due_date)} />
      </Card>

      {/* Admin/Reviewer panels */}
      {isAdmin && <AssignPanel order={order} onAfterChange={reload} />}
      {(isAdmin || isReviewer) && <OrderDatesPanel order={order} onAfterChange={reload} />}

      {/* Actions & Activity */}
      {(isAdmin || isReviewer) && <OrderActions order={order} onAfterAction={reload} />}
      <OrderActivity orderId={order.id} />
    </DetailTemplate>
  );
}




