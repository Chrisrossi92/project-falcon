import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import { Card } from "@/components/ui/Card.jsx";

const PAGE_SIZE = 15;

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString();
}
function fmtMoney(n) {
  if (n == null) return "—";
  const num = Number(n);
  return Number.isNaN(num)
    ? "—"
    : num.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function ClientOrdersPanel({ clientId }) {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fromIdx = page * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;

  useEffect(() => {
    (async () => {
      setLoading(true);

      // count
      let qc = supabase
        .from("v_orders_frontend")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId);

      if (search) {
        const s = `%${search}%`;
        qc = qc.or(`order_no.ilike.${s},display_title.ilike.${s},display_subtitle.ilike.${s}`);
      }
      const { count: total } = await qc;
      setCount(total || 0);

      // page rows
      let q = supabase.from("v_orders_frontend_v3")
        .select(`
          id,
          order_no,
          display_title,
          display_subtitle,
          status,
          due_date,
          fee_amount,
          date_ordered
        `)
        .eq("client_id", clientId)
        .order("date_ordered", { ascending: false })
        .range(fromIdx, toIdx);

      if (search) {
        const s = `%${search}%`;
        q = q.or(`order_no.ilike.${s},display_title.ilike.${s},display_subtitle.ilike.${s}`);
      }

      const { data, error } = await q;
      if (error) {
        console.error("ClientOrdersPanel load error:", error);
        setRows([]);
      } else {
        setRows(data ?? []);
      }
      setLoading(false);
    })();
  }, [clientId, page, search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)),
    [count]
  );

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Orders</h3>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => { setPage(0); setSearch(e.target.value); }}
            placeholder="Search order # / address"
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
              <th className="text-left py-2 pr-2 w-[140px]">Status</th>
              <th className="text-right py-2 pr-2 w-[100px]">Due</th>
              <th className="text-right py-2 pl-2 w-[100px]">Fee</th>
              <th className="text-right py-2 pl-2 w-[70px]"></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(PAGE_SIZE)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2"><div className="h-3 bg-muted rounded w-16" /></td>
                    <td className="py-2">
                      <div className="h-3 bg-muted rounded w-64 mb-1" />
                      <div className="h-3 bg-muted rounded w-40" />
                    </td>
                    <td className="py-2"><div className="h-3 bg-muted rounded w-24" /></td>
                    <td className="py-2 text-right"><div className="h-3 bg-muted rounded w-12 ml-auto" /></td>
                    <td className="py-2 text-right"><div className="h-3 bg-muted rounded w-16 ml-auto" /></td>
                    <td></td>
                  </tr>
                ))
              : rows.map((o) => (
                  <tr key={o.id} className="border-b">
                    <td className="py-2 pr-2">{o.order_no ?? "—"}</td>
                    <td className="py-2 pr-2">
                      <div className="font-medium">{o.display_subtitle ?? "—"}</div>
                    </td>
                    <td className="py-2 pr-2">{o.status ?? "—"}</td>
                    <td className="py-2 pr-2 text-right">{fmtDate(o.due_date)}</td>
                    <td className="py-2 pl-2 text-right">{fmtMoney(o.fee_amount)}</td>
                    <td className="py-2 pl-2 text-right">
                      <Link to={`/orders/${o.id}`} className="text-blue-600 hover:underline">Open</Link>
                    </td>
                  </tr>
                ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">No orders yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-3 flex items-center justify-between">
        <button
          className="px-2 py-1 rounded border text-sm disabled:opacity-40"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0 || loading}
        >
          ‹ Prev
        </button>
        <div className="text-xs text-muted-foreground">
          Page <span className="font-medium">{page + 1}</span> / {totalPages}
        </div>
        <button
          className="px-2 py-1 rounded border text-sm disabled:opacity-40"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page + 1 >= totalPages || loading}
        >
          Next ›
        </button>
      </div>
    </Card>
  );
}

