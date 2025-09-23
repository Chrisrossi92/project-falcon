import React, { useMemo } from "react";
import ClientHeader, { headerPalette } from "./ClientHeader";

// Smart category detection; uses explicit fields first, name heuristic second
function inferCategory(c = {}) {
  const t = (c.type || c.client_type || c.category || c.kind || "").toString().toLowerCase();
  if (t.includes("amc")) return "amc";
  if (t.includes("lender")) return "lender";
  const name = (c.name || c.client_name || "").toLowerCase();
  if (/\b(amc|appraisal management)\b/.test(name)) return "amc";
  if (/\b(bank|credit union|mortgage|finance|financial|banc|bancorp|savings|loan)\b/.test(name)) return "lender";
  return "other";
}

const fmtUSD0 = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";

export default function ClientCard({ client, onOpen }) {
  // normalize fields you already expose in different views
  const name = client?.name || client?.client_name || "—";
  const primary = client?.contact_name || client?.primary_contact || "—";
  const phone = client?.primary_contact_phone || client?.phone || null;
  const ordersCount = client?.orders_count ?? client?.total_orders ?? 0;
  const avgFee = client?.avg_base_fee ?? client?.avg_total_fee ?? null;
  const last = client?.last_ordered_at ? new Date(client.last_ordered_at).toLocaleDateString() : "—";

  const category = useMemo(() => inferCategory(client), [client]);
  const tint = headerPalette[category] || headerPalette.other;

  return (
    <article className="rounded-2xl border bg-white shadow-sm hover:shadow-md transition">
      <ClientHeader name={name} category={category} onOpen={() => onOpen?.(client)} />

      <div className="px-4 py-3 space-y-3">
        {/* Primary contact */}
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Primary Contact
          </div>
          <div className="text-sm">
            <span className="font-medium">{primary}</span>
            {phone && (
              <a className="ml-2 underline text-sm" href={`tel:${phone}`}>
                {phone}
              </a>
            )}
          </div>
        </div>

        {/* KPIs with a hint of the category color */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl border px-3 py-2 ring-1 ${tint.kpiRing}`}>
            <div className="text-[11px] text-muted-foreground">Total Orders</div>
            <div className="text-base font-semibold">{ordersCount}</div>
          </div>
          <div className={`rounded-xl border px-3 py-2 ring-1 ${tint.kpiRing}`}>
            <div className="text-[11px] text-muted-foreground">Avg Fee</div>
            <div className="text-base font-semibold">{fmtUSD0(avgFee)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <div>Last: {last}</div>
          <div>{client?.status || ""}</div>
        </div>
      </div>
    </article>
  );
}

