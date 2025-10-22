// src/features/orders/UnifiedOrdersTable.jsx
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
import { getColumnsForRole } from "@/features/orders/columns/ordersColumns";

// ---------- helpers ----------
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
const feeOf = (r) => [r?.fee_amount, r?.fee, r?.base_fee].find((v) => v != null);
const money = (n) =>
  n == null ? "—" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

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

export default function UnifiedOrdersTable({
  role: roleProp,
  initialFilters = {},
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

  // Filters + scoping
  const seed = useMemo(() => {
    const base = {
      activeOnly: true,
      page: 0,
      pageSize,
      orderBy: "date_ordered",
      ascending: false,
      ...initialFilters,
    };
    if (isAppraiser) base.appraiserId = userId || null; // appraisers: mine only
    return base;
  }, [isAppraiser, userId, initialFilters, pageSize]);

  const { data = [], count = 0, loading, error, filters, setFilters } = useOrders(seed);
  const [expandedId, setExpandedId] = useState(null);
  const totalPages = Math.max(1, Math.ceil((count || 0) / (filters.pageSize || pageSize)));
  const refresh = () => setFilters((f) => ({ ...f }));
  const go = (p) => setFilters((f) => ({ ...f, page: Math.min(Math.max(0, p), totalPages - 1) }));

  // Role actions
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

  // Columns + persistence (order/width) with drag/resize
  const {
    active: columns,
    startResize,
    endResize,
    onDragStart,
    onDragOver,
    onDrop,
  } = useColumnsConfig(role, actionsCell);

  const template = columns.map((c) => c.width).join(" ");

  // resize handle
  function onResizeDown(e, key) {
    e.preventDefault();
    e.stopPropagation();            // do not start drag-reorder
    const startX = e.clientX;
    const onUp = (ev) => {
      window.removeEventListener("mouseup", onUp);
      endResize(ev.clientX);
    };
    startResize(key, startX);
    window.addEventListener("mouseup", onUp);
  }

  // sticky first column
  const stickyHeader = "bg-white sticky left-0 z-20 pr-4 border-r border-slate-200";
  const stickyCell   = "bg-white sticky left-0 z-10 pr-4 border-r border-slate-200";

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${className}`} style={style}>
      {error && (
        <div className="px-3 py-2 text-sm text-rose-700 bg-rose-50 border-b">
          Failed to load orders: {error.message}
        </div>
      )}

      <style>{`
        .col-wrap { position: relative; min-height: 36px; display:flex; align-items:stretch; gap:.5rem; padding:2px 4px 2px 8px; border-radius:6px; }
        .col-wrap:hover { background: rgba(0,0,0,.02); }
        .col-label { display:flex; align-items:center; gap:.5rem; width: calc(100% - 14px); cursor: grab; user-select:none; padding-right:8px; }
        .col-label:active { cursor: grabbing; }
        .col-resize { position:absolute; right:-6px; top:0; height:100%; width:14px; cursor:col-resize; display:flex; align-items:center; }
        .col-resize::after { content:""; width:2px; height:60%; background:#e5e7eb; border-radius:1px; opacity:0; transition:opacity .15s; margin-left:6px; }
        .col-wrap:hover .col-resize::after { opacity:.9; }
      `}</style>

      {/* header */}
      <div className="overflow-x-auto">
        <div
          className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b px-2 py-2 text-[12px] uppercase tracking-wide text-muted-foreground"
          style={{ display: "grid", gridTemplateColumns: template, columnGap: "1rem", minWidth: "1024px" }}
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

              <div
                className="col-resize"
                data-no-drawer
                onMouseDown={(e) => onResizeDown(e, c.key)}
                title="Drag to resize"
              />
            </div>
          ))}
        </div>

        {/* rows */}
        <div className="divide-y" style={{ minWidth: "1024px" }}>
          {loading ? (
            [...Array(filters.pageSize || pageSize)].map((_, i) => (
              <div key={i} className="px-4 py-3 text-sm text-muted-foreground">Loading…</div>
            ))
          ) : !data?.length ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No orders.</div>
          ) : (
            data.map((row) => {
              // drawer content once (so it’s built only when open)
              const drawerNode = (
                <div data-no-drawer>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold">Order {row.order_no ?? row.id?.slice(0, 8)}</div>
                    <OrderOpenFullLink orderId={row.id} />
                  </div>
                  <OrderDrawerContent orderId={row.id} order={row} onRefresh={refresh} />
                </div>
              );

              return (
                <OrdersTableRow
                  key={row.id}
                  order={row}
                  isOpen={expandedId === row.id}
                  onToggle={() => setExpandedId((x) => (x === row.id ? null : row.id))}
                  className="py-2.5"
                  renderCells={(o) => (
                    <div
                      className="items-start"
                      style={{ display: "grid", gridTemplateColumns: template, columnGap: "1rem" }}
                    >
                      {columns.map((c, idx) => {
                        // Make the address a tight maps link (only the text lines are clickable)
                        // inside renderCells: address column branch
if (c.key === "address") {
  const street  = o.address || "";
  const cline   = cityLine(o);
  const href    = mapsHref(street, cline);

  return (
    <div key={c.key} className={`min-w-0 ${idx === 0 ? stickyCell : ""}`}>
      {/* Street line */}
      <div className="text-sm leading-tight">
        {href ? (
          // Truncate on span, not on the <a>; anchor stays inline so only the text is clickable
          <span className="truncate inline-block max-w-full align-baseline">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline align-baseline"
              data-no-drawer
              onClick={(e) => e.stopPropagation()}
              title={`${street}${cline ? `, ${cline}` : ""}`}
            >
              {street || "—"}
            </a>
          </span>
        ) : (
          <span className="truncate inline-block max-w-full">{street || "—"}</span>
        )}
      </div>

      {/* City / State / ZIP line */}
      <div className="text-xs leading-tight">
        {href ? (
          <span className="truncate inline-block max-w-full align-baseline">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline align-baseline"
              data-no-drawer
              onClick={(e) => e.stopPropagation()}
              title={cline}
            >
              {cline || "—"}
            </a>
          </span>
        ) : (
          <span className="truncate inline-block max-w-full text-muted-foreground">
            {cline || "—"}
          </span>
        )}
      </div>

      {/* Property Type (not a link) */}
      <div className="text-xs text-muted-foreground leading-tight truncate">
        {o.property_type || "—"}
      </div>
    </div>
  );
}


                        return (
                          <div
                            key={c.key}
                            className={`truncate whitespace-nowrap overflow-hidden ${idx === 0 ? stickyCell : ""}`}
                          >
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
      <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground">
        <div>Page {filters.page + 1} / {totalPages} • {count ?? 0} total</div>
        <OrdersTablePagination
          currentPage={filters.page + 1}
          totalPages={totalPages}
          goToPage={(p) => go(p - 1)}
        />
      </div>
    </div>
  );
}































