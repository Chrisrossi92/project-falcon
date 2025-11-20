// src/components/orders/table/OrderInlineDrawer.jsx
import React from "react";
import OrderDetailPanel from "@/components/orders/view/OrderDetailPanel";
import OrderSidebarPanel from "@/components/orders/view/OrderSidebarPanel";
import OrderOpenFullLink from "@/components/orders/drawer/OrderOpenFullLink";

export default function OrderInlineDrawer({
  order,
  children,
  showHeader = false,   // default OFF to keep things minimal
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">
          </div>
          <OrderOpenFullLink orderId={order?.id} />
        </div>
        <OrderDetailPanel order={order} isAdmin={isAdmin} showMap={false} />
      </div>
      <div className="lg:col-span-1">
        <OrderSidebarPanel order={order} />
      </div>
    </div>
  );
}
