import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { rpcGetClientOrders } from "@/lib/services/api";

export default function ClientDetail() {
  const { id } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await rpcGetClientOrders(id);
        setOrders(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Client Detail</h1>
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="text-sm text-gray-500">No orders for this client (or none visible for your role).</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full border rounded-xl text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2 border-b">Order</th>
                <th className="text-left p-2 border-b">Status</th>
                <th className="text-left p-2 border-b">Created</th>
                <th className="text-left p-2 border-b">Due</th>
                <th className="text-left p-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b">
                  <td className="p-2 font-medium">
                    {o.order_no || o.order_number || String(o.id).slice(0,8)}
                  </td>
                  <td className="p-2">{o.status || "—"}</td>
                  <td className="p-2">{o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}</td>
                  <td className="p-2">
                    {o.due_at ? new Date(o.due_at).toLocaleDateString()
                      : o.due_date ? new Date(o.due_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="p-2">
                    <a className="underline" href={`/orders/${o.id}`}>Open</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
