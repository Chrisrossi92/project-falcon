// src/components/orders/NotesField.jsx
import React from 'react';

export default function NotesField({ editedData, handleChange, disabled }) {
  return (
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-gray-700">Notes</label>
      <textarea
        name="notes"
        value={editedData.notes || ''}
        onChange={handleChange}
        disabled={disabled}
        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        rows="3"
      />
    </div>
  );
}