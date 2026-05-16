// src/pages/NewOrder.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import OrderForm from "@/components/orders/form/OrderForm";
import { useToast } from "@/lib/hooks/useToast";

export default function NewOrderPage() {
  const navigate = useNavigate();
  const { success } = useToast();

  return (
    <div className="p-4">
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







