import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOrders } from "@/lib/hooks/useOrders";
import { useRole } from "@/lib/hooks/useRole";
import { fetchOrderForView } from "@/lib/api/orders";
import {
  updateOrderStatus,
  assignAppraiser as assignAppraiserSvc,
} from "@/lib/services/ordersService";

import OrdersTableHeader from "@/components/orders/OrdersTableHeader";
import OrdersTableRow from "@/components/orders/OrdersTableRow";
import OrdersTablePagination from "@/components/orders/OrdersTablePagination"; // <- correct path
import OrderDrawerContent from "@/components/orders/OrderDrawerContent";
import { ORDER_STATUS, STATUS_LABEL } from "@/lib/constants/orderStatus";

const fmtDate = (d) =>
  !d ? "—" : isNaN(new Date(d)) ? "—" : new Date(d).toLocaleDateString();

const fieldBtn =
  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted/60 " +
  "transition text-left text-[13px] border border-transparent " +
  "focus:outline-none focus:ring-2 focus:ring-primary/30";

/** “Stealth” control: looks like text until clicked, then becomes a select */
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
        <svg className="w-3 h-3 opacity-60" viewBox="0 0 12 8">
          <path d="M2 2l4 4 4-4" stroke="currentColor" fill="none" strokeWidth="1.5" />
        </svg>
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
      className="border rounded-md px-2 py-1 text-xs bg-white shadow-sm w-full focus:ring-2 focus:ring-primary/30"
    >
      {options.map((o) => (
        <option key={String(o.value)} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function UnifiedOrdersTable({
  role: roleProp,
  pageSize = 8,
  className = "",
  style = {},
  usersList = [], // pass useUsers() on Admin/Reviewer dashboards
}) {
  const { role: hookRole } = useRole() || {};
  const role = (roleProp || hookRole || "").toLowerCase();
  const isAdminOrReviewer = role === "admin" || role === "reviewer";

  const [page, setPage] = useState(0);
  const { data = [], count = 0, loading, error } = useOrders({
    activeOnly: true,
    page,
    pageSize,
    orderBy: "date_ordered",
    ascending: false,
  });

  const rows = useMemo(() => data || [], [data]);
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));
  const [expandedId, setExpandedId] = useState(null);

  const goToPage = (next) =>
    setPage(Math.min(Math.max(0, next), totalPages - 1));

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
    <div
      className={`h-full min-h-0 flex flex-col rounded border bg-white ${className}`}
      style={style}
    >
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
            <col /> {/* flex */}
            <col style={{ width: "240px" }} />
            <col style={{ width: "140px" }} />
          </colgroup>

          <OrdersTableHeader />

          <tbody>
            {loading ? (
              [...Array(pageSize)].map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-3 py-3">
                    <div className="h-3 bg-muted rounded w-16" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 bg-muted rounded w-40 mb-1" />
                    <div className="h-3 bg-muted rounded w-64" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 bg-muted rounded w-40" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 bg-muted rounded w-16" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-gray-600">
                  No orders.
                </td>
              </tr>
            ) : (
              rows.flatMap((o) => {
                const mainRow = (
                  <OrdersTableRow
                    key={o.id}
                    order={o}
                    onOpenDrawer={() =>
                      setExpandedId(expandedId === o.id ? null : o.id)
                    }
                    className="py-3"
                    renderCells={(order) => (
                      <>
                        {/* Order # */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <Link
                            to={`/orders/${order.id}`}
                            className="text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {order.order_no ??
                              order.order_number ??
                              order.id.slice(0, 8)}
                          </Link>
                        </td>

                        {/* Client / Address */}
                        <td className="px-3 py-3">
                          <div
                            className="font-medium truncate"
                            title={order.client_name || ""}
                          >
                            {order.client_name ?? "—"}
                          </div>
                          <div
                            className="text-xs text-muted-foreground truncate"
                            title={order.display_subtitle || order.address || ""}
                          >
                            {order.display_subtitle ?? order.address ?? "—"}
                          </div>
                        </td>

                        {/* Quick edit (stacked, stealth) */}
                        <td className="px-3 py-3">
                          {isAdminOrReviewer ? (
                            <div className="flex flex-col gap-1">
                              <InlineSelect
                                value={order.appraiser_id || ""}
                                label={
                                  order.appraiser_name || "— Unassigned —"
                                }
                                options={appraiserOptions}
                                confirmText="Assign appraiser to"
                                onConfirm={async (id) =>
                                  await assignAppraiserSvc(order.id, id || null)
                                }
                              />
                              <InlineSelect
                                value={(order.status || "").toLowerCase()}
                                label={
                                  STATUS_LABEL[
                                    (order.status || "").toLowerCase()
                                  ] || (order.status || "—")
                                }
                                options={statusOptions}
                                confirmText="Change status to"
                                onConfirm={async (s) =>
                                  await updateOrderStatus(order.id, s)
                                }
                              />
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              —
                            </div>
                          )}
                        </td>

                        {/* Due (2-line: Review / Final) */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-[12px] leading-4">
                            <div
                              className="text-muted-foreground"
                              title="Review due"
                            >
                              {fmtDate(order.review_due_date)}
                            </div>
                            <div title="Final due">{fmtDate(order.due_date)}</div>
                          </div>
                        </td>
                      </>
                    )}
                  />
                );

                const expander =
                  expandedId === o.id ? (
                    <tr key={`${o.id}-expanded`} className="bg-muted/20">
                      <td colSpan={4} className="px-3 py-3">
                        <div className="rounded-md border bg-white p-3">
                          {/* Tight inline content; we pass both orderId and the row for fast first paint */}
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
            Page <span className="font-medium">{page + 1}</span> / {totalPages} •{" "}
            {count ?? 0} total
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






