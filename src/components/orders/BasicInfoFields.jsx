// src/components/orders/BasicInfoFields.jsx
import React from 'react';

export default function BasicInfoFields({ editedData, handleChange, disabled }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Order Number</label>
        <input
          type="text"
          value={editedData.id || ''}
          disabled
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 bg-gray-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <input
          name="address"
          value={editedData.address || ''}
          onChange={handleChange}
          disabled={disabled}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          name="status"
          value={editedData.status || ''}
          onChange={handleChange}
          disabled={disabled}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        >
          <option>In Progress</option>
          <option>Needs Review</option>
          <option>Completed</option>
        </select>
      </div>
    </>
  );
}