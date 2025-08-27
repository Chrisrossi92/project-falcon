// src/pages/Orders.jsx
import React, { useState } from "react";
import OrdersTable from "@/features/orders/OrdersTable";
import AppraiserSelect from "@/components/ui/AppraiserSelect";
import NewOrderButton from "@/components/orders/NewOrderButton";

export default function OrdersPage() {
  const [appraiserId, setAppraiserId] = useState(null);

  return (
    <div className="p-4 space-y-3">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Orders</h1>
        <NewOrderButton />
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-xl p-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Filter by appraiser:</label>
          <div className="min-w-[260px]">
            <AppraiserSelect
              value={appraiserId || ""}
              onChange={(v) => setAppraiserId(v)}
              placeholder="Select appraiser…"
            />
          </div>
          {appraiserId && (
            <button
              className="px-2 py-1 border rounded text-sm hover:bg-gray-50"
              onClick={() => setAppraiserId(null)}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table (adapter handles fetch/filter) */}
      <div className="bg-white border rounded-xl p-3">
        <OrdersTable appraiserId={appraiserId || undefined} />
      </div>
    </div>
  );
}


























