// src/features/orders/columns/ordersColumns.jsx
import React from "react";
import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge";

/* ---------- helpers ---------- */
const fmtDate = (d) => (!d ? "—" : isNaN(new Date(d)) ? "—" : new Date(d).toLocaleDateString());
const dueTone = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  const days = Math.floor((dt - new Date()) / 86400000);
  if (days < 0) return "text-rose-600 font-medium";
  if (days <= 2) return "text-amber-600";
  return "text-muted-foreground";
};
const feeOf = (r) => {
  const tries = [r?.fee_amount, r?.fee, r?.base_fee];
  const v = tries.find((x) => x != null);
  return v == null ? null : Number(v);   // normalize strings -> number
};
const money = (n) =>
  n == null ? "—" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const cityLine = (r) => {
  const c = r?.city || "";
  const s = r?.state || "";
  const z = r?.postal_code || "";
  const left = [c, s].filter(Boolean).join(", ");
  return (left + (z ? ` ${z}` : "")).trim();
};

/* ---------- column factory ---------- */
export const col = (key, width, header, cell, opts = {}) => ({ key, width, header, cell, ...opts });

/* ---------- shared cells ---------- */
export const orderCell = (o) => (
  <div className="text-sm">
    <div className="font-medium leading-tight">{o.order_no ?? o.id?.slice(0, 8)}</div>
    <div className="mt-1"><OrderStatusBadge status={o.status} /></div>
  </div>
);
export const clientCell = (o) => (
  <div className="text-sm truncate">
    <div className="font-medium truncate">{o.client_name ?? "—"}</div>
  </div>
);
export const addressCell = (o) => (
  <div className="text-sm min-w-0">
    <div className="truncate" title={o.address || ""}>{o.address || "—"}</div>
    <div className="text-xs text-muted-foreground truncate" title={cityLine(o)}>{cityLine(o) || "—"}</div>
    <div className="text-xs text-muted-foreground truncate" title={o.property_type || ""}>{o.property_type || "—"}</div>
  </div>
);
export const feeCell = (o) => <div className="text-sm whitespace-nowrap font-medium">{money(feeOf(o))}</div>;
export const appraiserCell = (o) => (
  <div className="text-sm truncate">
    {o.appraiser_name || o.assigned_appraiser_name || "—"}
  </div>
);
export const datesCell = (o) => {
  const rev = o.review_due_at ?? o.due_for_review ?? null;
  const fin = o.final_due_at ?? o.due_date ?? null;
  return (
    <div className="text-[12px] leading-tight whitespace-nowrap">
      <div className={dueTone(rev)} title={rev || ""}>Rev:&nbsp;{fmtDate(rev)}</div>
      <div className={`mt-1 ${dueTone(fin)}`} title={fin || ""}>Final:&nbsp;{fmtDate(fin)}</div>
    </div>
  );
};

/* ---------- role presets ---------- */
export function getColumnsForRole(role, actionsCell) {
  const isAdmin = role === "admin";
  const isReviewer = role === "reviewer";
  const isAppraiser = !isAdmin && !isReviewer;

  if (isAdmin) {
    // 5 columns: Order | Client | Address | Fee/Appraiser | Dates
    return [
      col("order",   "160px",             () => "Order / Status", orderCell, { locked: true }),
      col("client",  "200px",             () => "Client",         clientCell),
      col("address", "minmax(640px,1fr)", () => "Address",        addressCell),
      col("meta",    "220px",             () => "Fee / Appraiser",(o) => (
        <div className="text-sm whitespace-nowrap">
          <div className="font-medium">{money(feeOf(o))}</div>
          <div className="text-xs text-muted-foreground truncate">
            {o.appraiser_name || o.assigned_appraiser_name || "—"}
          </div>
        </div>
      )),
      col("dates",   "260px",             () => "Dates",          datesCell),
    ];
  }

  if (isReviewer) {
    // 6 columns: Order | Client | Address | Fee/Appraiser | Actions | Dates
    return [
      col("order",   "160px",             () => "Order / Status", orderCell, { locked: true }),
      col("client",  "200px",             () => "Client",         clientCell),
      col("address", "minmax(560px,1fr)", () => "Address",        addressCell),
      col("meta",    "220px",             () => "Fee / Appraiser",(o) => (
        <div className="text-sm whitespace-nowrap">
          <div className="font-medium">{money(feeOf(o))}</div>
          <div className="text-xs text-muted-foreground truncate">
            {o.appraiser_name || o.assigned_appraiser_name || "—"}
          </div>
        </div>
      )),
      col("actions", "200px",             () => "Actions",        (o) => actionsCell(o)),
      col("dates",   "260px",             () => "Dates",          datesCell),
    ];
  }

  // Appraiser: 6 columns: Order | Client | Address | Fee | Actions | Dates
  return [
    col("order",   "160px",             () => "Order / Status", orderCell, { locked: true }),
    col("client",  "200px",             () => "Client",         clientCell),
    col("address", "minmax(700px,1fr)", () => "Address",        addressCell),
    col("fee",     "140px",             () => "Fee",            feeCell),
    col("actions", "200px",             () => "Actions",        (o) => actionsCell(o)),
    col("dates",   "260px",             () => "Dates",          datesCell),
  ];
}

export default getColumnsForRole;
