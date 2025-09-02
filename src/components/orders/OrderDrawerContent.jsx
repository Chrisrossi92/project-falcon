// src/components/orders/OrderDrawerContent.jsx
import React from "react";
import OrderDetailPanel from "@/components/orders/OrderDetailPanel";
import OrderSidebarPanel from "@/components/orders/OrderSidebarPanel";

export default function OrderDrawerContent({ data }) {
  return (
    <div className="grid grid-cols-12 gap-4">
      {/* LEFT: Order Info (now includes compact mini-map) */}
      <div className="col-span-12 lg:col-span-8">
        <OrderDetailPanel order={data} isAdmin />
      </div>

      {/* RIGHT: Activity (keeps your existing Activity/Notes stack) */}
      <div className="col-span-12 lg:col-span-4">
        <OrderSidebarPanel order={data} />
      </div>
    </div>
  );
}












