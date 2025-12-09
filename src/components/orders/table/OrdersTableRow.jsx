// src/components/orders/table/OrdersTableRow.jsx
import React from "react";

const INTERACTIVE_TAGS = new Set([
  "A", "BUTTON", "SELECT", "INPUT", "TEXTAREA", "LABEL", "svg", "path",
]);

function isInteractiveTarget(path) {
  for (const el of path) {
    if (!el || !el.tagName) continue;
    if (INTERACTIVE_TAGS.has(el.tagName.toUpperCase())) return true;
    if (el.isContentEditable) return true;
    if (el.closest && (el.closest("[data-no-drawer]") || el.closest("[data-interactive]"))) return true;
  }
  return false;
}

// --- tiny helpers (defensive fallbacks)
const money = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmt = (d) => {
  if (!d) return "—";
  const t = typeof d === "string" || d instanceof Date ? new Date(d) : new Date(String(d));
  return isNaN(t) ? "—" : t.toLocaleDateString();
};

function DefaultCells({ order }) {
  // Normalize common field names from your views
  const orderNo = order?.order_no || order?.orderNo || order?.id || "—";
  const status = order?.status_label || order?.statusLabel || order?.status || "—";

  const client = order?.client_name || order?.clientName || "—";

  const street =
    order?.street_line || order?.address_line1 || order?.street || order?.address || "—";
  const cityLine =
    order?.city_line ||
    [order?.city, order?.state, order?.postal_code].filter(Boolean).join(", ") ||
    "—";

  const propType = order?.property_type || order?.propertyType || "—";
  const rptType = order?.report_type || order?.reportType || "—";

  const fee = order?.fee_amount ?? order?.feeAmount ?? order?.fee;

  const reviewDue = order?.review_due_at || order?.reviewDueAt;
  const finalDue = order?.final_due_at || order?.finalDueAt;

  return (
    <div
      className={[
        // grid tracks must match the header
        "grid grid-cols-[120px_220px_360px_260px_140px_200px]",
        "items-center gap-3",
        "text-[15px] leading-6 text-gray-900",
        "py-3 tabular-nums",
      ].join(" ")}
      role="rowgroup"
    >
      {/* ORDER / STATUS */}
      <div className="whitespace-nowrap">
        <div className="font-medium">{orderNo}</div>
        <div className="mt-1">
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] leading-5 bg-yellow-50 border-yellow-200 text-yellow-700">
            {status}
          </span>
        </div>
      </div>

      {/* CLIENT */}
      <div className="truncate">
        <div className="font-medium truncate">{client}</div>
      </div>

      {/* ADDRESS */}
      <div className="min-w-0">
        <div className="truncate font-medium underline-offset-2 hover:underline">
          {street}
        </div>
        <div className="truncate text-[12.5px] leading-5 text-gray-500">
          {cityLine}
        </div>
      </div>

      {/* PROPERTY / REPORT TYPE */}
      <div className="min-w-0">
        <div className="truncate font-medium">{propType}</div>
        <div className="truncate text-[12.5px] leading-5 text-gray-500">{rptType}</div>
      </div>

      {/* FEE / APPRAISER (fee only per header; appraiser usually visible elsewhere) */}
      <div className="text-right">
        <div className="font-semibold">{money(fee)}</div>
      </div>

      {/* DATES (right-aligned, neat labels) */}
      <div className="text-right">
        <div className="space-y-1.5">
          <div className="flex items-center justify-end gap-2">
            <span className="text-[12.5px] leading-5 text-gray-500">Rev:</span>
            <span className="text-[13px] leading-5 font-medium text-red-600 tabular-nums">
              {fmt(reviewDue)}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-[12.5px] leading-5 text-gray-500">Final:</span>
            <span className="text-[13px] leading-5 font-medium text-red-600 tabular-nums">
              {fmt(finalDue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * OrdersTableRow
 * - Clickable main row that toggles an inline drawer below
 * - If `renderCells` is not provided, a clean default layout is used
 */
export default function OrdersTableRow({
  order,
  isOpen = false,
  onToggle,
  renderCells,   // (order) => node
  drawer,        // node
  className = "",
}) {
  return (
    <>
      <div
        onClick={(e) => {
          const path = e.composedPath ? e.composedPath() : [e.target];
          if (isInteractiveTarget(path)) return; // ignore clicks on controls
          onToggle?.();
        }}
        role="row"
        aria-expanded={isOpen ? "true" : "false"}
        className={[
          "group border-b cursor-pointer select-none transition-colors duration-150 ease-out",
          "hover:bg-gray-50/70 active:scale-[0.997]",
          "px-4",
          className,
        ].join(" ")}
      >
        {renderCells ? renderCells(order) : <DefaultCells order={order} />}
      </div>

      {isOpen && (
        <div role="region" aria-label="Order inline details" className="border-b bg-slate-50/60 px-4 py-3">
          <div className="rounded-lg border bg-white shadow-sm p-3" data-no-drawer>
            {drawer}
          </div>
        </div>
      )}
    </>
  );
}













