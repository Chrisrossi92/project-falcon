// src/components/clients/ClientCard.jsx
import React from "react";
import { Link } from "react-router-dom";

const toneFor = (cat) => {
  switch ((cat || "").toLowerCase()) {
    case "amc": return "bg-violet-100 text-violet-700 ring-violet-200";
    case "lender": return "bg-blue-100 text-blue-700 ring-blue-200";
    case "client": return "bg-green-100 text-green-700 ring-green-200";
    default: return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  }
};

export default function ClientCard({ client, metrics }) {
  const category =
    client?.category                           // authoritative (from clients table)
    || client?.client_type
    || client?.type
    || "client";

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold">{client?.name || "—"}</h3>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ${toneFor(category)}`}>
              {(category || "").toUpperCase()}
            </span>
          </div>
        </div>
        <Link className="rounded border px-2 py-1 text-xs hover:bg-gray-50" to={`/clients/${client?.id}`}>
          View Client
        </Link>
      </div>

      <div className="text-xs text-gray-500 mb-2">
        PRIMARY CONTACT
        <div className="text-gray-800">{client?.primary_contact || "—"}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border p-3">
          <div className="text-xs text-gray-500">Total Orders</div>
          <div className="text-lg font-semibold">{metrics?.total_orders ?? 0}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs text-gray-500">Avg Fee</div>
          <div className="text-lg font-semibold">
            {typeof metrics?.avg_fee === "number"
              ? metrics.avg_fee.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
              : "—"}
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Last:{" "}
        {metrics?.last_activity
          ? new Date(metrics.last_activity).toLocaleDateString()
          : "—"}
      </div>
    </div>
  );
}


