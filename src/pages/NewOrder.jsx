// src/pages/NewOrder.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import OrderForm from "@/components/orders/form/OrderForm";
import { useToast } from "@/lib/hooks/useToast";

export default function NewOrderPage() {
  const navigate = useNavigate();
  const { success } = useToast();

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <header className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Client Orders
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          New Order
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          Create an internal appraisal order, assign production staff, and capture scheduling details.
        </p>
      </header>
      <OrderForm
        onSaved={(createdOrder) => {
          success("Order created");
          if (createdOrder?.id) {
            navigate(`/orders/${createdOrder.id}`);
          } else {
            navigate("/orders");
          }
        }}
      />
    </div>
  );
}






