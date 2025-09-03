// src/components/orders/TypeFields.jsx
import React from 'react';

export default function TypeFields({ editedData, handleChange, disabled }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Property Type</label>
        <select
          name="property_type"
          value={editedData.property_type || ''}
          onChange={handleChange}
          disabled={disabled}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        >
          <option>Office</option>
          {/* Add other options as needed */}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Report Type</label>
        <select
          name="report_type"
          value={editedData.report_type || ''}
          onChange={handleChange}
          disabled={disabled}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        >
          <option>Summary</option>
          {/* Add other options as needed */}
        </select>
      </div>
    </>
  );
}