import React, { useMemo, useState } from "react";
import useRole from "@/lib/hooks/useRole";
import useSession from "@/lib/hooks/useSession";
import { useOrders } from "@/lib/hooks/useOrders";

import OrdersTableRow from "@/components/orders/table/OrdersTableRow";
import OrdersTablePagination from "@/components/orders/table/OrdersTablePagination";
import OrderDrawerContent from "@/components/orders/drawer/OrderDrawerContent";
import OrderOpenFullLink from "@/components/orders/drawer/OrderOpenFullLink";
import ReviewerActionCell from "@/components/orders/table/ReviewerActionCell";
import { updateOrderStatus } from "@/lib/api/orders";

import useColumnsConfig from "@/features/orders/columns/useColumnsConfig";
import getColumnsForRole from "@/features/orders/columns/ordersColumns";

/* helpers */
const feeOf = (r) => [r?.fee_amount, r?.fee, r?.base_fee, r?.fee_total].find((v) => v != null);
const fmtMoney = (n) => (n == null ? "—" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }));
const cityLine = (r) => {
  const c = r?.city || "";
  const s = r?.state || "";
  const z = r?.zip || r?.postal_code || "";
  const left = [c, s].filter(Boolean).join(", ");
  return (left + (z ? ` ${z}` : "")).trim();
};
const mapsHref = (street, cityline) => {
  const full = [street || "", cityline || ""].filter(Boolean).join(", ");
  return full ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}` : null;
};
const fmtDate = (d) => (!d ? "—" : isNaN(new Date(d)) ? "—" : new Date(d).toLocaleDateString());

export default function UnifiedOrdersTable({
  role: roleProp,
  filters: appliedFilters = {},
  pageSize = 15,
  className = "",
  style = {},
}) {
  const { role: hookRole } = useRole() || {};
  const { user } = useSession() || {};
  const userId = user?.id || user?.user_id || user?.uid || null;

  const role = (roleProp || hookRole || "appraiser").toLowerCase();
  const isAdmin = role === "admin";
  const isReviewer = role === "reviewer";
  const isAppraiser = !isAdmin && !isReviewer;

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

  const { active: columns, onDragStart, onDragOver, onDrop, startResize, resizeTo, endResize } =
    useColumnsConfig(role, actionsCell);

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
              <div key={i} className="px-4 py-3 text-sm text-slate-500">Loading…</div>
            ))
          ) : !data?.length ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">No orders.</div>
          ) : (
            data.map((o) => {
              const drawerNode = (
                <div data-no-drawer>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold">Order {o.order_no ?? o.order_number ?? o.id?.slice(0, 8)}</div>
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
                        /* ADDRESS */
                        if (c.key === "address") {
                          const street = o.address || o.property_address || "";
                          const cline = cityLine(o);
                          const href = mapsHref(street, cline);
                          return (
                            <div key={c.key} className={`min-w-0 ${idx === 0 ? stickyCell : ""}`}>
                              <div className="text-sm leading-tight">
                                {href ? (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sky-700 hover:underline"
                                    data-no-drawer
                                    onClick={(e) => e.stopPropagation()}
                                    title={`${street}${cline ? `, ${cline}` : ""}`}
                                  >
                                    {street || "—"}
                                  </a>
                                ) : (
                                  <span className="truncate">{street || "—"}</span>
                                )}
                              </div>
                              <div className="text-xs leading-tight text-slate-500 truncate">
                                {cline || "—"}
                              </div>
                            </div>
                          );
                        }

                        /* PROPERTY / REPORT TYPE */
                        if (c.key === "propReport" || c.key === "prop_report") {
                          return (
                            <div key={c.key} className={`min-w-0 ${idx === 0 ? stickyCell : ""}`}>
                              <div className="text-sm truncate">{o.property_type || "—"}</div>
                              <div className="text-xs text-slate-500 truncate">{o.report_type || "—"}</div>
                            </div>
                          );
                        }

                        /* FEE / APPRAISER */
                        if (c.key === "meta") {
                          return (
                            <div key={c.key} className={`min-w-0 ${idx === 0 ? stickyCell : ""}`}>
                              <div className="text-sm font-medium text-slate-900">{fmtMoney(feeOf(o))}</div>
                              <div className="text-xs text-slate-500 truncate">{o.appraiser_name || "—"}</div>
                            </div>
                          );
                        }

                        /* FEE only (appraiser view) */
                        if (c.key === "fee") {
                          return (
                            <div key={c.key} className={`min-w-0 ${idx === 0 ? stickyCell : ""}`}>
                              <div className="text-sm font-medium text-slate-900">{fmtMoney(feeOf(o))}</div>
                            </div>
                          );
                        }

                        /* DATES */
                        if (c.key === "dates") {
                          const rev = o.review_due_at ?? o.due_for_review ?? null;
                          const fin = o.final_due_at ?? o.due_date ?? null;
                          return (
                            <div key={c.key} className={`min-w-0 ${idx === 0 ? stickyCell : ""}`}>
                              <div className="text-xs text-rose-600">Rev: {fmtDate(rev)}</div>
                              <div className="text-xs text-rose-600">Final: {fmtDate(fin)}</div>
                            </div>
                          );
                        }

                        /* default cell from column config */
                        return (
                          <div key={c.key} className={`truncate whitespace-nowrap overflow-hidden ${idx === 0 ? stickyCell : ""}`}>
                            {c.cell(o)}
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
      <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-500">
        <div>Page {tableFilters.page + 1} / {totalPages} • {count ?? 0} total</div>
        <OrdersTablePagination currentPage={tableFilters.page + 1} totalPages={totalPages} goToPage={(p) => go(p - 1)} />
      </div>
    </div>
  );
}

































