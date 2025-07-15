// src/components/clients/ClientSelector.jsx (Complete version with fixes for string IDs and full structure)
import React from 'react';

export default function ClientSelector({ clients, value, onChange, isCustomClient, manualClient, onCustomClientNameChange }) {
  return (
    <>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
      >
        <option value="">Select Client</option>
        {clients.map((c) => (
          <option key={c.id} value={String(c.id)}>{c.name}</option>
        ))}
        <option value="custom">Custom</option>
      </select>
      {isCustomClient && (
        <input
          value={manualClient}
          onChange={(e) => onCustomClientNameChange(e.target.value)}
          placeholder="Enter client name manually"
          className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      )}
    </>
  );
}