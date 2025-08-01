// src/components/orders/OrderDetailPanel.jsx

import React from "react";
import MetaItem from "@/components/MetaItem";
import { useNavigate } from "react-router-dom";

export default function OrderDetailPanel({ order, isAdmin }) {
  const navigate = useNavigate();

  const formatDate = (date) =>
    date ? new Date(date).toLocaleString() : "—";

  if (!order) {
    return (
      <div className="text-sm text-gray-500 p-4">
        Loading order details…
      </div>
    );
  }

  const handleEdit = () => {
    navigate(`/orders/${order.id}/edit`);
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Order Info</h2>
        {isAdmin && (
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={handleEdit}
          >
            Edit Details
          </button>
        )}
      </div>

      {/* Main Fields in 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: General Info */}
        <div className="space-y-3">
          <MetaItem label="Client">{order.client_name}</MetaItem>
          <MetaItem label="Appraiser">{order.appraiser_name}</MetaItem>
          <MetaItem label="Address">{order.address}</MetaItem>
          <MetaItem label="City">{order.city}</MetaItem>
          <MetaItem label="State">{order.state}</MetaItem>
          <MetaItem label="Zip">{order.zip}</MetaItem>
        </div>

        {/* Column 2: Fees & Assignment */}
        <div className="space-y-3">
          <MetaItem label="Base Fee">
            {order.base_fee != null ? `$${order.base_fee}` : "—"}
          </MetaItem>
          {isAdmin && (
            <>
              <MetaItem label="Appraiser Fee">
                {order.appraiser_fee != null ? `$${order.appraiser_fee}` : "—"}
              </MetaItem>
              <MetaItem label="Appraiser Split">
                {order.appraiser_split != null
                  ? `${order.appraiser_split}%`
                  : "—"}
              </MetaItem>
              <MetaItem label="Client Invoice #">
                {order.client_invoice || "—"}
              </MetaItem>
              <MetaItem label="Paid Status">{order.paid_status || "—"}</MetaItem>
            </>
          )}
        </div>

        {/* Column 3: Dates & Status */}
        <div className="space-y-3">
          <MetaItem label="Status">{order.status || "—"}</MetaItem>
          <MetaItem label="Due Date">{formatDate(order.due_date)}</MetaItem>
          <MetaItem label="Site Visit">{formatDate(order.site_visit_at)}</MetaItem>
          {isAdmin && (
            <>
              <MetaItem label="Created At">{formatDate(order.created_at)}</MetaItem>
              <MetaItem label="Updated At">{formatDate(order.updated_at)}</MetaItem>
            </>
          )}
        </div>
      </div>

      {/* Notes Section */}
      <div>
        <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
          Notes
        </h3>
        <div className="text-sm text-gray-800 whitespace-pre-wrap">
          {order.notes || "—"}
        </div>
      </div>
    </div>
  );
}








