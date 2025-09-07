import React, { useEffect, useState } from "react";
import { listClients } from "@/lib/services/clientsService";
import { useRole } from "@/lib/hooks/useRole";
import { useSession } from "@/lib/hooks/useSession";
import { Link } from "react-router-dom";

export default function ClientsPage() {
  const { user } = useSession();
  const { isAdmin, isReviewer } = useRole() || {};
  const mineOnly = !(isAdmin || isReviewer);
  const userId = user?.id || user?.user_id || user?.uid || null;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setErr(null);
      try {
        const { rows } = await listClients({
          orderBy: "orders_count",
          descending: true, // biggest first
          mineOnly,
          userId,
        });
        setRows(rows);
      } catch (e) { setErr(e); }
      finally { setLoading(false); }
    })();
  }, [mineOnly, userId]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Clients</h1>

      {err && <div className="text-red-600 text-sm mb-2">Failed to load clients: {err.message}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="border rounded overflow-hidden">
          <div className="grid grid-cols-4 gap-2 px-3 py-2 text-[13px] font-medium text-muted-foreground border-b">
            <div>Client</div>
            <div>Orders</div>
            <div>Last Order</div>
            <div>Total Base Fee</div>
          </div>
          {rows.map((c) => (
            <Link
              key={c.id}
              to={`/clients/${c.id}`}
              className="grid grid-cols-4 gap-2 px-3 py-2 border-b hover:bg-muted/50 text-sm"
            >
              <div className="font-medium">{c.name}</div>
              <div>{c.orders_count}</div>
              <div>{c.last_ordered_at ? new Date(c.last_ordered_at).toLocaleDateString() : "—"}</div>
              <div>{typeof c.total_base_fee === "number" ? c.total_base_fee.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—"}</div>
            </Link>
          ))}
          {rows.length === 0 && <div className="px-3 py-3 text-sm text-muted-foreground">No clients.</div>}
        </div>
      )}
    </div>
  );
}














