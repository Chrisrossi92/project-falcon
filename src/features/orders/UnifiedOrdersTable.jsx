import React, { useMemo, useState } from "react";
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
import QuickActionCell from "@/components/orders/table/QuickActionCell";
import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge";
import { ORDER_STATUS, STATUS_LABEL } from "@/lib/constants/orderStatus";

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
  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted/60 transition text-left text-[13px] border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/30";

function InlineSelect({ value, label, options, onConfirm, confirmText }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        data-no-drawer
        className={`${fieldBtn} bg-white w-full`}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title="Click to edit"
      >
        <span className="truncate">{label || "—"}</span>
      </button>
    );
  }
  async function onChange(e) {
    const next = e.target.value || null;
    const chosen = options.find((o) => String(o.value) === String(next));
    const text = (confirmText || "Apply change to") + ` "${chosen?.label ?? "Unassigned"}"?`;
    if (!window.confirm(text)) { setOpen(false); return; }
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

function DueCell({ reviewDue, finalDue }) {
  return (
    <div className="text-[12px] leading-4 tabular-nums space-y-1 w-full">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Review</span>
        <span className={`${dateTone(reviewDue)} whitespace-nowrap`}>{fmtDate(reviewDue)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Final</span>
        <span className={`${dateTone(finalDue)} whitespace-nowrap`}>{fmtDate(finalDue)}</span>
      </div>
    </div>
  );
}

export default function UnifiedOrdersTable({
  role: roleProp,
  pageSize = 8,
  className = "",
  style = {},
  usersList = [],
}) {
  const { role: hookRole } = useRole() || {};
  const role = (roleProp || hookRole || "").toLowerCase();
  const isAdminOrReviewer = role === "admin" || role === "reviewer";

  const {
    data = [],
    count = 0,
    loading,
    error,
    filters,
    setFilters,
  } = useOrders({
    activeOnly: true,
    page: 0,
    pageSize,
    orderBy: "date_ordered",
    ascending: false,
  });

  const page = filters.page || 0;
  const rows = useMemo(() => data || [], [data]);
  const totalPages = Math.max(1, Math.ceil((count || 0) / (filters.pageSize || pageSize)));
  const [expandedId, setExpandedId] = useState(null);
  const refresh = () => setFilters((f) => ({ ...f })); // reload

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
          <colgroup>
            <col />                         {/* Details (flex) */}
            <col style={{ width: "200px" }} /> {/* Quick Action (compact) */}
            <col style={{ width: "140px" }} /> {/* Due (compact) */}
          </colgroup>

          <thead className="bg-muted/40">
            <tr className="text-[12px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left font-semibold">Order / Client / Address</th>
              <th className="px-3 py-2 text-left font-semibold">Quick action</th>
              <th className="px-3 py-2 text-left font-semibold">Due</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              [...Array(filters.pageSize || pageSize)].map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-3 py-3 align-middle"><div className="h-3 bg-muted rounded w-64" /></td>
                  <td className="px-3 py-3 align-middle"><div className="h-3 bg-muted rounded w-40" /></td>
                  <td className="px-3 py-3 align-middle"><div className="h-3 bg-muted rounded w-24" /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-6 text-gray-600">No orders.</td></tr>
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
                        {/* DETAILS: biggest column */}
                        <td className="px-3 py-3 align-middle border-r border-slate-200">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-black">
                              {order.order_no ?? order.order_number ?? order.id.slice(0, 8)}
                            </div>
                            <OrderStatusBadge status={(order.status || "").toLowerCase()} />
                            <div className="font-medium truncate" title={order.client_name || ""}>
                              {order.client_name ?? "—"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate" title={order.display_subtitle || order.address || ""}>
                              {order.display_subtitle ?? order.address ?? "—"}
                            </div>
                          </div>
                        </td>

                        {/* QUICK ACTION: compact; popover expands when needed */}
                        <td className="px-3 py-3 align-middle border-r border-slate-200">
                          {isAdminOrReviewer ? (
                            <div className="flex flex-col gap-[4px] w-[180px]">
                              <InlineSelect
                                value={order.appraiser_id || ""}
                                label={order.appraiser_name || "— Unassigned —"}
                                options={appraiserOptions}
                                confirmText="Assign appraiser to"
                                onConfirm={async (id) => { await assignAppraiserSvc(order.id, id || null); refresh(); }}
                              />
                              <InlineSelect
                                value={(order.status || "").toLowerCase()}
                                label={STATUS_LABEL[(order.status || "").toLowerCase()] || (order.status || "—")}
                                options={statusOptions}
                                confirmText="Change status to"
                                onConfirm={async (s) => { await updateOrderStatus(order.id, s); refresh(); }}
                              />
                            </div>
                          ) : (
                            <QuickActionCell order={order} onChanged={refresh} />
                          )}
                        </td>

                        {/* DUE: compact, right-aligned dates */}
                        <td className="px-3 py-3 align-middle">
                          <DueCell reviewDue={order.review_due_date} finalDue={order.due_date} />
                        </td>
                      </>
                    )}
                  />
                );

                const expander = expandedId === o.id ? (
                  <tr key={`${o.id}-expanded`} className="bg-muted/20">
                    <td colSpan={3} className="px-3 py-3">
                      <div className="rounded-md border bg-white p-3">
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

      <div className="mt-auto border-t px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Page <span className="font-medium">{(filters.page || 0) + 1}</span> / {Math.max(1, Math.ceil((count || 0) / (filters.pageSize || pageSize)))} • {count ?? 0} total
          </div>
          <OrdersTablePagination
            currentPage={(filters.page || 0) + 1}
            totalPages={Math.max(1, Math.ceil((count || 0) / (filters.pageSize || pageSize)))}
            goToPage={(p) => setFilters((f) => ({ ...f, page: p - 1 }))}
          />
        </div>
      </div>
    </div>
  );
}














