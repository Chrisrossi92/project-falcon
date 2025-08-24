import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { useSession } from "@/lib/hooks/useSession";
import { useNavigate } from "react-router-dom";

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
      setLoading(true); setErr(null);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, order_number, status,
          property_address, address, city, state, postal_code,
          site_visit_at, final_due_at,
          client:client_id ( name )
        `)
        .eq("appraiser_id", user?.id || "00000000-0000-0000-0000-000000000000")
        .eq("is_archived", false)
        .order("final_due_at", { ascending: true })
        .limit(1000);
      if (cancelled) return;
      if (error) { setErr(error.message); setRows([]); setLoading(false); return; }
      setRows(data || []);
      setLoading(false);
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
                  <td className="py-2 pr-3">{r.client?.name || "—"}</td>
                  <td className="py-2 pr-3">
                    {(r.property_address || r.address || "—")}{r.city ? `, ${r.city}` : ""}{r.state ? `, ${r.state}` : ""}{r.postal_code ? ` ${r.postal_code}` : ""}
                  </td>
                  <td className="py-2 pr-3">{r.status || "—"}</td>
                  <td className="py-2 pr-3">{fmt(r.site_visit_at)}</td>
                  <td className="py-2 pr-3">{fmt(r.final_due_at)}</td>
                  <td className="py-2 pr-3">
                    <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={() => navigate(`/orders/${r.id}`)}>
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
