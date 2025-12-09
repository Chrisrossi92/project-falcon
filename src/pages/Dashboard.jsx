import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";

// ---- Supabase init (expects VITE_SUPABASE_URL/ANON_KEY in .env) ----
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

// ---- Cards helpers -------------------------------------------------
async function getCounts() {
  const [{ count: total }, { count: inProg }] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),                                 // Total Orders (lifetime)
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "IN_PROGRESS"),     // In Progress
  ]);

  // Due-in buckets (assumes due_date column; adjust name if needed)
  // We count only non-completed orders for due-in metrics.
  const now = new Date();
  const addDays = (d) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + d).toISOString();

  const [{ count: d1 }, { count: d2 }, { count: d7 }] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true })
      .neq("status", "COMPLETE")
      .lte("due_date", addDays(1)),

    supabase.from("orders").select("*", { count: "exact", head: true })
      .neq("status", "COMPLETE")
      .lte("due_date", addDays(2)),

    supabase.from("orders").select("*", { count: "exact", head: true })
      .neq("status", "COMPLETE")
      .lte("due_date", addDays(7)),
  ]);

  return { total: total ?? 0, inProg: inProg ?? 0, due: { d1: d1 ?? 0, d2: d2 ?? 0, d7: d7 ?? 0 } };
}

// ---- Orders table fetch --------------------------------------------
async function fetchOrders({ page = 1, perPage = 25 }) {
  // Only ACTIVE orders show here; since you set all COMPLETE, this will be empty until new ones are added.
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const query = supabase
    .from("orders")
    .select("id, order_no, status, client_name, address, city, state, zip, property_type, report_type, fee, appraiser_name, review_due, final_due, due_date", { count: "exact" })
    .neq("status", "COMPLETE")
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

// ---- Pretty helpers ------------------------------------------------
function fmtMoney(n) { if (n == null) return "—"; return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }
function AddressCell({ address, city, state, zip }) {
  const top = address || "—";
  const bottom = [city, state, zip].filter(Boolean).join(", ") || "—";
  return (
    <div className="leading-tight">
      <div className="truncate">{top}</div>
      <div className="text-gray-500 truncate">{bottom}</div>
    </div>
  );
}
function PropReportCell({ property_type, report_type }) {
  const a = property_type || "—";
  const b = report_type || "—";
  return (
    <div className="leading-tight">
      <div className="truncate">{a}</div>
      <div className="text-gray-500 truncate">{b}</div>
    </div>
  );
}

// ---- Dashboard -----------------------------------------------------
export default function Dashboard() {
  const [counts, setCounts] = useState({ total: 0, inProg: 0, due: { d1: 0, d2: 0, d7: 0 } });
  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => { (async () => setCounts(await getCounts()))(); }, []);
  useEffect(() => { (async () => {
    const { rows, total } = await fetchOrders({ page, perPage: 25 });
    setOrders(rows); setTotalOrders(total);
  })(); }, [page]);

  const headerDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleString("en-US", { month: "long", year: "numeric" });
  }, []);

  return (
    <div className="px-6 pb-10">
      <h1 className="text-xl font-semibold mt-2">Admin Dashboard</h1>
      <p className="text-sm text-gray-500 mb-4">Calendar and queue</p>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card title="Total Orders" value={counts.total} />
        <Card title="In Progress" value={counts.inProg} />
        <DueInCard due={counts.due} />
      </div>

      {/* Calendar block */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
        {/* Header above calendar to reduce empty gap */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-base font-medium">{headerDate}</div>
          <div className="flex items-center gap-2 text-sm">
            {/* Tooling row mirrors FullCalendar controls but stays fixed */}
            <span className="px-2 py-1 border rounded-md bg-gray-50">2 weeks</span>
            <span className="px-2 py-1 border rounded-md">Month</span>
            <span className="px-2 py-1 border rounded-md">Week</span>
            <span className="px-2 py-1 border rounded-md">Day</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridTwoWeek"
            headerToolbar={{
              left: "prev",
              center: "title",
              right: "today next",
            }}
            // keep height stable so it never “drops” below the table
            height="auto"
            contentHeight="auto"
            dayMaxEventRows={3}
            views={{
              dayGridTwoWeek: { type: "dayGrid", duration: { weeks: 2 }, buttonText: "2 weeks" },
              dayGridMonth: { buttonText: "Month" },
              timeGridWeek: { buttonText: "Week" },
              timeGridDay: { buttonText: "Day" },
            }}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                <th>ORDER / STATUS</th>
                <th>CLIENT</th>
                <th className="w-64">ADDRESS</th>
                <th className="w-64">PROPERTY / REPORT TYPE</th>
                <th className="w-48">FEE / APPRAISER</th>
                <th className="w-56">DATES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">No orders.</td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium">{o.order_no || "—"}</div>
                    <div className="text-xs">
                      <StatusPill status={o.status} />
                    </div>
                  </td>
                  <td className="px-3 py-2">{o.client_name || "—"}</td>
                  <td className="px-3 py-2">
                    <AddressCell address={o.address} city={o.city} state={o.state} zip={o.zip} />
                  </td>
                  <td className="px-3 py-2">
                    <PropReportCell property_type={o.property_type} report_type={o.report_type} />
                  </td>
                  <td className="px-3 py-2">
                    <div>{fmtMoney(o.fee)}</div>
                    <div className="text-gray-500 text-xs">{o.appraiser_name || "—"}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-red-500">Rev: {o.review_due ? new Date(o.review_due).toLocaleDateString() : "—"}</div>
                    <div className="text-red-500">Final: {o.final_due ? new Date(o.final_due).toLocaleDateString() : "—"}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* simple pager placeholder */}
        <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500">
          <button className="px-2 py-1 border rounded-md" onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <div>Page {page} · {totalOrders} total</div>
          <button className="px-2 py-1 border rounded-md" onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>

      {/* Footer gives it that “finished product” feel */}
      <footer className="mt-10 border-t border-gray-200 py-4 text-sm text-center text-gray-500">
        © {new Date().getFullYear()} Continental Real Estate Solutions · Falcon MVP
      </footer>
    </div>
  );
}

// ---- Small UI bits -------------------------------------------------
function Card({ title, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function DueInCard({ due }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
      <div className="text-sm text-gray-500 mb-2">Due In</div>
      <div className="grid grid-cols-3 gap-2">
        <Mini number={due.d1} label="1 Day" />
        <Mini number={due.d2} label="2 Days" />
        <Mini number={due.d7} label="7 Days" />
      </div>
    </div>
  );
}
function Mini({ number, label }) {
  return (
    <div className="text-center border rounded-lg py-2">
      <div className="text-lg font-semibold">{number}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
function StatusPill({ status }) {
  const map = {
    NEW: "bg-blue-50 text-blue-700 border-blue-200",
    IN_PROGRESS: "bg-yellow-50 text-yellow-700 border-yellow-200",
    COMPLETE: "bg-green-50 text-green-700 border-green-200",
    CANCELLED: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span className={`inline-block px-2 py-0.5 mt-1 rounded-full border text-[10px] ${map[status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
      {status || "—"}
    </span>
  );
}



