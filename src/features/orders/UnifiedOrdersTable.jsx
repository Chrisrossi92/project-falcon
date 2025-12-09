import React, { useMemo, useState } from "react";
import useRole from "@/lib/hooks/useRole";
import useSession from "@/lib/hooks/useSession";
import { useOrders } from "@/lib/hooks/useOrders";
import { formatOrderStatusLabel } from "@/lib/constants/orderStatus";

import OrdersTableRow from "@/components/orders/table/OrdersTableRow";
import OrdersTablePagination from "@/components/orders/table/OrdersTablePagination";
import OrderDrawerContent from "@/components/orders/drawer/OrderDrawerContent";
import OrderOpenFullLink from "@/components/orders/drawer/OrderOpenFullLink";
import ReviewerActionCell from "@/components/orders/table/ReviewerActionCell";
import { updateOrderStatus } from "@/lib/api/orders";
import { sendOrderToReview, sendOrderBackToAppraiser, completeOrder } from "@/lib/services/ordersService";

import useColumnsConfig from "@/features/orders/columns/useColumnsConfig";
import getColumnsForRole from "@/features/orders/columns/ordersColumns";

/* helpers */
const feeOf = (r) => [r?.base_fee, r?.appraiser_fee].find((v) => v != null);
const fmtMoney = (n) => (n == null ? "-" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }));
const cityLine = (r) => {
  const c = r?.city || "";
  const s = r?.state || "";
  const z = r?.postal_code || "";
  const left = [c, s].filter(Boolean).join(", ");
  return (left + (z ? ` ${z}` : "")).trim();
};
const mapsHref = (street, cityline) => {
  const full = [street || "", cityline || ""].filter(Boolean).join(", ");
  return full ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}` : null;
};
const fmtDate = (d) => (!d ? "-" : isNaN(new Date(d)) ? "-" : new Date(d).toLocaleDateString());
const orderNumberOf = (row) =>
  row?.order_number || (row?.id ? row.id.slice(0, 8) : "");

export default function UnifiedOrdersTable({
  role: roleProp,
  filters: appliedFilters = {},
  pageSize = 15,
  className = "",
  style = {},
}) {
  const { user: sessionUser } = useSession() || {};
  const userId = sessionUser?.id || sessionUser?.user_id || sessionUser?.uid || null;

  const { role: hookRole } = useRole() || {};
  const normalizedRole = (roleProp || hookRole || "appraiser").toString().toLowerCase();
  const isAdminLike = normalizedRole === "owner" || normalizedRole === "admin";
  const isReviewer = normalizedRole === "reviewer";
  const isAppraiser = normalizedRole === "appraiser";
  const role = normalizedRole;
  const assignmentLabel = isAppraiser ? "Reviewer" : "Appraiser";

  /* seed built from the **live** filters prop */
  const seed = useMemo(() => {
    const base = {
      activeOnly: appliedFilters.activeOnly ?? false,     // <-- now respected
      page: appliedFilters.page || 0,
      pageSize: appliedFilters.pageSize || pageSize,
      orderBy: appliedFilters.orderBy || "order_number",
      ascending: appliedFilters.ascending ?? false,
      search: appliedFilters.search || "",
      statusIn: appliedFilters.statusIn || [],
      clientId: appliedFilters.clientId || null,
      appraiserId: appliedFilters.appraiserId || null,
      priority: appliedFilters.priority || "",
      dueWindow: appliedFilters.dueWindow || "",
      from: appliedFilters.from || "",
      to: appliedFilters.to || "",
    };
    if (isAppraiser) base.appraiserId = userId || null;
    return base;
  }, [appliedFilters, isAppraiser, userId, pageSize]);

  const {
    data = [],
    count = 0,
    loading,
    error,
    filters: tableFilters,
    setFilters: setTableFilters,
  } = useOrders(seed);

  const totalPages = Math.max(1, Math.ceil((count || 0) / (tableFilters.pageSize || pageSize)));
  const [expandedId, setExpandedId] = useState(null);

  const refresh = () => setTableFilters((f) => ({ ...f }));
  const go = (p) => setTableFilters((f) => ({ ...f, page: Math.min(Math.max(0, p), totalPages - 1) }));

  const actionsCell = (o) =>
    isReviewer ? (
      <ReviewerActionCell order={o} onChanged={refresh} />
    ) : (
      <button
        data-no-drawer
        className="px-2 py-1 text-xs rounded border hover:bg-gray-50 disabled:opacity-50"
        onClick={async (e) => {
          e.stopPropagation();
          await updateOrderStatus(o.id, "IN_REVIEW");
          refresh();
        }}
        disabled={String(o.status || "").toUpperCase() !== "IN_PROGRESS"}
        title="Send this order to review"
      >
        Send to Review
      </button>
    );

  async function handleSendToReview(order) {
    await sendOrderToReview(order, sessionUser?.id);
    refresh();
  }

  async function handleSendBackToAppraiser(order) {
    await sendOrderBackToAppraiser(order, sessionUser?.id);
    refresh();
  }

  async function handleCompleteOrder(order) {
    await completeOrder(order, sessionUser?.id);
    refresh();
  }

  const { active: columns, onDragStart, onDragOver, onDrop, startResize, resizeTo, endResize } =
    useColumnsConfig(normalizedRole, {
      actionsCell,
      onSendToReview: handleSendToReview,
      onSendBackToAppraiser: handleSendBackToAppraiser,
      onComplete: handleCompleteOrder,
    });

  const template = columns.map((c) => c.width).join(" ");

  function onResizeDown(e, key) {
    e.preventDefault();
    e.stopPropagation();
    const startW = e.currentTarget.parentElement.getBoundingClientRect().width;
    startResize(key, e.clientX, startW);
    const move = (ev) => resizeTo(ev.clientX);
    const up = () => {
      endResize();
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  const stickyHeader = "bg-white sticky left-0 z-20 pr-4 border-r border-slate-200";
  const stickyCell   = "bg-white sticky left-0 z-10 pr-4 border-slate-200";

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${className}`} style={style}>
      {error && <div className="px-3 py-2 text-sm text-rose-700 bg-rose-50 border-b">Failed to load orders: {error.message}</div>}

      <style>{`
        .col-wrap{position:relative;min-height:36px;display:flex;align-items:stretch;gap:.5rem;padding:2px 4px 2px 8px;border-radius:6px;}
        .col-wrap:hover{background:rgba(0,0,0,.02)}
        .col-label{display:flex;align-items:center;gap:.5rem;width:calc(100% - 14px);cursor:grab;user-select:none;padding-right:8px}
        .col-label:active{cursor:grabbing}
        .col-resize{position:absolute;right:-6px;top:0;height:100%;width:14px;cursor:col-resize;display:flex;align-items:center}
        .col-resize::after{content:"";width:2px;height:60%;background:#e5e7eb;border-radius:1px;opacity:0;transition:opacity .15s;margin-left:6px}
        .col-wrap:hover .col-resize::after{opacity:.9}
      `}</style>

      {/* header */}
      <div className="overflow-x-auto">
        <div
          className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b px-2 py-2 text-[11px] uppercase tracking-wide text-slate-500"
          style={{ display: "grid", gridTemplateColumns: template, columnGap: ".25rem", minWidth: "900px" }}
        >
          {columns.map((c, idx) => (
            <div
              key={c.key}
              className={`col-wrap ${idx === 0 ? stickyHeader : ""}`}
              onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
              onDrop={() => onDrop(idx)}
            >
              <div
                className={`col-label ${c.locked ? "cursor-default opacity-90" : ""}`}
                draggable={!c.locked}
                onDragStart={() => onDragStart(idx)}
                title={c.locked ? "Locked" : "Drag to reorder"}
              >
                <div className="truncate">{c.header()}</div>
              </div>
              <div className="col-resize" data-no-drawer onMouseDown={(e) => onResizeDown(e, c.key)} title="Drag to resize" />
            </div>
          ))}
        </div>

        {/* rows */}
        <div className="divide-y" style={{ minWidth: "900px" }}>
          {loading ? (
            [...Array(tableFilters.pageSize || pageSize)].map((_, i) => (
              <div key={i} className="px-4 py-3 text-sm text-slate-500">Loading...</div>
            ))
          ) : !data?.length ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">No orders.</div>
          ) : (
            data.map((o) => {
              const drawerNode = (
                <div data-no-drawer>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold">Order {orderNumberOf(o)}</div>
                    <OrderOpenFullLink orderId={o.id} />
                  </div>
                  <OrderDrawerContent orderId={o.id} order={o} onRefresh={refresh} />
                </div>
              );

              return (
                <OrdersTableRow
                  key={o.id}
                  order={o}
                  isOpen={expandedId === o.id}
                  onToggle={() => setExpandedId((x) => (x === o.id ? null : o.id))}
                  className="py-2.5"
                  renderCells={() => (
                    <div
                      className="items-start text-sm text-slate-800"
                      style={{ display: "grid", gridTemplateColumns: template, columnGap: ".25rem" }}
                    >
                      {columns.map((c, idx) => {
                        // Address
                        if (c.key === "address") {
                          const street = o.address_line1 || "-";
                          const cityLineStr = [o.city, o.state].filter(Boolean).join(", ");
                          const cityZip = [cityLineStr, o.postal_code].filter(Boolean).join(" ");
                          return (
                            <div key={c.key} className={idx === 0 ? stickyCell : ""}>
                              <div className="flex flex-col">
                                <span className="text-sm text-slate-800 truncate">{street}</span>
                                {cityZip && <span className="text-xs text-slate-500 truncate">{cityZip}</span>}
                              </div>
                              {mapsHref(o.address_line1, cityLineStr) && (
                                <a className="text-[11px] text-indigo-600 hover:underline" href={mapsHref(o.address_line1, cityLineStr)} target="_blank" rel="noreferrer">
                                  Open in Maps
                                </a>
                              )}
                            </div>
                          );
                        }

                        // Client
                        if (c.key === "client") {
                          return (
                            <div key={c.key} className={idx === 0 ? stickyCell : ""}>
                              <div className="font-medium">{o.client_name || "-"}</div>
                              <div className="text-xs text-slate-500">#{orderNumberOf(o)}</div>
                            </div>
                          );
                        }

                        // Status
                        if (c.key === "status") {
                          const rawStatus = o.status_normalized || o.status;
                          const statusLabel = formatOrderStatusLabel(rawStatus) || rawStatus || "-";
                          return (
                            <div key={c.key} className="flex flex-col gap-1">
                              <div className="text-xs font-semibold uppercase tracking-wide">{statusLabel}</div>
                              <div className="text-[11px] text-slate-500">
                                {o.review_due_at ? `Review: ${fmtDate(o.review_due_at)}` : ""}
                                {o.final_due_at ? ` Final: ${fmtDate(o.final_due_at)}` : ""}
                              </div>
                            </div>
                          );
                        }

                        // Fee
                        if (c.key === "fee") {
                          const fee = feeOf(o);
                          return (
                            <div key={c.key} className="text-sm font-semibold text-slate-700">
                              {fmtMoney(fee)}
                            </div>
                          );
                        }

                        // Default
                        return (
                          <div key={c.key} className={idx === 0 ? stickyCell : ""}>
                            {getColumnsForRole(role, actionsCell)
                              .find((col) => col.key === c.key)
                              ?.cell({ order: o, actions: { refresh } })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  drawer={drawerNode}
                />
              );
            })
          )}
        </div>
      </div>

      {/* footer */}
      <div className="border-t bg-slate-50/80 px-2 py-1.5 flex items-center justify-between text-xs text-slate-600">
        <div>
          Page {tableFilters.page + 1} / {totalPages} — {count || 0} total
        </div>
        <OrdersTablePagination currentPage={tableFilters.page + 1} totalPages={totalPages} goToPage={(p) => go(p - 1)} />
      </div>
    </div>
  );
}
