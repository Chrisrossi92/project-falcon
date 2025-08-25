// src/pages/NewOrder.jsx
import React from "react";
import OrderForm from "@/components/orders/OrderForm";

const DEFAULT_ORDER = {
  status: "new",
  client_id: null,
  appraiser_id: null,
  manual_client: "",
  manual_appraiser: "",
  property_address: "",
  city: "",
  state: "",
  postal_code: "",
  site_visit_at: null,
  review_due_at: null,
  final_due_at: null,
};

export default function NewOrder() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Create Order</h1>
      <OrderForm initialOrder={DEFAULT_ORDER} mode="create" />
    </div>
  );
}






