// src/pages/NewOrder.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import OrderForm from "@/components/orders/form/OrderForm";
import { useToast } from "@/lib/hooks/useToast";

export default function NewOrderPage() {
  const navigate = useNavigate();
  const { success } = useToast();

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">New Order</h1>
      <OrderForm
        onSaved={() => {
          success("Order created");
          navigate("/orders");
        }}
      />
    </div>
  );
}








