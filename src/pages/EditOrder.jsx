// src/pages/EditOrder.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import OrderForm from "@/components/orders/OrderForm";
import { fetchOrderById, deleteOrder } from "@/lib/services/ordersService";

export default function EditOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const data = await fetchOrderById(id);
      setRow(data);
    } catch (e) {
      setErr(e?.message || String(e));
      setRow(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onDelete() {
    if (!id) return;
    if (!confirm("Delete this order?")) return;
    await deleteOrder(id);
    navigate("/orders");
  }

  if (loading) return <div className="p-4 text-sm text-gray-600">Loading…</div>;
  if (err)     return <div className="p-4 text-sm text-red-600">Failed: {err}</div>;
  if (!row)    return <div className="p-4 text-sm text-red-600">Order not found.</div>;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Edit Order</h1>
        <button
          className="px-2 py-1 border rounded text-sm hover:bg-gray-50"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>

      <OrderForm order={row} onSaved={(oid) => navigate(`/orders/${oid}`)} />
    </div>
  );
}
