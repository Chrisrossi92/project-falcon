// src/components/orders/MyOrdersCard.jsx
import React, { useEffect, useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { useNavigate } from "react-router-dom";
import { fetchOrdersList } from "@/lib/services/ordersService";

function fmt(dt) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString(); } catch { return "—"; }
}

export default function MyOrdersCard() {
  const { user } = useSession();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setErr(null);
        const all = await fetchOrdersList(); // service = single SSOT
        const mine = (all || [])
          .filter(r => String(r.appraiser_id || "") === String(user?.id || ""))
          .filter(r => r.is_archived !== true)
          .sort((a,b) => new Date(a.final_due_at||0) - new Date(b.final_due_at||0));
        if (!cancelled) setRows(mine);
      } catch (e) {
        if (!cancelled) { setErr(e?.message || String(e)); setRows([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <div className="bg-white rounded-2xl shadow border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">My Orders</div>
      </div>
      {loading ? (
        <div>Loading…</div>
      ) : err ? (
        <div className="text-red-600">Failed: {err}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2 pr-3">Order #</th>
                <th className="py-2 pr-3">Client</th>
                <th className="py-2 pr-3">Address</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Site Visit</th>
                <th className="py-2 pr-3">Due (Client)</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="py-2 pr-3">{r.order_number || r.id.slice(0,8)}</td>
                  <td className="py-2 pr-3">{r.client_name || "—"}</td>
                  <td className="py-2 pr-3">
                    {(r.property_address || r.address || "—")}
                    {r.city ? `, ${r.city}` : ""}{r.state ? `, ${r.state}` : ""}{r.postal_code ? ` ${r.postal_code}` : ""}
                  </td>
                  <td className="py-2 pr-3">{r.status || "—"}</td>
                  <td className="py-2 pr-3">{fmt(r.site_visit_at)}</td>
                  <td className="py-2 pr-3">{fmt(r.final_due_at)}</td>
                  <td className="py-2 pr-3">
                    <button className="px-2 py-1 border rounded hover:bg-gray-50"
                      onClick={() => navigate(`/orders/${r.id}`)}>
                      Details
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-gray-500">No orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


