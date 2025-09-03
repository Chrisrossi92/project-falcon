import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOrders } from "@/lib/hooks/useOrders";
import { useRole } from "@/lib/hooks/useRole";
import {
  updateOrderStatus,
  assignAppraiser as assignAppraiserSvc,
} from "@/lib/services/ordersService";

import OrdersTableHeader from "@/components/orders/table/OrdersTableHeader";
import OrdersTableRow from "@/components/orders/table/OrdersTableRow";
import OrdersTablePagination from "@/components/orders/table/OrdersTablePagination";
import OrderDrawerContent from "@/components/orders/drawer/OrderDrawerContent";
import StatusBadge from "@/features/orders/StatusBadge";
import { ORDER_STATUS, STATUS_LABEL } from "@/lib/constants/orderStatus";

// ── utils ────────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  !d ? "—" : isNaN(new Date(d)) ? "—" : new Date(d).toLocaleDateString();

function dateTone(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const days = Math.floor((d - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "text-red-600 font-medium";
  if (days <= 2) return "text-amber-600";
  return "text-muted-foreground";
}

const fieldBtn =
  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted/60 " +
  "transition text-left text-[13px] border border-transparent " +
  "focus:outline-none focus:ring-2 focus:ring-primary/30";

// ── “stealth” control (looks read-only until clicked; becomes a select) ─────
function InlineSelect({ value, label, options, onConfirm, confirmText }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        data-no-drawer
        className={`${fieldBtn} bg-white w-full`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Click to edit"
      >
        <span className="truncate">{label || "—"}</span>
        {/* caret intentionally hidden in closed state */}
      </button>
    );
  }

  async function onChange(e) {
    const next = e.target.value || null;
    const chosen = options.find((o) => String(o.value) === String(next));
    const text = (confirmText || "Apply change to") + ` "${chosen?.label ?? "Unassigned"}"?`;
    if (!window.confirm(text)) {
      setOpen(false);
      return;
    }
    await onConfirm?.(next, chosen);
    setOpen(false);
  }

  return (
    <select
      data-no-drawer
      autoFocus
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onChange={onChange}
      onBlur={() => setOpen(false)}
      defaultValue={value || ""}
      className="border rounded-md px-2 py-[2px] text-xs bg-white shadow-sm w-full focus:ring-2 focus:ring-primary/30"
    >
      {options.map((o) => (
        <option key={String(o.value)} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── main ─────────────────────────────────────────────────────────────────────
export default function UnifiedOrdersTable({
  role: roleProp,
  pageSize = 8,
  className = "",
  style = {},
  usersList = [], // pass useUsers() list on Admin/Reviewer dashboards
}) {
  const { role: hookRole } = useRole() || {};
  const role = (roleProp || hookRole || "").toLowerCase();
  const isAdminOrReviewer = role === "admin" || role === "reviewer";

  // IMPORTANT: use the hook’s filter state so pagination actually changes results
  const {
    data = [],
    count = 0,
    loading,
    error,
    filters,
    setFilters,
  } = useOrders({
    activeOnly: true,
    page: 0,                   // initial
    pageSize,
    orderBy: "date_ordered",
    ascending: false,
  });

  const page = filters.page || 0;
  const rows = useMemo(() => data || [], [data]);
  const totalPages = Math.max(1, Math.ceil((count || 0) / (filters.pageSize || pageSize)));
  const [expandedId, setExpandedId] = useState(null);

  const goToPage = (next) =>
    setFilters((f) => ({
      ...f,
      page: Math.min(Math.max(0, next), totalPages - 1),
    }));

  const statusOptions = Object.values(ORDER_STATUS).map((s) => ({
    value: s,
    label: STATUS_LABEL[s] || s.replace(/_/g, " "),
  }));
  const appraiserOptions = [{ value: "", label: "— Unassigned —" }].concat(
    (usersList || []).map((u) => ({
      value: u.id,
      label: u.display_name || u.name || u.email,
    }))
  );

  return (
    <div className={`h-full min-h-0 flex flex-col rounded border bg-white ${className}`} style={style}>
      {error && (
        <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border-b">
          Failed to load orders: {error.message}
        </div>
      )}

      <div className="flex-none overflow-hidden">
        <table className="w-full table-fixed text-[13px] leading-tight">
          {/* 4 columns: Order | Client/Address | Quick edit | Due (2-line) */}
          <colgroup>
            <col style={{ width: "112px" }} />
            <col />                      {/* wide, takes remaining space */}
            <col style={{ width: "188px" }} />
            <col style={{ width: "104px" }} />
          </colgroup>

          <OrdersTableHeader />

          <tbody>
            {loading ? (
              [...Array(filters.pageSize || pageSize)].map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-3 py-3 align-middle"><div className="h-3 bg-muted rounded w-16" /></td>
                  <td className="px-3 py-3 align-middle">
                    <div className="h-3 bg-muted rounded w-40 mb-1" />
                    <div className="h-3 bg-muted rounded w-64" />
                  </td>
                  <td className="px-3 py-3 align-middle"><div className="h-3 bg-muted rounded w-40" /></td>
                  <td className="px-3 py-3 align-middle"><div className="h-3 bg-muted rounded w-16" /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-gray-600">No orders.</td></tr>
            ) : (
              rows.flatMap((o) => {
                const mainRow = (
                  <OrdersTableRow
                    key={o.id}
                    order={o}
                    onOpenDrawer={() => setExpandedId(expandedId === o.id ? null : o.id)}
                    className="py-3"
                    renderCells={(order) => (
                      <>
                        {/* Order # */}
                        <td className="px-3 py-3 whitespace-nowrap align-middle">
                          <Link
                            to={`/orders/${order.id}`}
                            className="text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {order.order_no ?? order.order_number ?? order.id.slice(0, 8)}
                          </Link>
                        </td>

                        {/* Client / Address — give this the space */}
                        <td className="px-3 py-3 align-middle">
                          <div className="max-w-[640px]">
                            <div className="font-medium truncate" title={order.client_name || ""}>
                              {order.client_name ?? "—"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate" title={order.display_subtitle || order.address || ""}>
                              {order.display_subtitle ?? order.address ?? "—"}
                            </div>
                          </div>
                        </td>

                        {/* Quick edit — compact, stacked */}
                        <td className="px-3 py-3 align-middle">
                          {isAdminOrReviewer ? (
                            <div className="flex flex-col gap-[4px]">
                              <InlineSelect
                                value={order.appraiser_id || ""}
                                label={order.appraiser_name || "— Unassigned —"}
                                options={appraiserOptions}
                                confirmText="Assign appraiser to"
                                onConfirm={async (id) => {
                                  await assignAppraiserSvc(order.id, id || null);
                                  setFilters((f) => ({ ...f })); // refresh page
                                }}
                              />
                              <InlineSelect
                                value={(order.status || "").toLowerCase()}
                                // Use StatusBadge for color AND a proper-cased label
                                label={<StatusBadge status={(order.status || "").toLowerCase()} label={STATUS_LABEL[(order.status || "").toLowerCase()] || (order.status || "—")} />}
                                options={statusOptions}
                                confirmText="Change status to"
                                onConfirm={async (s) => {
                                  await updateOrderStatus(order.id, s);
                                  setFilters((f) => ({ ...f })); // refresh page
                                }}
                              />
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">—</div>
                          )}
                        </td>

                        {/* Due (2-line: Review / Final) — tighter column */}
                        <td className="px-3 py-3 whitespace-nowrap align-middle">
                          <div className="text-[12px] leading-4 tabular-nums">
                            <div className={dateTone(order.review_due_date)} title="Review due">
                              {fmtDate(order.review_due_date)}
                            </div>
                            <div className={dateTone(order.due_date)} title="Final due">
                              {fmtDate(order.due_date)}
                            </div>
                          </div>
                        </td>
                      </>
                    )}
                  />
                );

                // Inline expander (“dropdown drawer” row)
                const expander = expandedId === o.id ? (
                  <tr key={`${o.id}-expanded`} className="bg-muted/20">
                    <td colSpan={4} className="px-3 py-3">
                      <div className="rounded-md border bg-white p-3">
                        {/* Pass both orderId and the row for faster first paint */}
                        <OrderDrawerContent orderId={o.id} order={o} compact />
                      </div>
                    </td>
                  </tr>
                ) : null;

                return [mainRow, expander].filter(Boolean);
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="mt-auto border-t px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Page <span className="font-medium">{page + 1}</span> / {totalPages} • {count ?? 0} total
          </div>
          <OrdersTablePagination
            currentPage={page + 1}
            totalPages={totalPages}
            goToPage={(p) => goToPage(p - 1)}
          />
        </div>
      </div>
    </div>
  );
}








