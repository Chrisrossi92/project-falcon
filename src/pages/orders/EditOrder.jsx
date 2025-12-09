import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import OrderForm from "@/components/orders/form/OrderForm";

// Pull from the normalized view (v3) with the columns our UI expects
async function fetchView(orderId) {
  const { data, error } = await supabase
    .from("v_orders_frontend_v3")
    .select(
      `
        id,
        order_no:order_number,
        order_number,
        status,
        client_name,
        appraiser_name,
        client_id,
        appraiser_id,
        address,
        city,
        state,
        zip,
        property_type,
        report_type,
        fee_amount,
        base_fee,
        appraiser_fee,
        review_due_at,
        final_due_at,
        due_date,
        created_at,
        property_contact_name,
        property_contact_phone,
        access_notes,
        site_visit_at
      `
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function fetchOrders(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export default function EditOrder() {
  const { id } = useParams();
  const nav = useNavigate();

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const [viewRow, ordersRow] = await Promise.all([
          fetchView(id),
          fetchOrders(id),
        ]);
        if (!ok) return;
        // merge: view for names, orders for IDs/true fields
        setRow({ ...(viewRow || {}), ...(ordersRow || {}) });
      } catch (e) {
        if (ok) setErr(e?.message || "Failed to load order");
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [id]);

  if (loading)
    return <div className="p-4 text-sm text-gray-600">Loading…</div>;
  if (err)
    return <div className="p-4 text-sm text-red-600">Failed: {err}</div>;
  if (!row)
    return (
      <div className="p-4 text-sm text-red-600">Order not found.</div>
    );

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Edit Order</h1>
      </div>
      <OrderForm
        order={row}
        onSaved={(updatedRow) => nav(`/orders/${updatedRow.id}`)}
      />
    </div>
  );
}



