// src/pages/clients/ClientProfile.jsx  (replace the file content with this block or just the "Orders" card)
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import { Card } from "@/components/ui/Card";

const PAGE_SIZE = 15;
const fmtDate = d => (d ? new Date(d).toLocaleDateString() : "—");
const fmtMoney = n => (n == null ? "—" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }));

export default function ClientProfile() {
  const p = useParams();
  const clientId = Number(p.clientId ?? p.id);   // <- works for /clients/:clientId or /clients/:id

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
      const { data } = await supabase.from("clients").select("id,name,contact_name,contact_email,phone,is_archived,notes").eq("id", clientId).single();
      setClient(data || null);
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

      // PAGE ROWS
      let q = supabase
        .from("orders")
        .select("id,external_order_no,address,property_type,status,fee_amount,date_ordered,due_for_review,due_to_client")
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

  if (!clientId || !client) return <div className="p-6">Client not found.</div>;

  return (
    <div className="p-4 space-y-4">
      <Card className="p-4">
        <h2 className="text-lg font-semibold">{client.name}</h2>
        <div className="text-sm text-muted-foreground">{client.is_archived ? "archived" : "active"}</div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between border-t pt-2"><span className="text-muted-foreground">CONTACT NAME</span><span>{client.contact_name || "—"}</span></div>
          <div className="flex items-center justify-between border-t pt-2"><span className="text-muted-foreground">CONTACT EMAIL</span><span>{client.contact_email || "—"}</span></div>
          <div className="flex items-center justify-between border-t pt-2"><span className="text-muted-foreground">PHONE</span><span>{client.phone || "—"}</span></div>
          <div className="flex items-center justify-between border-t pt-2"><span className="text-muted-foreground">STATUS</span><span>{client.is_archived ? "archived" : "active"}</span></div>
          <div className="flex items-center justify-between border-t pt-2"><span className="text-muted-foreground">NOTES</span><span>{client.notes || "—"}</span></div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Orders</h3>
          <div className="flex items-center gap-2">
            <input value={search} onChange={(e)=>{setPage(0);setSearch(e.target.value);}} placeholder="Search address…" className="border rounded px-2 py-1 text-sm" />
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
                  <tr key={i} className="border-b"><td className="py-2"><div className="h-3 bg-muted rounded w-16" /></td><td className="py-2"><div className="h-3 bg-muted rounded w-64 mb-1" /><div className="h-3 bg-muted rounded w-40" /></td><td className="py-2"><div className="h-3 bg-muted rounded w-24" /></td><td className="py-2 text-right"><div className="h-3 bg-muted rounded w-12 ml-auto" /></td><td className="py-2 text-right"><div className="h-3 bg-muted rounded w-16 ml-auto" /></td><td></td></tr>
                ))
              ) : rows.length ? (
                rows.map((o) => (
                  <tr key={o.id} className="border-b">
                    <td className="py-2 pr-2">{o.external_order_no || "—"}</td>
                    <td className="py-2 pr-2">
                      <div className="font-medium">{o.address || "—"}</div>
                      <div className="text-muted-foreground">{o.property_type || "—"}</div>
                    </td>
                    <td className="py-2 pr-2">{o.status || "—"}</td>
                    <td className="py-2 pr-2 text-right">{fmtDate(o.due_to_client || o.due_for_review)}</td>
                    <td className="py-2 pl-2 text-right">{fmtMoney(o.fee_amount)}</td>
                    <td className="py-2 pl-2 text-right">
                      <Link to={`/orders/${o.id}`} className="text-blue-600 hover:underline">Open</Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-3 flex items-center justify-between">
          <button className="px-2 py-1 rounded border text-sm disabled:opacity-40" onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0 || loadingOrders}>‹ Prev</button>
          <div className="text-xs text-muted-foreground">Page <span className="font-medium">{page+1}</span> / {totalPages}</div>
          <button className="px-2 py-1 rounded border text-sm disabled:opacity-40" onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page+1 >= totalPages || loadingOrders}>Next ›</button>
        </div>
      </Card>
    </div>
  );
}




