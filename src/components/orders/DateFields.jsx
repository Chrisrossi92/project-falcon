// src/components/orders/DateFields.jsx
import React from 'react';

export default function DateFields({
  editedData,
  handleChange,
  reviewDueDate,
  setReviewDueDate,
  disabled,
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Due Date (Client)</label>
        <input
          type="date"
          name="due_date"
          value={editedData.due_date || ''}
          onChange={handleChange}
          disabled={disabled}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Review Due Date</label>
        <input
          type="date"
          value={reviewDueDate}
          onChange={(e) => setReviewDueDate(e.target.value)}
          disabled={disabled}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Site Visit Date</label>
        <input
          type="date"
          name="site_visit_date"
          value={editedData.site_visit_date || ''}
          onChange={handleChange}
          disabled={disabled}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>
    </>
  );
}