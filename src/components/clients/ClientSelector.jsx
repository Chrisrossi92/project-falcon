// src/components/clients/ClientSelector.jsx

import React, { useState, useEffect } from 'react';
import supabase from '@/lib/supabaseClient';

export default function ClientSelector({
  clients = [],
  value, // current client_id
  branchValue, // current branch_id
  onChange, // sets client_id
  onBranchChange, // sets branch_id
  isCustomClient,
  manualClient,
  onCustomClientNameChange,
  disabled = false,
}) {
  const [parents, setParents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedParent, setSelectedParent] = useState("");

  useEffect(() => {
    const topLevel = clients.filter(c => !c.parent_id);
    setParents(topLevel);

    // If editing, pre-populate AMC + Branch dropdowns
    if (value) {
      const client = clients.find(c => c.id === value);
      if (client) {
        const parentId = client.parent_id || client.id;
        setSelectedParent(parentId);
        fetchBranches(parentId);
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
    const selected = e.target.value;

    if (selected === "custom") {
      setSelectedParent("");
      onChange(null); // client_id null
      onBranchChange(null);
    } else {
      setSelectedParent(selected);
      onChange(parseInt(selected)); // client_id = AMC
      onBranchChange(null); // clear any branch selection
      fetchBranches(selected);
    }
  };

  const handleBranchChange = (e) => {
    const branchId = e.target.value;
    if (branchId) {
      onBranchChange(parseInt(branchId)); // sets branch_id
    } else {
      onBranchChange(null);
    }
  };

  return (
    <div className="space-y-2">
      {/* AMC or direct client */}
      <select
        disabled={disabled}
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

      {/* Lender branch */}
      {branches.length > 0 && selectedParent !== "custom" && (
        <select
          disabled={disabled}
          value={branchValue ?? ""}
          onChange={handleBranchChange}
          className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
        >
          <option value="">Select Branch/Lender (optional)</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      )}

      {/* Manual name entry */}
      {isCustomClient && (
        <input
          disabled={disabled}
          value={manualClient}
          onChange={(e) => onCustomClientNameChange(e.target.value)}
          placeholder="Enter client name manually"
          className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      )}
    </div>
  );
}

