// src/components/orders/InvoiceFields.jsx
import React from 'react';

export default function InvoiceFields({ editedData, handleChange, disabled }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Invoice #</label>
        <input
          type="text"
          name="invoice_number"
          value={editedData.invoice_number || ''}
          onChange={handleChange}
          disabled={disabled}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Paid Status</label>
        <select
          name="paid_status"
          value={editedData.paid_status || 'unpaid'}
          onChange={handleChange}
          disabled={disabled}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        >
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
        </select>
      </div>
    </>
  );
}