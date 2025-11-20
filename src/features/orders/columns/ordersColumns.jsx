import React from "react";
import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge";

// helpers
const fmtDate = (d) =>
  !d ? "—" : isNaN(new Date(d)) ? "—" : new Date(d).toLocaleDateString();

const pickFee = (r) => [r?.fee_amount, r?.fee, r?.base_fee, r?.fee_total].find((x) => x != null);
const money = (n) =>
  n == null ? "—" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const cityLine = (r) => {
  const c = r?.city || "";
  const s = r?.state || "";
  const z = r?.postal_code || r?.zip || "";
  const left = [c, s].filter(Boolean).join(", ");
  return (left + (z ? ` ${z}` : "")).trim();
};

// cells
const orderCell = (o) => (
  <div className="text-sm">
    <div className="font-medium leading-tight">{o.order_no ?? o.id?.slice(0, 8)}</div>
    <div className="mt-1"><OrderStatusBadge status={o.status} /></div>
  </div>
);

const clientCell = (o) => (
  <div className="text-sm truncate">
    <div className="font-medium truncate">{o.client_name ?? "—"}</div>
  </div>
);

const addressCell = (o) => (
  <div className="text-sm min-w-0">
    <div className="truncate" title={o.address || ""}>{o.address || "—"}</div>
    <div className="text-xs text-muted-foreground truncate" title={cityLine(o)}>{cityLine(o) || "—"}</div>
  </div>
);

const propReportCell = (o) => (
  <div className="text-sm">
    <div className="truncate">{o.property_type || "—"}</div>
    <div className="text-xs text-muted-foreground truncate">{o.report_type || "—"}</div>
  </div>
);

const feeAppraiserCell = (o) => (
  <div className="text-sm whitespace-nowrap">
    <div className="font-medium">{money(pickFee(o))}</div>
    <div className="text-xs text-muted-foreground truncate">
      {o.appraiser_name || o.assigned_appraiser_name || "—"}
    </div>
  </div>
);

const feeOnlyCell = (o) => (
  <div className="text-sm whitespace-nowrap font-medium">{money(pickFee(o))}</div>
);

const datesCell = (o) => {
  const rev = o.review_due_at ?? o.due_for_review ?? null;
  const fin = o.final_due_at ?? o.due_date ?? null;
  return (
    <div className="text-[12px] leading-tight whitespace-nowrap">
      <div className="text-rose-600" title={rev || ""}>Rev:&nbsp;{fmtDate(rev)}</div>
      <div className="text-rose-600 mt-1" title={fin || ""}>Final:&nbsp;{fmtDate(fin)}</div>
    </div>
  );
};

// tiny factory
const col = (key, width, header, cell, extras = {}) => ({ key, width, header, cell, ...extras });

// DEFAULT EXPORT INLINE — no trailing export at bottom
export default function getColumnsForRole(role, actionsCell) {
  const isAdmin = role === "admin";
  const isReviewer = role === "reviewer";
  const isAppraiser = !isAdmin && !isReviewer;

  if (isAdmin) {
    // Order | Client | Address | Property/Report | Fee/Appraiser | Dates
    return [
      col("order",      "120px",              () => "Order / Status",        orderCell, { locked: true }),
      col("client",     "160px",              () => "Client",                clientCell),
      col("address",    "minmax(200px,1fr)",  () => "Address",               addressCell),
      col("propReport", "200px",              () => "Property / Report Type",propReportCell),
      col("meta",       "160px",              () => "Fee / Appraiser",       feeAppraiserCell),
      col("dates",      "200px",              () => "Dates",                 datesCell), // last
    ];
  }

  if (isReviewer) {
    // Order | Client | Address | Property/Report | Fee/Appraiser | Actions | Dates
    return [
      col("order",      "120px",              () => "Order / Status",        orderCell, { locked: true }),
      col("client",     "160px",              () => "Client",                clientCell),
      col("address",    "minmax(200px,1fr)",  () => "Address",               addressCell),
      col("propReport", "200px",              () => "Property / Report Type",propReportCell),
      col("meta",       "160px",              () => "Fee / Appraiser",       feeAppraiserCell),
      col("actions",    "150px",              () => "Actions",               (o) => actionsCell(o)),
      col("dates",      "200px",              () => "Dates",                 datesCell), // last
    ];
  }

  // Appraiser: Order | Client | Address | Property/Report | Fee | Actions | Dates
  return [
    col("order",      "120px",              () => "Order / Status",        orderCell, { locked: true }),
    col("client",     "160px",              () => "Client",                clientCell),
    col("address",    "minmax(200px,1fr)",  () => "Address",               addressCell),
    col("propReport", "200px",              () => "Property / Report Type",propReportCell),
    col("fee",        "130px",              () => "Fee",                   feeOnlyCell),
    col("actions",    "150px",              () => "Actions",               (o) => actionsCell(o)),
    col("dates",      "200px",              () => "Dates",                 datesCell), // last
  ];
}

export { getColumnsForRole };


