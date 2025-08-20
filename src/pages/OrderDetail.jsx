// src/components/OrderDetail.jsx
import { useEffect, useState } from "react";
import  supabase  from "../lib/supabaseClient";

export default function OrderDetail({ orderId }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    let isMounted = true;

    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
  .from("orders")
  .select(`
    *,
    client:client_id ( name ),
    appraiser:user_profiles!fk_orders_appraiser_id (
      user_id:id,
      display_name,
      full_name
    )
  `)
  .eq("id", orderId)
  .single();

  if (!isMounted) return;

      if (error) {
        setErr(error);
        setLoading(false);
        return;
      }

      setOrder(data);
      setLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  if (loading) return <div>Loading order…</div>;
  if (err) {
    return (
      <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>
        Error loading order:
        {" "}{err.message}
        {err.hint ? `\nHint: ${err.hint}` : ""}
      </div>
    );
  }
  if (!order) return <div>Order not found.</div>;

  return (
    <div className="order-detail">
      <h2>Order #{order.order_number ?? order.id}</h2>

      <div className="grid" style={{ display: "grid", gap: 8 }}>
        <div><strong>Client:</strong> {order.client?.name ?? "—"}</div>
        <div><strong>Appraiser:</strong> {order.appraiser?.display_name ?? order.appraiser?.full_name ?? "—"}</div>
        <div><strong>Status:</strong> {order.status ?? "—"}</div>
        <div><strong>Address:</strong> {order.address ?? "—"}</div>
        <div><strong>City/State:</strong> {[order.city, order.state].filter(Boolean).join(", ") || "—"}</div>
        <div><strong>Due date:</strong> {order.due_date ?? "—"}</div>
        <div><strong>Created:</strong> {order.created_at ?? "—"}</div>
      </div>
    </div>
  );
}






