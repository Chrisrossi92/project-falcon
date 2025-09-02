// src/pages/clients/ClientProfile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import { Card } from "@/components/ui/Card.jsx";
import SectionHeader from "@/components/SectionHeader";

const PAGE_SIZE = 15;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtMoney = (n) =>
  n == null ? "—" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function StatusPill({ value }) {
  const v = String(value || "").toLowerCase();
  const cls =
    v === "active"
      ? "bg-green-50 text-green-700 border-green-200"
      : v === "inactive"
      ? "bg-gray-50 text-gray-700 border-gray-200"
      : "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {value || "—"}
    </span>
  );
}

export default function ClientProfile() {
  const p = useParams();
  // supports /clients/:clientId and /clients/:id routes
  const clientId = Number(p.clientId ?? p.id);

  const [client, setClient] = useState(null);
  const [loadingClient, setLoadingClient] = useState(true);

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [search, setSearch] = useState("");

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  useEffect(() => {
    (async () => {
      setLoadingClient(true);
      const { data, error } = await supabase
        .from("clients")
        .select("id,name,contact_name,contact_email,phone,is_archived,notes,status")
        .eq("id", clientId)
        .single();
      if (error) {
        setClient(null);
      } else {
        setClient(data || null);
      }
      setLoadingClient(false);
    })();
  }, [clientId]);

  useEffect(() => {
    (async () => {
      setLoadingOrders(true);

      // COUNT
      let qc = supabase.from("orders").select("id", { count: "exact", head: true }).eq("client_id", clientId);
      if (search) qc = qc.ilike("address", `%${search}%`);
      const { count: total } = await qc;
      setCount(total || 0);

      // PAGE ROWS — select only columns that exist broadly across your schema
      let q = supabase
        .from("orders")
        .select("id,order_no,address,property_type,status,fee_amount,date_ordered,due_date")
        .eq("client_id", clientId)
        .order("date_ordered", { ascending: false })
        .range(from, to);

      if (search) q = q.ilike("address", `%${search}%`);

      const { data, error } = await q;
      if (error) {
        console.error("ClientProfile orders error:", error);
        setRows([]);
      } else {
        setRows(data ?? []);
      }
      setLoadingOrders(false);
    })();
  }, [clientId, from, to, search]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)), [count]);

  if (!clientId) {
    return <div className="p-6 text-sm text-amber-700">Client not found.</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <SectionHeader
        title={client?.name || "Client"}
        subtitle={client ? (client.status ? `Status: ${client.status}` : "") : ""}
        right={<StatusPill value={client?.is_archived ? "inactive" : "active"} />}
      />

      {/* Client info card */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Info label="Contact Name" value={client?.contact_name} />
          <Info label="Contact Email" value={client?.contact_email} />
          <Info label="Phone" value={client?.phone} />
          <Info label="Status" value={client?.status} />
          <div className="sm:col-span-2">
            <Info label="Notes" value={client?.notes} />
          </div>
        </div>
      </Card>

      {/* Orders card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Orders</h3>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => {
                setPage(0);
                setSearch(e.target.value);
              }}
              placeholder="Search address…"
              className="border rounded px-2 py-1 text-sm"
            />
            <div className="text-sm text-muted-foreground">{count} total</div>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2 pr-2 w-[120px]">Order #</th>
                <th className="text-left py-2 pr-2">Address / Type</th>
                <th className="text-left py-2 pr-2 w-[120px]">Status</th>
                <th className="text-right py-2 pr-2 w-[100px]">Due</th>
                <th className="text-right py-2 pl-2 w-[100px]">Fee</th>
                <th className="text-right py-2 pl-2 w-[70px]"></th>
              </tr>
            </thead>
            <tbody>
              {loadingOrders ? (
                [...Array(PAGE_SIZE)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">
                      <div className="h-3 bg-muted rounded w-16" />
                    </td>
                    <td className="py-2">
                      <div className="h-3 bg-muted rounded w-64 mb-1" />
                      <div className="h-3 bg-muted rounded w-40" />
                    </td>
                    <td className="py-2">
                      <div className="h-3 bg-muted rounded w-24" />
                    </td>
                    <td className="py-2 text-right">
                      <div className="h-3 bg-muted rounded w-12 ml-auto" />
                    </td>
                    <td className="py-2 text-right">
                      <div className="h-3 bg-muted rounded w-16 ml-auto" />
                    </td>
                    <td></td>
                  </tr>
                ))
              ) : rows.length ? (
                rows.map((o) => (
                  <tr key={o.id} className="border-b">
                    <td className="py-2 pr-2">{o.order_no ?? o.order_number ?? "—"}</td>
                    <td className="py-2 pr-2">
                      <div className="font-medium">{o.address ?? "—"}</div>
                      <div className="text-muted-foreground">{o.property_type ?? "—"}</div>
                    </td>
                    <td className="py-2 pr-2">{o.status ?? "—"}</td>
                    <td className="py-2 pr-2 text-right">{fmtDate(o.due_date)}</td>
                    <td className="py-2 pl-2 text-right">{fmtMoney(o.fee_amount)}</td>
                    <td className="py-2 pl-2 text-right">
                      <Link className="text-blue-600 hover:underline text-sm" to={`/orders/${o.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No orders found for this client.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Simple pagination */}
        {count > PAGE_SIZE && (
          <div className="mt-3 flex items-center justify-between">
            <button
              className="px-2 py-1 rounded border text-sm disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              ‹ Prev
            </button>
            <div className="text-xs text-muted-foreground">
              Page <span className="font-medium">{page + 1}</span> / {totalPages}
            </div>
            <button
              className="px-2 py-1 rounded border text-sm disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page + 1 >= totalPages}
            >
              Next ›
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex items-baseline gap-2">
      <div className="text-xs text-gray-500 w-36">{label}</div>
      <div className="text-sm text-gray-900 break-words">{value ?? "—"}</div>
    </div>
  );
}





