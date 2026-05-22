// src/components/clients/ClientCard.jsx
import { Link } from "react-router-dom";
import { useCan } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";

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
  const { allowed: canUpdateAllClients } = useCan(PERMISSIONS.CLIENTS_UPDATE_ALL);
  const { id, name, category, status, primary_contact, phone } = client || {};
  const { total_orders, avg_fee, last_activity } = metrics || {};

  const statusLabel = status ? status.toUpperCase() : "ACTIVE";
  const detailLabel = name ? `View ${name} client detail` : "View client detail";
  const cardLabel = name ? `${name} client summary` : "Client summary";

  return (
    <article
      aria-label={cardLabel}
      className="group flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md motion-reduce:hover:translate-y-0"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 truncate text-base font-semibold leading-6 text-slate-950">
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

            <div className="text-sm text-slate-600">
              {primary_contact ? (
                <span>{primary_contact}</span>
              ) : (
                <span className="italic text-slate-400">No primary contact</span>
              )}
              {phone && (
                <>
                  <span aria-hidden="true" className="mx-1 text-slate-300">/</span>
                  <a
                    href={`tel:${phone}`}
                    className="font-medium text-slate-700 underline decoration-dotted underline-offset-2 hover:text-slate-950"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {phone}
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="shrink-0 rounded-lg bg-slate-50 px-3 py-2 text-right">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Orders
            </span>
            <span className="mt-0.5 block text-xl font-semibold leading-none text-slate-950">
              {total_orders ?? 0}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Avg Fee
            </div>
            <div className="mt-1 font-medium text-slate-950">
              {money0(avg_fee)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Last Order
            </div>
            <div className="mt-1 font-medium text-slate-950">
              {fmtDate(last_activity)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Status
            </div>
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
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to={`/clients/${id}`}
          aria-label={detailLabel}
          className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
        >
          View client detail
        </Link>
        <span className="text-xs text-slate-500">
          {canUpdateAllClients ? "Orders and edit access" : "Orders only"}
        </span>
      </div>
    </article>
  );
}
