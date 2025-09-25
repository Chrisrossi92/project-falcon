import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import supabase from "@/lib/supabaseClient";
import ClientForm from "@/components/clients/ClientForm";
import { getClient, listClientOrders, updateClient } from "@/lib/services/clientsService";

// helpers
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const money0 = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";

function Badge({ children, tone = "slate" }) {
  const map = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded border ${map[tone] || map.slate}`}>
      {children}
    </span>
  );
}

function inferCategory(c = {}) {
  const t = (c.type || c.client_type || c.category || c.kind || "").toString().toLowerCase();
  if (t.includes("amc")) return "amc";
  if (t.includes("lender")) return "lender";
  const name = (c.name || "").toLowerCase();
  if (/\b(amc|appraisal management)\b/.test(name)) return "amc";
  if (/\b(bank|credit union|mortgage|finance|financial|banc|bancorp|savings|loan)\b/.test(name)) return "lender";
  return "client";
}

export default function ClientDetail() {
  const { id } = useParams();

  const [client, setClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const c = await getClient(id);
        setClient(c || null);
        const { rows } = await listClientOrders(id, { page: 0, pageSize: 50 });
        setOrders(rows || []);
      } catch (e) {
        setErr(e);
        setClient(null);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleSave(patch) {
    try {
      const updated = await updateClient(id, patch);
      setClient(updated);
      setEditing(false);
      toast.success("Client saved");
    } catch (e) {
      toast.error(e?.message || "Failed to save client");
    }
  }

  // ---------- UI ----------
  if (loading) return null;

  if (err) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-sm text-red-600 border rounded p-2">Error: {err.message}</div>
        <Link to="/clients" className="inline-block text-sm px-3 py-1.5 border rounded hover:bg-gray-50">
          ← Back to Clients
        </Link>
      </div>
    );
  }

  if (!client) {
    // If somehow the client row is missing, let user create one right here with ClientForm
    return (
      <div className="max-w-3xl mx-auto space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">New Client</h1>
          <Link className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50" to="/clients">
            Cancel
          </Link>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <ClientForm onSubmit={handleSave} submitLabel="Create Client" />
        </div>
      </div>
    );
  }

  const cat = inferCategory(client);
  const badge =
    cat === "amc" ? <Badge tone="indigo">AMC</Badge> : cat === "lender" ? <Badge tone="emerald">Lender</Badge> : <Badge>Client</Badge>;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold truncate">{client.name || "Client"}</h1>
              {badge}
            </div>
            <div className="text-xs text-gray-500">
              Created {fmtDate(client.created_at)} • Updated {fmtDate(client.updated_at)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/clients" className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">← Back</Link>
            {!editing && (
              <button className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50" onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info / Edit */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-5">
          <div className="bg-white border rounded-xl p-4">
            <div className="text-sm font-medium mb-2">Client Info</div>

            {editing ? (
              <ClientForm initial={client} onSubmit={handleSave} submitLabel="Save Changes" />
            ) : (
              <dl className="text-sm space-y-2">
                <div className="flex justify-between"><dt className="text-gray-500">Name</dt><dd className="text-gray-800">{client.name || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Primary Contact</dt><dd className="text-gray-800">{client.contact_name || client.primary_contact || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd className="text-gray-800">{client.email || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd className="text-gray-800">{client.phone || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Type</dt><dd className="text-gray-800">{client.type || client.client_type || client.category || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd className="text-gray-800">{client.status || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Avg Fee</dt><dd className="text-gray-800">{money0(client.avg_base_fee)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Total Orders</dt><dd className="text-gray-800">{client.orders_count ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Last Order</dt><dd className="text-gray-800">{fmtDate(client.last_ordered_at)}</dd></div>
              </dl>
            )}
          </div>
        </div>

        {/* Orders summary */}
        <div className="col-span-12 lg:col-span-7">
          <div className="bg-white border rounded-xl p-4">
            <div className="text-sm font-medium mb-2">Previous Orders</div>

            {orders.length === 0 ? (
              <div className="px-2 py-3 text-sm text-gray-500">
                No orders for this client (or none visible for your role).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full text-sm border rounded">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-2 border-b">Order #</th>
                      <th className="text-left p-2 border-b">Address</th>
                      <th className="text-left p-2 border-b">Status</th>
                      <th className="text-left p-2 border-b">Site</th>
                      <th className="text-left p-2 border-b">Review</th>
                      <th className="text-left p-2 border-b">Final</th>
                      <th className="text-left p-2 border-b">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const title = o.order_no || o.order_number || String(o.id).slice(0, 8);
                      const addr = o.address || o.property_address || "—";
                      return (
                        <tr key={o.id} className="border-b">
                          <td className="p-2 font-medium">{title}</td>
                          <td className="p-2 truncate max-w-[280px]">{addr}</td>
                          <td className="p-2">{o.status || "—"}</td>
                          <td className="p-2">{fmtDate(o.site_visit_at)}</td>
                          <td className="p-2">{fmtDate(o.review_due_at)}</td>
                          <td className="p-2">{fmtDate(o.final_due_at)}</td>
                          <td className="p-2">
                            <Link className="underline" to={`/orders/${o.id || o.order_number}`}>Open</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
