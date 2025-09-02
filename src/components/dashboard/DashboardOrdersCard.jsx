import React, { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { Card } from "@/components/ui/Card.jsx";
import { Link } from "react-router-dom";

const PAGE_SIZE = 10;

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString();
}
function fmtMoney(n) {
  if (n == null) return "—";
  const num = Number(n);
  return Number.isNaN(num) ? "—" : num.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function DashboardOrdersCard({ className = "", style }) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  async function load() {
    setLoading(true);

    const { count: total } = await supabase
      .from("v_orders_frontend")
      .select("*", { count: "exact", head: true })
      .neq("status", "Completed");

    setCount(total || 0);

    const { data, error } = await supabase
      .from("v_orders_frontend")
      .select("id,order_no,display_title,display_subtitle,client_name,status,due_date,fee_amount,date_ordered")
      .neq("status", "Completed")
      .order("date_ordered", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("DashboardOrdersCard load error:", error);
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)), [count]);

  return (
    <Card className={`p-4 flex flex-col h-full overflow-hidden ${className}`} style={style}>
      <div className="flex items-center justify-between pb-2">
        <h3 className="font-semibold">Orders</h3>
        <div className="text-sm text-muted-foreground">{count} active</div>
      </div>

      <div className="flex-1 overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead className="text-xs text-muted-foreground border-b">
            <tr>
              <th className="text-left py-2 pr-2 w-[120px]">Order #</th>
              <th className="text-left py-2 pr-2">Client / Address</th>
              <th className="text-left py-2 pr-2 w-[140px]">Status</th>
              <th className="text-right py-2 pr-2 w-[90px]">Due</th>
              <th className="text-right py-2 pl-2 w-[100px]">Fee</th>
            </tr>
          </thead>
          <tbody className="align-top">
            {loading
              ? [...Array(PAGE_SIZE)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2"><div className="h-3 bg-muted rounded w-20" /></td>
                    <td className="py-2"><div className="h-3 bg-muted rounded w-64 mb-1" /><div className="h-3 bg-muted rounded w-40" /></td>
                    <td className="py-2"><div className="h-3 bg-muted rounded w-24" /></td>
                    <td className="py-2 text-right"><div className="h-3 bg-muted rounded w-12 ml-auto" /></td>
                    <td className="py-2 text-right"><div className="h-3 bg-muted rounded w-16 ml-auto" /></td>
                  </tr>
                ))
              : rows.map((o) => (
                  <tr key={o.id} className="border-b">
                    <td className="py-2 pr-2">
                      <Link to={`/orders/${o.id}`} className="text-blue-600 hover:underline">
                        {o.order_no ?? o.order_number ?? "—"}
                      </Link>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="font-medium">{o.client_name ?? "—"}</div>
                      <div className="text-muted-foreground">{o.display_subtitle ?? o.address ?? "—"}</div>
                    </td>
                    <td className="py-2 pr-2">{o.status ?? "—"}</td>
                    <td className="py-2 pr-2 text-right">{fmtDate(o.due_date)}</td>
                    <td className="py-2 pl-2 text-right">{fmtMoney(o.fee_amount)}</td>
                  </tr>
                ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">No active orders.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-2 flex items-center justify-between">
        <button className="px-2 py-1 rounded border text-sm disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}>‹ Prev</button>
        <div className="text-xs text-muted-foreground">
          Page <span className="font-medium">{page + 1}</span> / {totalPages}
        </div>
        <button className="px-2 py-1 rounded border text-sm disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page + 1 >= totalPages || loading}>Next ›</button>
      </div>
    </Card>
  );
}

