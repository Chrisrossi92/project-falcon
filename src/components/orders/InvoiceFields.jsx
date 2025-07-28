// src/components/orders/InvoiceFields.jsx
import React from "react";

export default function InvoiceFields({ editedData, handleChange, disabled }) {
  return (
    <div className="col-span-2 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Client Invoice #
        </label>
        <input
          type="text"
          name="client_invoice"
          value={editedData.client_invoice || ""}
          onChange={handleChange}
          disabled={disabled}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Paid Status
        </label>
        <select
          name="paid_status"
          value={editedData.paid_status || "unpaid"}
          onChange={handleChange}
          disabled={disabled}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </select>
      </div>
    </div>
  );
}
