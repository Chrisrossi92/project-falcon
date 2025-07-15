// src/components/orders/OrderInfoFields.jsx
import React from 'react';
import ClientSelector from '@/components/clients/ClientSelector';

export default function OrderInfoFields({
  editedData,
  handleChange,
  handleAppraiserSelect,
  currentUserRole,
  appraisers,
  clients,
  isCustomClient,
  manualClient,
  clientId,
  handleClientChange,
  handleCustomClientNameChange,
  reviewDueDate,
  setReviewDueDate
}) {
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
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          name="status"
          value={editedData.status || ''}
          onChange={handleChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        >
          <option>In Progress</option>
          <option>Needs Review</option>
          <option>Completed</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Appraiser</label>
        <select
          value={editedData.appraiser_id || ''}
          onChange={handleAppraiserSelect}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        >
          <option value="">Select Appraiser</option>
          {appraisers.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Client</label>
        <ClientSelector
          clients={clients}
          value={clientId}
          onChange={handleClientChange} // Ensure this is passed correctly
          isCustomClient={isCustomClient}
          manualClient={manualClient}
          onCustomClientNameChange={handleCustomClientNameChange}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Due Date (Client)</label>
        <input
          type="date"
          name="due_date"
          value={editedData.due_date || ''}
          onChange={handleChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Review Due Date</label>
        <input
          type="date"
          value={reviewDueDate}
          onChange={(e) => setReviewDueDate(e.target.value)}
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
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Property Type</label>
        <select
          name="property_type"
          value={editedData.property_type || ''}
          onChange={handleChange}
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
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        >
          <option>Summary</option>
          {/* Add other options as needed */}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Base Fee</label>
        <input
          type="number"
          name="base_fee"
          value={editedData.base_fee || ''}
          onChange={handleChange}
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

      <div>
        <label className="block text-sm font-medium text-gray-700">Invoice #</label>
        <input
          type="text"
          name="invoice_number"
          value={editedData.invoice_number || ''}
          onChange={handleChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Paid Status</label>
        <select
          name="paid_status"
          value={editedData.paid_status || 'unpaid'}
          onChange={handleChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
        >
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          name="notes"
          value={editedData.notes || ''}
          onChange={handleChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
          rows="3"
        />
      </div>
    </>
  );
}