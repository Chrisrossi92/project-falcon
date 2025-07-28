import React from "react";
import MetaItem from "@/components/MetaItem";

export default function OrderDetailPanel({ order, isAdmin }) {
  if (!order) {
    return <div className="text-sm text-gray-500 p-4">Loading order details…</div>;
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Order Info</h2>
        {isAdmin && (
          <button className="text-sm text-blue-600 hover:underline">
            Edit Details
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetaItem label="Order #" value={order.id} />
        <MetaItem label="Status" value={order.status || "—"} />
        <MetaItem label="Appraiser" value={order.appraiser_name || order.manual_appraiser || "—"} />
        <MetaItem label="Client" value={order.client_name || order.manual_client || "—"} />
        <MetaItem label="Address" value={order.address || "—"} />
        <MetaItem label="Property Type" value={order.property_type || "—"} />
        <MetaItem label="Report Type" value={order.report_type || "—"} />
        <MetaItem label="Base Fee" value={order.base_fee ? `$${order.base_fee}` : "—"} />
        <MetaItem label="Split" value={order.appraiser_split ? `${order.appraiser_split * 100}%` : "—"} />
        <MetaItem label="Invoice #" value={order.client_invoice || "—"} />
        <MetaItem label="Paid Status" value={order.paid_status || "—"} />
        <MetaItem label="Notes" value={order.notes || "—"} />
        <MetaItem label="Due (Client)" value={order.due_date || "—"} />
        <MetaItem label="Due (Review)" value={order.review_due_date || "—"} />
        <MetaItem label="Site Visit" value={order.site_visit_date || "—"} />
      </div>
    </div>
  );
}

