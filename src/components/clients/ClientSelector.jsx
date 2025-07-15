// src/components/clients/ClientSelector.jsx (Updated for nested parent/child selection)
import React, { useState, useEffect } from 'react';
import supabase from '@/lib/supabaseClient';

export default function ClientSelector({ clients, value, onChange, isCustomClient, manualClient, onCustomClientNameChange }) {
  const [parents, setParents] = useState([]);
  const [selectedParent, setSelectedParent] = useState('');
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    // Filter top-level parents (parent_id null)
    const topLevel = clients.filter(c => !c.parent_id);
    setParents(topLevel);

    // Pre-select if value is set (for edits)
    if (value) {
      const client = clients.find(c => c.id === value);
      if (client) {
        setSelectedParent(client.parent_id || client.id);
        fetchBranches(client.parent_id || client.id);
      }
    }
  }, [clients, value]);

  const fetchBranches = async (parentId) => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('parent_id', parentId);
    setBranches(data || []);
  };

  const handleParentChange = (e) => {
    const parentId = e.target.value;
    setSelectedParent(parentId);
    fetchBranches(parentId);
    onChange(parentId); // Set client_id to parent
  };

  const handleBranchChange = (e) => {
    const branchId = e.target.value;
    // Here, you'd set branch_id in the form state (need to add to parent component)
    // For now, assuming onChange handles client_id; branch_id separate
  };

  return (
    <>
      <select
        value={selectedParent}
        onChange={handleParentChange}
        className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
      >
        <option value="">Select Client/AMC</option>
        {parents.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
        <option value="custom">Custom/Private</option>
      </select>
      {branches.length > 0 && (
        <select
          onChange={handleBranchChange}
          className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        >
          <option value="">Select Branch/Lender (optional)</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      )}
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