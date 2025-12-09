// src/components/clients/ClientCard.jsx
import React from "react";
import { Link } from "react-router-dom";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

const money0 = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })
    : "—";

const badgeClasses = (categoryLabel) => {
  const c = (categoryLabel || "").toLowerCase();
  if (c.includes("amc")) return "bg-violet-50 text-violet-700 border-violet-200";
  if (c.includes("lender")) return "bg-blue-50 text-blue-700 border-blue-200";
  if (c.includes("client")) return "bg-green-50 text-green-700 border-green-200";
  return "bg-zinc-50 text-zinc-700 border-zinc-200";
};

const statusBadgeClasses = (status) => {
  const s = (status || "").toUpperCase();
  if (s === "ACTIVE")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "INACTIVE" || s === "INACTIVE CLIENT")
    return "bg-gray-50 text-gray-600 border-gray-200";
  if (s === "ON HOLD")
    return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
};

export default function ClientCard({ client, metrics }) {
  const { id, name, category, status, primary_contact, phone } = client || {};
  const { total_orders, avg_fee, last_activity } = metrics || {};

  const statusLabel = status ? status.toUpperCase() : "ACTIVE";

  return (
    <div className="group flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-gray-900">
              {name || "Untitled client"}
            </h2>
            {category && (
              <span
                className={
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium " +
                  badgeClasses(category)
                }
              >
                {category}
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {primary_contact ? (
              <span>{primary_contact}</span>
            ) : (
              <span className="italic text-gray-400">No primary contact</span>
            )}
            {phone && (
              <>
                <span className="mx-1">•</span>
                <a
                  href={`tel:${phone}`}
                  className="underline decoration-dotted underline-offset-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {phone}
                </a>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end text-right">
          <span className="text-[11px] uppercase tracking-wide text-gray-400">
            Total Orders
          </span>
          <span className="text-lg font-semibold text-gray-900">
            {total_orders ?? 0}
          </span>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <div className="text-[11px] text-gray-500">Avg Fee</div>
          <div className="mt-0.5 text-sm font-medium text-gray-900">
            {money0(avg_fee)}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <div className="text-[11px] text-gray-500">Last Order</div>
          <div className="mt-0.5 text-sm font-medium text-gray-900">
            {fmtDate(last_activity)}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <div className="text-[11px] text-gray-500">Status</div>
          <div className="mt-1">
            <span
              className={
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium " +
                statusBadgeClasses(statusLabel)
              }
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <Link
          to={`/clients/${id}`}
          className="font-medium text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline"
        >
          View client detail
        </Link>
        <span className="text-[11px] text-gray-400 group-hover:text-gray-500">
          Click to see orders &amp; edit
        </span>
      </div>
    </div>
  );
}




