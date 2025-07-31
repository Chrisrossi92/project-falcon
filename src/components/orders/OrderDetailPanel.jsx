import React from "react";
import MetaItem from "@/components/MetaItem";
import { useNavigate } from "react-router-dom";

export default function OrderDetailPanel({ order, isAdmin }) {
  const navigate = useNavigate();

  if (!order) {
    return <div className="text-sm text-gray-500 p-4">Loading order details…</div>;
  }

  const handleEdit = () => {
    navigate(`/orders/${order.id}/edit`);
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Order Info</h2>
        {isAdmin && (
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={handleEdit}
          >
            Edit Details
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetaItem label="Client">{order.client_name}</MetaItem>
        <MetaItem label="Appraiser">{order.appraiser_name}</MetaItem>
        <MetaItem label="Status">{order.status}</MetaItem>
        <MetaItem label="Due Date">{order.due_at}</MetaItem>
        {/* Add other fields as needed */}
      </div>
    </div>
  );
}


