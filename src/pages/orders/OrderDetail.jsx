// src/pages/orders/OrderDetail.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import { useOrder } from "@/lib/hooks/useOrders";
import OrderForm from "@/components/orders/form/OrderForm";
import { toFormOrder } from "@/lib/utils/orderFormMapping";

export default function OrderDetail() {
  const { id } = useParams();
  const { data: order, loading, error, reload } = useOrder(id);

  if (loading) return <div className="p-4 text-sm text-gray-600">Loading order…</div>;
  if (error) return <div className="p-4 text-sm text-red-600">Failed to load order: {error.message}</div>;
  if (!order) return <div className="p-4 text-sm text-amber-700">Order not found or you don’t have access.</div>;

  const formOrder = toFormOrder(order);
  const title = `Order ${formOrder.order_no ?? formOrder.order_number ?? id}`;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{title}</h1>
        <Link to="/orders" className="px-3 py-1.5 border rounded hover:bg-gray-50 text-sm">
          ← Back to Orders
        </Link>
      </div>

      {/* Same exact form as New Order, but prefilled and editable */}
      <OrderForm order={formOrder} onSaved={() => reload()} />
    </div>
  );
}





