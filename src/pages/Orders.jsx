// src/pages/Orders.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useOrders } from "@/lib/hooks/useOrders";
import { useRole } from "@/lib/hooks/useRole";
import { exportCsv } from "@/lib/utils/csv";

const STATUS_OPTIONS = [
  { v: "", label: "All" },
  { v: "in_review", label: "In Review" },
  { v: "revisions", label: "Revisions" },
  { v: "ready_to_send", label: "Ready to Send" },
  { v: "complete", label: "Complete" },
];

function Row({ o }) {
  const title = o.title || o.address || "Order";
  return (
    <Link
      to={`/orders/${o.id}`}
      className="block rounded-lg border hover:border-gray-300 bg-white p-3"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="truncate font-medium">
            {o.order_number ? `#${o.order_number}` : "—"} • {title}
          </div>
          <div className="text-xs text-gray-500">
            {o.client_name || "—"} {o.status ? `• ${String(o.status).replaceAll("_", " ")}` : ""}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {o.final_due_date
            ? new Date(o.final_due_date).toLocaleDateString()
            : o.due_date
            ? new Date(o.due_date).toLocaleDateString()
            : ""}
        </div>
      </div>
    </Link>
  );
}

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [since, setSince] = useState(null); // Due date >= since
  const [until, setUntil] = useState(null); // Due date <= until
  const { isAdmin, isReviewer } = useRole() || {};

  const opts = useMemo(
    () => ({ search, status, since, until }),
    [search, status, since, until]
  );
  const { data, loading, error } = useOrders(opts);

  const rows = useMemo(() => data || [], [data]);

  function handleExport() {
    const cols = [
      { key: "id", header: "ID" },
      { key: "order_number", header: "Order #" },
      { key: "title", header: "Title", accessor: (r) => r.title || "" },
      { key: "address", header: "Address" },
      { key: "client_name", header: "Client" },
      { key: "status", header: "Status" },
      {
        key: "site_visit_date",
        header: "Site Visit",
        accessor: (r) =>
          r.site_visit_date ? new Date(r.site_visit_date).toISOString() : "",
      },
      {
        key: "review_due_date",
        header: "Review Due",
        accessor: (r) =>
          r.review_due_date ? new Date(r.review_due_date).toISOString() : "",
      },
      {
        key: "final_due_date",
        header: "Final Due",
        accessor: (r) =>
          r.final_due_date ? new Date(r.final_due_date).toISOString() : "",
      },
      {
        key: "due_date",
        header: "Global Due",
        accessor: (r) => (r.due_date ? new Date(r.due_date).toISOString() : ""),
      },
      { key: "appraiser_name", header: "Appraiser" },
      { key: "reviewer_name", header: "Reviewer" },
      {
        key: "last_activity_at",
        header: "Last Activity",
        accessor: (r) =>
          r.last_activity_at ? new Date(r.last_activity_at).toISOString() : "",
      },
    ];
    exportCsv(
      `orders_${new Date().toISOString().slice(0, 10)}.csv`,
      rows,
      cols
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Orders</h1>
          <p className="text-sm text-gray-600">
            {loading ? "Loading…" : error ? `Error: ${error.message}` : "Browse orders you’re allowed to see."}
          </p>
        </div>

        {(isAdmin || isReviewer) && (
          <button
            className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
            onClick={handleExport}
            disabled={loading || (rows?.length ?? 0) === 0}
            title="Export current list to CSV"
          >
            Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search address / order # / client…"
          className="w-72 rounded-md border px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border px-2 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.v} value={o.v}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Date range (Due Date) */}
        <div className="flex items-center gap-2">
          <DatePicker
            selected={since}
            onChange={setSince}
            placeholderText="Due from…"
            className="w-40 rounded-md border px-2 py-2 text-sm"
            isClearable
          />
          <span className="text-xs text-gray-500">to</span>
          <DatePicker
            selected={until}
            onChange={setUntil}
            placeholderText="Due to…"
            className="w-40 rounded-md border px-2 py-2 text-sm"
            isClearable
          />
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="min-h-[20vh] flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-600">
            <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Failed to load orders: {error.message || "Unknown error"}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-2">
          {rows.length === 0 ? (
            <div className="rounded-lg border bg-white p-4 text-sm text-gray-500">
              No orders found.
            </div>
          ) : (
            rows.map((o) => <Row key={o.id} o={o} />)
          )}
        </div>
      )}
    </div>
  );
}



























