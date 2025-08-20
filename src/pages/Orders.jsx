// src/pages/Orders.jsx
import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import OrdersTable from "@/components/orders/OrdersTable";
import { useSession } from "@/lib/hooks/useSession";

export default function OrdersPage() {
  const { user, isAdmin, isReviewer } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("v_orders_list_with_last_activity")
      .select(`
        order_id, order_number, status, created_at,
        review_due_date, due_date, site_visit_at,
        client_id, client_name,
        appraiser_id, appraiser_name, appraiser_display_name,
        last_action, last_message, last_activity_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    // Scope for non-admin/reviewer
    const scoped = (!isAdmin && !isReviewer && user?.id)
      ? (data || []).filter(r => r.appraiser_id === user.id)
      : (data || []);

    // Shape to match OrdersTable expectations
    const rows = scoped.map(r => ({
      id: r.order_id,
      order_number: r.order_number,
      status: r.status,
      created_at: r.created_at,
      review_due_date: r.review_due_date,
      due_date: r.due_date,
      site_visit_at: r.site_visit_at,
      client: { id: r.client_id, name: r.client_name },
      appraiser: {
        id: r.appraiser_id,
        display_name: r.appraiser_display_name,
        name: r.appraiser_name,
      },
      last_action: r.last_action,
      last_message: r.last_message,
      last_activity_at: r.last_activity_at,
    }));

    setOrders(rows);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isReviewer, user?.id]);

  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <OrdersTable orders={orders} loading={loading} refreshOrders={fetchOrders} />
    </div>
  );
}













