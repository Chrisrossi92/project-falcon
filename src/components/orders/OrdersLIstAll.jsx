import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";

function fmt(dt) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString(); } catch { return "—"; }
}

export default function OrdersListAll() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const navigate = useNavigate();

  async function load() {
    setLoading(true); setErr(null);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, order_number, status, is_archived,
        property_address, address, city, state, postal_code,
        site_visit_at, review_due_at, final_due_at,
        client:client_id ( name ),
        appraiser:appraiser_id ( id, display_name, name )
      `)
      .order("final_due_at", { ascending: true })
      .limit(1000);
    if (error) { setErr(error.message); setRows([]); setLoading(false); return; }
    setRows((data || []).filter(r => showArchived ? true : !r.is_archived));
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showArchived]);

  if (loading) return <div className="bg-white rounded-2xl shadow border p-4">Loading orders…</div>;
  if (err) return <div className="bg-white rounded-2xl shadow border p-4 text-red-600">Failed: {err}</div>;

  return (
    <div className="bg-white rounded-2xl shadow border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">All Orders</div>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="py-2 pr-3">Order #</th>
              <th className="py-2 pr-3">Client</th>
              <th className="py-2 pr-3">Address</th>
              <th className="py-2 pr-3">Appraiser</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Site Visit</th>
              <th className="py-2 pr-3">Due (Client)</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(rows || []).map(r => (
              <tr key={r.id}>
                <td className="py-2 pr-3">{r.order_number || r.id.slice(0,8)}</td>
                <td className="py-2 pr-3">{r.client?.name || "—"}</td>
                <td className="py-2 pr-3">
                  {(r.property_address || r.address || "—")}{r.city ? `, ${r.city}` : ""}{r.state ? `, ${r.state}` : ""}{r.postal_code ? ` ${r.postal_code}` : ""}
                </td>
                <td className="py-2 pr-3">{r.appraiser?.display_name || r.appraiser?.name || "—"}</td>
                <td className="py-2 pr-3">{r.status || "—"}</td>
                <td className="py-2 pr-3">{fmt(r.site_visit_at)}</td>
                <td className="py-2 pr-3">{fmt(r.final_due_at)}</td>
                <td className="py-2 pr-3">
                  <button
                    className="px-2 py-1 border rounded hover:bg-gray-50"
                    onClick={() => navigate(`/orders/${r.id}`)}
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-gray-500">No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
