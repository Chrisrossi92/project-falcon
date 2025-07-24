// src/components/orders/AssignmentFields.jsx
import React from 'react';
import ClientSelector from '@/components/clients/ClientSelector';

export default function AssignmentFields({
  editedData,
  handleAppraiserSelect,
  appraisers,
  clients,
  isCustomClient,
  manualClient,
  clientId,
  handleClientChange,
  handleCustomClientNameChange,
  disabled,
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Appraiser</label>
        <select
          value={editedData.appraiser_id || ''}
          onChange={handleAppraiserSelect}
          disabled={disabled}
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
          onChange={handleClientChange}
          isCustomClient={isCustomClient}
          manualClient={manualClient}
          onCustomClientNameChange={handleCustomClientNameChange}
          disabled={disabled} // Add disabled prop to ClientSelector if it supports it; otherwise, extend it
        />
      </div>
    </>
  );
}


