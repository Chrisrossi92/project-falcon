// src/pages/orders/NewOrder.jsx
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import NewOrderForm from "@/components/orders/NewOrderForm";

export default function NewOrderPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">New Order</h1>
        <Link to="/orders" className="px-3 py-1.5 border rounded hover:bg-gray-50 text-sm">
          ← Back to Orders
        </Link>
      </header>

      <NewOrderForm onCreated={(order) => navigate(`/orders/${order.id}`)} />
    </div>
  );
}
