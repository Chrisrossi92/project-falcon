import React from 'react';

export default function ClientSelector({
  clients,
  clientId,
  isCustomClient,
  customClientName,
  onClientChange,
  onCustomNameChange
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Client</label>
        <select
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
          value={isCustomClient ? 'custom' : clientId || ''}
          onChange={(e) => onClientChange(e.target.value)}
        >
          <option value="">Select a client...</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
          <option value="custom">Private / Manual Entry</option>
        </select>
      </div>

      {isCustomClient && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Custom Client Name</label>
          <input
            type="text"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={customClientName}
            onChange={(e) => onCustomNameChange(e.target.value)}
            placeholder="Enter client name manually"
          />
        </div>
      )}
    </>
  );
}