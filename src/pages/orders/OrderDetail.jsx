// src/pages/orders/OrderDetail.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useSession } from "@/lib/hooks/useSession";
import {
  fetchOrderById,
  updateOrderStatus,
} from "@/lib/services/ordersService";
import OrderDatesForm from "@/components/orders/OrderDatesForm";
import ReviewRouteEditor from "@/components/orders/ReviewRouteEditor";
import OrderActivityPanel from "@/components/orders/OrderActivityPanel";
import ReadyForReviewButton from "@/components/orders/ReadyForReviewButton";
import SendToClientButton from "@/components/orders/SendToClientButton";


function Field({ label, children }) {
  return (
    <div className="flex gap-2 text-sm">
      <div className="w-36 text-gray-500">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "revisions", label: "Revisions" },
  { value: "ready_for_client", label: "Ready for Client" },
  { value: "complete", label: "Complete" },
];

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useSession();
  const uid = user?.id || null;

  const [order, setOrder] = useState(null);
  const { isAdmin } = useSession();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true); setErr(null);
      const row = await fetchOrderById(id);
      setOrder(row);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function onStatusChange(e) {
    const newStatus = e.target.value;
    if (!newStatus || !order) return;
    try {
      setBusy(true);
      await updateOrderStatus(order.id, newStatus);
      await load();
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-gray-600">Loading…</div>;
  if (err) return <div className="p-6 text-sm text-red-600">Failed: {err}</div>;
  if (!order) return <div className="p-6 text-sm">Order not found.</div>;

  const addressLine =
    order.property_address ||
    order.address ||
    [order.street, order.city, order.state].filter(Boolean).join(", ");

  const isMyOrder = uid && order.appraiser_id === uid;
  const canReadyForReview =
    isMyOrder && ["in_progress", "revisions"].includes(String(order.status || ""));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Order {order.order_number || order.id?.slice(0,8)}
          </h1>
          <div className="text-sm text-gray-500">{addressLine}</div>
        </div>
        <Link to="/orders" className="px-3 py-1.5 border rounded hover:bg-gray-50 text-sm">
          ← Back to Orders
        </Link>
      </header>

      {/* Appraiser action: Ready for Review */}
      {canReadyForReview && (
        <ReadyForReviewButton orderId={order.id} onDone={load} />
      )}

      {/* Meta */}
      <section className="bg-white rounded-2xl shadow border p-4 space-y-2">
        <Field label="Client">
          {order.client_name || order.client?.name || "—"}
        </Field>
        <Field label="Appraiser">
          {order.appraiser_name || order.appraiser?.display_name || order.appraiser_id || "—"}
        </Field>
        <Field label="Status">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={order.status || ""}
            onChange={onStatusChange}
            disabled={busy}
          >
            <option value="">—</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </Field>
        <div className="text-xs text-gray-400">
          Last updated: {order.updated_at ? new Date(order.updated_at).toLocaleString() : "—"}
        </div>
      </section>

      {/* Dates (site visit / review due / client due) */}
      <section className="bg-white rounded-2xl shadow border p-4">
        <h2 className="text-lg font-semibold mb-3">Key Dates</h2>
        <OrderDatesForm order={order} onSaved={load} />
      </section>

      {/* Review Route */}
      <section className="bg-white rounded-2xl shadow border p-4">
        <ReviewRouteEditor
          orderId={order.id}
          initialRoute={order.review_route || null}
          currentReviewerId={order.current_reviewer_id || null}
          onSaved={load}
        />
      </section>

      {isAdmin && String(order.status || "") === "ready_for_client" && (
  <section className="bg-white rounded-2xl shadow border p-4">
    <div className="mb-2 text-lg font-semibold">Finalize</div>
    <SendToClientButton orderId={order.id} onDone={load} />
  </section>
)}

      {/* Activity */}
      <section className="bg-white rounded-2xl shadow border p-4">
        <OrderActivityPanel orderId={order.id} />
      </section>
    </div>
  );
}













