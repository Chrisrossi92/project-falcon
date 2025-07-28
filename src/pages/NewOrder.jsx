import React, { useState } from "react";
import OrderForm from "@/components/orders/OrderForm";

export default function NewOrder() {
  const [order, setOrder] = useState({
    address: "",
    status: "New",
    due_date: "",
    site_visit_date: "",
    review_due_date: "",
    client_id: null,
    manual_client: "",
    appraiser_id: null,
    base_fee: "",
    appraiser_split: "",
    appraiser_fee: "",
    paid_status: "unpaid",
    report_type: "",
    property_type: "",
    notes: "",
    client_invoice: "",
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Create New Order</h1>
      <OrderForm order={order} setOrder={setOrder} mode="new" />
    </div>
  );
}




