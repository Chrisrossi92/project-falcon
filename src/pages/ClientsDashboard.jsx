// src/pages/ClientsDashboard.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useClients } from "@/lib/hooks/useClients";
import { useRole } from "@/lib/hooks/useRole";

const STATUS_OPTIONS = [
  { v: "", label: "All" },
  { v: "active", label: "Active" },
  { v: "inactive", label: "Inactive" },
];

function Card({ c }) {
  return (
    <Link
      to={`/clients/${c.id}`}
      className="block rounded-lg border hover:border-gray-300 bg-white p-3"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="truncate font-medium">{c.name || "Client"}</div>
          <div className="text-xs text-gray-500">
            {c.contact_name || "—"} {c.contact_email ? `• ${c.contact_email}` : ""}
          </div>
        </div>
        <div className="text-xs text-gray-500">{c.status || ""}</div>
      </div>
    </Link>
  );
}

export default function ClientsDashboard() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const { isAdmin } = useRole() || {};

  const opts = useMemo(() => ({ search, status }), [search, status]);
  const { data, loading, error } = useClients(opts);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Clients</h1>
          <p className="text-sm text-gray-600">
            {loading ? "Loading…" : error ? `Error: ${error.message}` : "Your client list"}
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/clients/new"
            className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
          >
            New Client
          </Link>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / contact / email…"
          className="w-72 rounded-md border px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border px-2 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.v} value={o.v}>{o.label}</option>
          ))}
        </select>
      </div>

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
          Failed to load clients: {error.message || "Unknown error"}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.length === 0 ? (
            <div className="rounded-lg border bg-white p-4 text-sm text-gray-500">No clients found.</div>
          ) : (
            data.map((c) => <Card key={c.id} c={c} />)
          )}
        </div>
      )}
    </div>
  );
}












