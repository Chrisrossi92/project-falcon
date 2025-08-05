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
  handleBranchChange, // ✅ new prop
  handleCustomClientNameChange,
  disabled,
}) {
  return (
    <>
      {/* Appraiser Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Appraiser</label>
        <select
          value={editedData.appraiser_id ?? ""}
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

      {/* Client Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Client</label>
        <ClientSelector
          clients={clients}
          value={clientId}
          branchValue={editedData.branch_id ?? ""}
          onChange={handleClientChange}
          onBranchChange={handleBranchChange} // ✅ now wired
          isCustomClient={isCustomClient}
          manualClient={manualClient}
          onCustomClientNameChange={handleCustomClientNameChange}
          disabled={disabled}
        />
      </div>
    </>
  );
}




