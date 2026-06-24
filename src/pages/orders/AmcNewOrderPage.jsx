import React from "react";
import { useNavigate } from "react-router-dom";
import OrderForm from "@/components/orders/form/OrderForm";
import { useToast } from "@/lib/hooks/useToast";

export default function AmcNewOrderPage() {
  const navigate = useNavigate();
  const { success } = useToast();

  return (
    <div className="p-4">
      <OrderForm
        operationsScope="amc_operations"
        allowInlineClientCreation={false}
        onSaved={(createdOrder) => {
          success("Order created");
          if (createdOrder?.id) {
            navigate(`/amc/orders/${createdOrder.id}`);
          } else {
            navigate("/amc/orders");
          }
        }}
      />
    </div>
  );
}
