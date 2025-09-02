// src/pages/ClientsDashboard.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useClients } from "@/lib/hooks/useClients";
import { useRole } from "@/lib/hooks/useRole";
import SectionHeader from "@/components/SectionHeader";
import { toCsv, downloadCsv } from "@/lib/utils/csv";

const STATUS_OPTIONS = [
  { v: "", label: "All" },
  { v: "active", label: "Active" },
  { v: "inactive", label: "Inactive" },
];

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

function Card({ c }) {
  const contactLine = [c.contact_name || "—", c.contact_email || ""].filter(Boolean).join(" • ");
  return (
    <Link
      to={`/clients/${c.id}`}
      className="block rounded-xl border hover:border-gray-300 bg-white p-3 shadow-sm transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{c.name || "Client"}</div>
          <div className="text-xs text-gray-500 truncate">{contactLine}</div>
        </div>
        <StatusPill value={c.status} />
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

  async function onExportCsv() {
    // If your hook already supports large pages, call a service here instead
    const rows = data || [];
    const cols = [
      { header: "Client", accessor: (r) => r.name ?? "" },
      { header: "Status", accessor: (r) => r.status ?? "" },
      { header: "Contact Name", accessor: (r) => r.contact_name ?? "" },
      { header: "Contact Email", accessor: (r) => r.contact_email ?? "" },
      { header: "Phone", accessor: (r) => r.phone ?? "" },
    ];
    downloadCsv({ filename: "clients.csv", data: toCsv(rows, cols) });
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Clients"
        subtitle={loading ? "Loading…" : error ? `Error: ${error.message}` : "Your client list"}
        right={
          <div className="flex items-center gap-2">
            <button className="border rounded px-3 py-1 text-sm" onClick={onExportCsv}>
              Export CSV
            </button>
            {isAdmin && (
              <Link to="/clients/new" className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50">
                New Client
              </Link>
            )}
          </div>
        }
      />

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
            <option key={o.v} value={o.v}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="min-h-[20vh] grid place-items-center text-gray-600 text-sm">Loading…</div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Failed to load clients: {error.message || "Unknown error"}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.length === 0 ? (
            <div className="rounded-lg border bg-white p-4 text-sm text-gray-500">
              No clients found.
            </div>
          ) : (
            data.map((c) => <Card key={c.id} c={c} />)
          )}
        </div>
      )}
    </div>
  );
}













