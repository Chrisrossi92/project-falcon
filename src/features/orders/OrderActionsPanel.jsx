import { useState } from 'react';
import { updateOrderStatus, assignOrder, updateDueDates } from './actions';

export default function OrderActionsPanel({ orderId }) {
  const [status, setStatus] = useState('');
  const [assignee, setAssignee] = useState('');
  const [note, setNote] = useState('');
  const [due, setDue] = useState(null);
  const [reviewDue, setReviewDue] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function run(fn){
    setBusy(true); setMsg(null);
    try { await fn(); setMsg('✓ Saved'); }
    catch(e){ setMsg(`Error: ${e.message || e}`); }
    finally { setBusy(false); }
  }

  return (
    <div className="border rounded p-3 space-y-3">
      <div className="text-sm text-gray-500">Order ID: {orderId}</div>

      <div className="flex gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">New status</label>
          <input className="border rounded px-2 py-1" value={status} onChange={e=>setStatus(e.target.value)} placeholder="e.g. in_review" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Note (optional)</label>
          <input className="border rounded px-2 py-1" value={note} onChange={e=>setNote(e.target.value)} placeholder="why / context" />
        </div>
        <button className="border rounded px-3 py-1" disabled={busy || !status}
          onClick={()=>run(()=>updateOrderStatus(orderId, status, note))}
        >Update Status</button>
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Assign to (user id UUID)</label>
          <input className="border rounded px-2 py-1" value={assignee} onChange={e=>setAssignee(e.target.value)} placeholder="uuid" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Note (optional)</label>
          <input className="border rounded px-2 py-1" value={note} onChange={e=>setNote(e.target.value)} />
        </div>
        <button className="border rounded px-3 py-1" disabled={busy || !assignee}
          onClick={()=>run(()=>assignOrder(orderId, assignee, note))}
        >Assign</button>
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Due date</label>
          <input type="date" className="border rounded px-2 py-1" onChange={e=>setDue(e.target.value || null)} />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Review due date</label>
          <input type="date" className="border rounded px-2 py-1" onChange={e=>setReviewDue(e.target.value || null)} />
        </div>
        <button className="border rounded px-3 py-1" disabled={busy}
          onClick={()=>run(()=>updateDueDates(orderId, due, reviewDue))}
        >Save Dates</button>
      </div>

      {msg && <div className="text-xs text-gray-600">{msg}</div>}
    </div>
  );
}
