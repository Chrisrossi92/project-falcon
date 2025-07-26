// src/components/orders/OrdersTableHeader.jsx
import React from "react";

export default function OrdersTableHeader({ hideAppraiserColumn }) {
  return (
    <thead className="bg-gray-100 text-gray-800 uppercase text-xs">
      <tr>
        <th className="px-4 py-2">Order #</th>
        <th className="px-4 py-2">Client</th>
        <th className="px-4 py-2">Address</th>
        {!hideAppraiserColumn ? (
          <th className="px-4 py-2">Appraiser</th>
        ) : (
          <th className="px-4 py-2">Fee Split</th>
        )}
        <th className="px-4 py-2">Status</th>
        <th className="px-4 py-2">Site Visit</th>
        <th className="px-4 py-2">Due Date</th>
        <th className="px-4 py-2">Actions</th>
      </tr>
    </thead>
  );
}

