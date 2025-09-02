// src/components/orders/OrdersDrawer.jsx
import React, { useEffect } from "react";
import OrderDrawerContent from "@/components/orders/OrderDrawerContent";

export default function OrdersDrawer({ selectedOrder, onClose }) {
  // lock background scroll while open
  useEffect(() => {
    if (!selectedOrder) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [selectedOrder]);

  if (!selectedOrder) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-white rounded-t-2xl shadow-xl overflow-auto"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <div className="font-medium">{selectedOrder.order_no ?? "Order"}</div>
          <button
            className="rounded px-2 py-1 text-sm hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </button>
        </div>
        <OrderDrawerContent data={selectedOrder} />
      </div>
    </div>
  );
}




