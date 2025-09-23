// src/pages/EditOrder.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import OrderForm from "@/components/orders/form/OrderForm";
import { fetchOrderById, deleteOrder } from "@/lib/services/ordersService";
import supabase from "@/lib/supabaseClient";   // ← THIS fixes “supabase is not defined”
import { toFormOrder } from "@/lib/utils/orderFormMapping";


export default function EditOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);


  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const data = await fetchOrderById(id);
      setRow(toFormOrder(data));
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


async function onArchive() {
  if (!confirm("Archive this order? You can restore it later.")) return;
  setDeleting(true);
  try {
    // Try RPC
    const { error } = await supabase.rpc("rpc_order_archive", { p_order_id: id });
    if (error) {
      // Fallback: direct update if RPC doesn’t exist / 404
      const { error: e2 } = await supabase
        .from("orders")
        .update({ is_archived: true })
        .eq("id", id);
      if (e2) throw e2;
    }
    navigate("/orders");
  } catch (e) {
    console.error("Archive failed:", e);
    alert("Could not archive the order.");
  } finally {
    setDeleting(false);
  }
}

// Hard delete (danger). Requires the cascade RPC we defined earlier.
async function onDelete() {
  if (!confirm("Permanently delete this order and all related records? This cannot be undone.")) {
    return;
  }
  setDeleting(true);
  try {
    const { error } = await supabase.rpc("rpc_order_delete", { p_order_id: id });
    if (error) throw error;
    navigate("/orders");
  } catch (e) {
    console.error("Delete failed:", e);
    // Common cause: RPC not created -> PostgREST 404
    alert(e?.message || "Could not delete the order. If the RPC isn’t created yet, use Archive instead.");
  } finally {
    setDeleting(false);
  }
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
