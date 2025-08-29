// src/pages/Orders.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useOrders } from "@/lib/hooks/useOrders";
import { useRole } from "@/lib/hooks/useRole";
import { exportCsv } from "@/lib/utils/csv";
import ListTemplate from "@/templates/ListTemplate";
import LoadingBlock from "@/components/ui/LoadingBlock";
import ErrorCallout from "@/components/ui/ErrorCallout";
import EmptyState from "@/components/ui/EmptyState";

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
            {o.client_name || "—"}{" "}
            {o.status ? `• ${String(o.status).replaceAll("_", " ")}` : ""}
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

function parseParamDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export default function OrdersPage() {
  // initialize from URL params so KPI links can pre-filter
  const location = useLocation();
  const sp = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [search, setSearch] = useState(sp.get("q") || "");
  const [status, setStatus] = useState(sp.get("status") || "");
  const [since, setSince] = useState(parseParamDate(sp.get("since")));
  const [until, setUntil] = useState(parseParamDate(sp.get("until")));

  // if URL changes (navigating from a KPI card), sync the local filter state
  useEffect(() => {
    setSearch(sp.get("q") || "");
    setStatus(sp.get("status") || "");
    setSince(parseParamDate(sp.get("since")));
    setUntil(parseParamDate(sp.get("until")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  const { isAdmin, isReviewer } = useRole() || {};

  const opts = useMemo(
    () => ({ search, status, since, until }),
    [search, status, since, until]
  );

  const { data, loading, error } = useOrders(opts);
  const rows = useMemo(() => data || [], [data]);

  const toolbar = (
    <>
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
      {(isAdmin || isReviewer) && (
        <button
          className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
          onClick={() =>
            exportCsv(
              `orders_${new Date().toISOString().slice(0, 10)}.csv`,
              rows,
              [
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
                  accessor: (r) =>
                    r.due_date ? new Date(r.due_date).toISOString() : "",
                },
                { key: "appraiser_name", header: "Appraiser" },
                { key: "reviewer_name", header: "Reviewer" },
                {
                  key: "last_activity_at",
                  header: "Last Activity",
                  accessor: (r) =>
                    r.last_activity_at ? new Date(r.last_activity_at).toISOString() : "",
                },
              ]
            )
          }
          disabled={loading || rows.length === 0}
          title="Export current list to CSV"
        >
          Export CSV
        </button>
      )}
    </>
  );

  return (
    <ListTemplate
      title="Orders"
      subtitle={
        loading ? "Loading…" : error ? undefined : "Browse orders you’re allowed to see."
      }
      toolbar={<div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
    >
      {error && <ErrorCallout>Failed to load orders: {error.message}</ErrorCallout>}
      {loading && <LoadingBlock />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState hint="Try adjusting filters." />
      )}
      {!loading && !error && rows.length > 0 && (
        <div className="grid gap-2">{rows.map((o) => <Row key={o.id} o={o} />)}</div>
      )}
    </ListTemplate>
  );
}





























