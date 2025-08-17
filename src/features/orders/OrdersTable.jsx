import { useEffect, useState } from 'react';
import { getOrdersList } from './api';
import { supa as defaultClient } from '../../lib/supa.client';

export default function OrdersTable({
  client = defaultClient,
  pageSize = 25,
  status,
  branchId,
  includeArchived = false,
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pages = Math.max(1, Math.ceil(count / pageSize));

  async function load() {
    setLoading(true);
    const res = await getOrdersList(
      { page, pageSize, status, branchId, search, includeArchived },
      client
    );
    setRows(res.data);
    setCount(res.count);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, status, branchId, includeArchived]);

  function onSearch(e) { e.preventDefault(); setPage(1); load(); }

  return (
    <div className="p-4">
      <form onSubmit={onSearch} className="flex gap-2 mb-3">
        <input
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
          placeholder="Search title, order #, address…"
          className="border rounded px-3 py-2 w-full"
        />
        <button className="border rounded px-3 py-2">Search</button>
      </form>

      <div className="overflow-auto border rounded">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">Order #</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Address</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Due</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-6" colSpan={7}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-3 py-6" colSpan={7}>No orders</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.order_number || '—'}</td>
                <td className="px-3 py-2">{r.title || '—'}</td>
                <td className="px-3 py-2">{r.display_address || '—'}</td>
                <td className="px-3 py-2">{r.status || '—'}</td>
                <td className="px-3 py-2">{r.due_date || '—'}</td>
                <td className="px-3 py-2"><PriorityPill value={r.priority || 'normal'} /></td>
                <td className="px-3 py-2">
                  <div className="flex flex-col">
                    <span className="text-gray-900">{r.last_action || '—'}</span>
                    <span className="text-gray-500 text-xs">{r.last_message || ''}</span>
                    <span className="text-gray-400 text-xs">{r.last_activity_at || ''}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button className="border rounded px-3 py-1" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
        <span className="text-sm">{page} / {pages}</span>
        <button className="border rounded px-3 py-1" disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))}>Next</button>
      </div>
    </div>
  );
}

function PriorityPill({ value }) {
  const map = {
    overdue:        'bg-red-100 text-red-800',
    review_overdue: 'bg-rose-100 text-rose-800',
    due_soon:       'bg-amber-100 text-amber-800',
    review_soon:    'bg-yellow-100 text-yellow-800',
    normal:         'bg-slate-100 text-slate-800',
  };
  const cls = map[value] || map.normal;
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{value}</span>;
}
