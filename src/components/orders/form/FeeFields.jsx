// src/components/orders/FeeFields.jsx
import React from 'react';

export default function FeeFields({ editedData, handleChange, disabled }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Base Fee</label>
        <input
          type="number"
          name="base_fee"
          value={editedData.base_fee || ''}
          onChange={handleChange}
          disabled={disabled}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
          step="0.01"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Appraiser Split (%)</label>
        <input
          type="number"
          name="appraiser_split"
          value={editedData.appraiser_split || ''}
          onChange={handleChange}
          disabled={disabled}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
          step="0.1"
          min="0"
          max="100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Appraiser Fee</label>
        <input
          type="text"
          value={`$${editedData.appraiser_fee || '0.00'}`}
          disabled
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 bg-gray-100"
        />
      </div>
    </>
  );
}