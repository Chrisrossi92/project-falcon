// src/pages/NewOrder.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import OrderForm from "@/components/orders/form/OrderForm";

export default function NewOrderPage() {
  const navigate = useNavigate();
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">New Order</h1>
      <OrderForm onSaved={(id) => navigate(`/orders/${id}`)} />
    </div>
  );
}








