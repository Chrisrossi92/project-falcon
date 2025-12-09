import React from "react";
import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge";

const fmtDate = (d) =>
  !d ? "-" : isNaN(new Date(d)) ? "-" : new Date(d).toLocaleDateString();

const pickFee = (r) => [r?.base_fee, r?.appraiser_fee].find((x) => x != null);
const money = (n) =>
  n == null ? "-" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const cityLine = (r) => {
  const c = r?.city || "";
  const s = r?.state || "";
  const z = r?.postal_code || "";
  const left = [c, s].filter(Boolean).join(", ");
  return (left + (z ? ` ${z}` : "")).trim();
};

const orderCell = (o) => (
  <div className="text-sm">
    <div className="font-medium leading-tight">{o.order_number ?? o.id?.slice(0, 8) ?? "–"}</div>
    <div className="mt-1"><OrderStatusBadge status={o.status} /></div>
  </div>
);

const clientCell = (o) => (
  <div className="text-sm truncate">
    <div className="font-medium truncate">{o.client_name ?? "–"}</div>
  </div>
);

const addressCell = (o) => (
  <div className="text-sm min-w-0">
    <div className="truncate" title={o.address_line1 || ""}>{o.address_line1 || "-"}</div>
    <div className="text-xs text-muted-foreground truncate" title={cityLine(o)}>{cityLine(o) || "-"}</div>
  </div>
);

const propReportColumn = {
  id: "property_report",
  width: "200px",
  header: () => "Property / Report",
  cell: ({ order }) => {
    const propertyType = order?.property_type || "–";
    const reportType = order?.report_type || "–";
    return (
      <div className="flex flex-col">
        <span>{propertyType}</span>
        <span className="text-xs text-muted-foreground">{reportType}</span>
      </div>
    );
  },
};

const feeOnlyCell = (o) => (
  <div className="text-sm whitespace-nowrap font-medium">{money(pickFee(o))}</div>
);

const datesColumn = {
  id: "dates",
  width: "200px",
  header: () => "Dates",
  cell: ({ order }) => {
    const rev = order?.review_due_at ?? null;
    const fin = order?.final_due_at ?? null;
    return (
      <div className="text-[12px] leading-tight whitespace-nowrap">
        <div className="text-rose-600" title={rev || ""}>Rev:&nbsp;{fmtDate(rev)}</div>
        <div className="text-rose-600 mt-1" title={fin || ""}>Final:&nbsp;{fmtDate(fin)}</div>
      </div>
    );
  },
};

const appraiserColumn = {
  id: "appraiser",
  header: () => "Appraiser",
  width: "140px",
  cell: (info) => {
    const row = info?.row;
    const o = row?.original || {};
    return o.appraiser_name || "–";
  },
};

const col = (key, width, header, cell, extras = {}) => ({ key, width, header, cell, ...extras });

export function getColumnsForRole(role, actions = {}) {
  const { onSendToReview, onSendBackToAppraiser, onComplete } = actions || {};
  const normalizedRole = (role || "appraiser").toLowerCase();
  const orderStatusColumn = col("order",      "140px",              () => "Order / Stat.",       ({ order }) => orderCell(order), { locked: true });
  const clientCol = col("client",    "160px",              () => "Client",                clientCell);
  const addressCol = col("address",  "minmax(200px,1fr)",  () => "Address",               addressCell);
  const propCol = col("propReport",  propReportColumn.width,  propReportColumn.header, ({ order }) => propReportColumn.cell({ order }));
  const feeCol = col("fee",          "140px",              () => "Fee",                   feeOnlyCell);
  const datesColDef = col("dates",   datesColumn.width,   datesColumn.header, ({ order }) => datesColumn.cell({ order }));

  const actionsColumn = {
    id: "actions",
    width: "150px",
    header: () => "Actions",
    cell: (info) => {
      const row = info?.row;
      const o = row?.original;
      if (!o) return null;
      if (normalizedRole === "appraiser") {
        return (
          <button
            className="text-xs px-2 py-1 border rounded"
            disabled={!onSendToReview}
            onClick={() => onSendToReview?.(o)}
          >
            Send to Review
          </button>
        );
      }
      return (
        <div className="flex flex-col gap-1 text-xs">
          <button
            className="px-2 py-1 border rounded"
            disabled={!onSendToReview}
            onClick={() => onSendToReview?.(o)}
          >
            Send to Review
          </button>
          <button
            className="px-2 py-1 border rounded"
            disabled={!onSendBackToAppraiser}
            onClick={() => onSendBackToAppraiser?.(o)}
          >
            Send back to appraiser
          </button>
          <button
            className="px-2 py-1 border rounded"
            disabled={!onComplete}
            onClick={() => onComplete?.(o)}
          >
            Mark complete
          </button>
        </div>
      );
    },
  };

  const cols = [
    orderStatusColumn,
    clientCol,
    addressCol,
    propCol,
    feeCol,
    actionsColumn,
    datesColDef,
    appraiserColumn,
  ];

  return cols;
}

export default getColumnsForRole;
