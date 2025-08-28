// src/pages/OrderDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchOrderById } from "@/lib/services/ordersService";
import OrderDetailPanel from "@/components/orders/OrderDetailPanel";
import OrderSidebarPanel from "@/components/orders/OrderSidebarPanel";
import ReadyForReviewButton from "@/components/orders/ReadyForReviewButton";
import ReviewActions from "@/components/orders/ReviewActions";
import { useRole } from "@/lib/hooks/useRole";
import { normalizeStatus, isReviewStatus, labelForStatus } from "@/lib/constants/orderStatus";


export default function OrderDetailPage() {
  const { id } = useParams();
  const { role, isAdmin, isReviewer } = useRole() || {};

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const statusNorm = useMemo(
    () => normalizeStatus(order?.status || ""),
    [order?.status]
  );
  const isAppraiser = String(role || "").toLowerCase() === "appraiser";

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const row = await fetchOrderById(id);
      setOrder(row);
    } catch (e) {
      setErr(e?.message || String(e));
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

  if (loading) return <div className="p-4 text-sm text-gray-600">Loading order…</div>;
  if (err)     return <div className="p-4 text-sm text-red-600">Failed: {err}</div>;
  if (!order)  return <div className="p-4 text-sm text-red-600">Order not found.</div>;

  const title = order.order_number ? `Order ${order.order_number}` : `Order ${order.id.slice(0,8)}`;
  const sub   = [order.property_address || order.address, order.city, order.state].filter(Boolean).join(", ");

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="text-sm text-gray-600">
            {sub || "No address"} • Status: <span className="font-medium">{labelForStatus(statusNorm) || "—"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 border rounded text-sm hover:bg-gray-50"
            onClick={load}
            title="Refresh"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl border shadow-sm p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Appraiser/Admin can move to in_review when not already in review flow */}
          {!isReviewStatus(statusNorm) && (isAdmin || isAppraiser) ? (
            <ReadyForReviewButton orderId={order.id} onDone={load} />
          ) : null}

          {/* Reviewer actions show when in review flow */}
          {isReviewer && isReviewStatus(statusNorm) ? (
            <ReviewActions orderId={order.id} onDone={load} />
          ) : null}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <OrderDetailPanel order={order} isAdmin={!!isAdmin} />
        </div>
        <div>
          <OrderSidebarPanel order={order} />
        </div>
      </div>
    </div>
  );
}














