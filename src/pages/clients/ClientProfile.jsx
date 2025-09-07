import React, { useEffect, useState } from "react";
import { getClient, listClientOrders, updateClient } from "@/lib/services/clientsService";
import { useParams } from "react-router-dom";

const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "—");

export default function ClientProfile() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true); setErr(null);
      try {
        const c = await getClient(id);
        setClient(c);
        const { rows } = await listClientOrders(id, { page: 0, pageSize: 50 });
        setOrders(rows);
      } catch (e) { setErr(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  return (
    <div className="p-4 space-y-4">
      {err && <div className="text-red-600 text-sm border rounded p-2">Error: {err.message}</div>}

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{client?.name ?? "Client"}</h1>
        {/* Optional: quick edit */}
        {/* <button className="border rounded px-2 py-1 text-sm" onClick={...}>Edit</button> */}
      </div>

      <div className="border rounded">
        <div className="px-3 py-2 border-b text-[13px] font-medium text-muted-foreground">Previous Orders</div>
        <div className="grid grid-cols-7 gap-2 px-3 py-2 text-[13px] font-medium text-muted-foreground border-b">
          <div>Order #</div>
          <div className="col-span-2">Address</div>
          <div>Status</div>
          <div>Site</div>
          <div>Review</div>
          <div>Final</div>
        </div>
        {orders.map((o) => (
          <div key={o.id} className="grid grid-cols-7 gap-2 px-3 py-2 border-b text-sm">
            <div className="font-medium">{o.order_no ?? o.id.slice(0,8)}</div>
            <div className="col-span-2 truncate">{o.address ?? "—"}</div>
            <div>{o.status ?? "—"}</div>
            <div>{fmt(o.site_visit_at)}</div>
            <div>{fmt(o.review_due_at)}</div>
            <div>{fmt(o.final_due_at)}</div>
          </div>
        ))}
        {!orders.length && <div className="px-3 py-3 text-sm text-muted-foreground">No orders yet.</div>}
      </div>
    </div>
  );
}






