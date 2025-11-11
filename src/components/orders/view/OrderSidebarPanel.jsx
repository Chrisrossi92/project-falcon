// src/components/orders/view/OrderSidebarPanel.jsx
import React from "react";
import OrderAdminInfoPanel from "@/components/orders/view/OrderAdminInfoPanel";
import OrderDatesPanel from "@/components/orders/view/OrderDatesPanel";
import QuickActionsDrawerPanel from "@/components/orders/view/QuickActionsDrawerPanel";

export default function OrderSidebarPanel({ order, onAfterChange }) {
  return (
    <div className="space-y-3">
      {/* Simple header, no 'Open full order' here */}
      <div className="rounded border bg-white p-3">
        <div className="font-medium">Admin</div>
      </div>

      <OrderAdminInfoPanel order={order} />

      <div className="rounded border bg-white p-3">
        <div className="font-medium mb-2">Dates</div>
        <OrderDatesPanel order={order} onAfterChange={onAfterChange} />
      </div>

      <div className="rounded border bg-white p-3">
        <div className="font-medium mb-2">Quick Actions</div>
        <QuickActionsDrawerPanel order={order} onDone={onAfterChange} />
      </div>
    </div>
  );
}















