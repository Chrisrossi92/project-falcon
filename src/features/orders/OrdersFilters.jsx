// src/features/orders/OrdersFilters.jsx
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';

// What users actually filter by most often
const STATUSES = ['New','In Progress','Review','Final','Delivered','Cancelled'];

// "priority" is computed in the view; useful quick triage
const PRIORITIES = [
  { value: '', label: 'All priorities' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'review_overdue', label: 'Review overdue' },
  { value: 'due_soon', label: 'Due soon (≤2d)' },
  { value: 'review_soon', label: 'Review soon (≤2d)' },
  { value: 'normal', label: 'Normal' },
];

// Simple due windows against due_date (keeps UI obvious)
const DUE_WINDOWS = [
  { value: '', label: 'Any due date' },
  { value: 'overdue', label: 'Overdue' },
  { value: '3', label: 'Due in 3 days' },
  { value: '7', label: 'Due in 7 days' },
  { value: '14', label: 'Due in 14 days' },
];

export default function OrdersFilters({ value, onChange }) {
  const [status, setStatus] = useState(value?.status ?? '');
  const [appraiserId, setAppraiserId] = useState(value?.appraiserId ?? '');
  const [clientId, setClientId] = useState(value?.clientId ?? '');
  const [priority, setPriority] = useState(value?.priority ?? '');
  const [dueWindow, setDueWindow] = useState(value?.dueWindow ?? '');
  const [includeArchived, setIncludeArchived] = useState(!!value?.includeArchived);

  const [appraisers, setAppraisers] = useState([]);
  const [clients, setClients] = useState([]);

  // Load dropdown data (lightweight)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [a, c] = await Promise.all([
        supabase.from('users').select('id, name, role').eq('role', 'appraiser').order('name'),
        supabase.from('clients').select('id, name').order('name'),
      ]);
      if (!mounted) return;
      if (!a.error) setAppraisers(a.data || []);
      if (!c.error) setClients(c.data || []);
    })();
    return () => { mounted = false; };
  }, []);

  // Emit whenever something changes
  useEffect(() => {
    onChange?.({
      status: status || '',
      appraiserId: appraiserId || '',
      clientId: clientId || '',
      priority: priority || '',
      dueWindow: dueWindow || '',
      includeArchived: !!includeArchived,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, appraiserId, clientId, priority, dueWindow, includeArchived]);

  return (
    <div className="flex flex-wrap items-center gap-3 p-2 border rounded-xl bg-white">
      {/* Status */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Status</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={status}
          onChange={(e)=>setStatus(e.target.value)}
        >
          <option value="">All</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Appraiser */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Appraiser</label>
        <select
          className="border rounded px-2 py-1 text-sm min-w-[12rem]"
          value={appraiserId}
          onChange={(e)=>setAppraiserId(e.target.value)}
        >
          <option value="">All</option>
          {appraisers.map(u => <option key={u.id} value={u.id}>{u.name || u.id}</option>)}
        </select>
      </div>

      {/* Client */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Client</label>
        <select
          className="border rounded px-2 py-1 text-sm min-w-[12rem]"
          value={clientId}
          onChange={(e)=>setClientId(e.target.value)}
        >
          <option value="">All</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
        </select>
      </div>

      {/* Priority */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Priority</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={priority}
          onChange={(e)=>setPriority(e.target.value)}
        >
          {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* Due window */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Due</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={dueWindow}
          onChange={(e)=>setDueWindow(e.target.value)}
        >
          {DUE_WINDOWS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
        </select>
      </div>

      {/* Archived */}
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e)=>setIncludeArchived(e.target.checked)}
        />
        Show archived
      </label>
    </div>
  );
}

