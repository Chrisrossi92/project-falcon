import { useEffect, useState } from "react";
import { getClientManagementDetail } from "@/features/clients/clientManagementApi";
import { listClientOrders } from "@/lib/services/clientsService";
import { useParams } from "react-router-dom";

const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "—");

export default function ClientProfile() {
  const { id, clientId } = useParams();
  const resolvedClientId = clientId || id;
  const [client, setClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      setErr(null);
      try {
        const c = await getClientManagementDetail(resolvedClientId);
        setClient(c);
        const { rows } = await listClientOrders(resolvedClientId, { page: 0, pageSize: 50 });
        setOrders(rows);
      } catch (e) { setErr(e); }
    })();
  }, [resolvedClientId]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      {err && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          Error: {err.message}
        </div>
      )}

      <header className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Legacy Client Profile
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          {client?.name ?? "Client"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Read-only compatibility view for client order history.
        </p>
      </header>

      <section
        aria-labelledby="legacy-client-orders-heading"
        className="rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 px-4 py-3">
          <h2
            id="legacy-client-orders-heading"
            className="text-base font-semibold text-slate-950"
          >
            Previous Orders
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Orders available through the legacy client profile read path.
          </p>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[44rem]">
            <div className="grid grid-cols-7 gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <div>Order #</div>
              <div className="col-span-2">Address</div>
              <div>Status</div>
              <div>Site</div>
              <div>Review</div>
              <div>Final</div>
            </div>
            {orders.map((o) => (
              <div
                key={o.id}
                className="grid grid-cols-7 gap-2 border-b border-slate-100 px-4 py-2 text-sm last:border-0"
              >
                <div className="font-medium">{o.order_no ?? o.id.slice(0, 8)}</div>
                <div className="col-span-2 truncate">{o.address ?? "—"}</div>
                <div>{o.status ?? "—"}</div>
                <div>{fmt(o.site_visit_at)}</div>
                <div>{fmt(o.review_due_at)}</div>
                <div>{fmt(o.final_due_at)}</div>
              </div>
            ))}
          </div>
        </div>
        {!orders.length && (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No orders yet.
          </div>
        )}
      </section>
    </div>
  );
}


