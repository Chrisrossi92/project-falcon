import React, { useCallback, useMemo, useState } from "react";
import useRole from "@/lib/hooks/useRole";
import useSession from "@/lib/hooks/useSession";
import { useOrders } from "@/lib/hooks/useOrders";
import { formatOrderStatusLabel, normalizeOrderStatus, ORDER_STATUS } from "@/lib/constants/orderStatus";

import OrdersTableRow from "@/components/orders/table/OrdersTableRow";
import OrdersTablePagination from "@/components/orders/table/OrdersTablePagination";
import OrderDrawerContent from "@/components/orders/drawer/OrderDrawerContent";
import OrderOpenFullLink from "@/components/orders/drawer/OrderOpenFullLink";
import ReviewerActionCell from "@/components/orders/table/ReviewerActionCell";
import { updateOrderStatus } from "@/lib/api/orders";
import { sendOrderToReview, sendOrderBackToAppraiser, completeOrder, markReadyForClient } from "@/lib/services/ordersService";

import useColumnsConfig from "@/features/orders/columns/useColumnsConfig";
import { useToast } from "@/lib/hooks/useToast";

/* helpers */
const feeOf = (r) => [r?.base_fee, r?.appraiser_fee].find((v) => v != null);
const fmtMoney = (n) =>
  n == null ? "-" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const mapsHref = (street, cityline) => {
  const full = [street || "", cityline || ""].filter(Boolean).join(", ");
  return full ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}` : null;
};
const fmtDate = (d) => (!d ? "-" : isNaN(new Date(d)) ? "-" : new Date(d).toLocaleDateString());
const orderNumberOf = (row) =>
  row?.order_number || (row?.id || row?.order_id ? (row?.id || row?.order_id).slice(0, 8) : "");

function orderPkOf(o) {
  return o?.id || o?.order_id || null;
}

export default function UnifiedOrdersTable({
  role: roleProp,
  filters: appliedFilters = {},
  pageSize = 15,
  className = "",
  style = {},
  mode = null,
  reviewerId = null,
  scope = null,
}) {
  const { user: sessionUser } = useSession() || {};
  const { toast } = useToast();

  const { role: hookRole, userId: internalUserId, loading: roleLoading } = useRole() || {};
  const normalizedRole = (roleProp || hookRole || "appraiser").toString().toLowerCase();
  const isAdminLike = normalizedRole === "owner" || normalizedRole === "admin";
  const isReviewer = normalizedRole === "reviewer";
  const isAppraiser = normalizedRole === "appraiser";
  const role = normalizedRole;

  /* seed built from the **live** filters prop */
  const seed = useMemo(() => {
    const base = {
      activeOnly: appliedFilters.activeOnly ?? false,
      page: appliedFilters.page || 0,
      pageSize: appliedFilters.pageSize || pageSize,
      orderBy: appliedFilters.orderBy || "order_number",
      ascending: appliedFilters.ascending ?? false,
      search: appliedFilters.search || "",
      statusIn: appliedFilters.statusIn || [],
      clientId: appliedFilters.clientId || null,
      appraiserId: appliedFilters.appraiserId || null,
      assignedAppraiserId: appliedFilters.assignedAppraiserId || null,
      priority: appliedFilters.priority || "",
      dueWindow: appliedFilters.dueWindow || "",
      from: appliedFilters.from || "",
      to: appliedFilters.to || "",
    };
    if (role === "reviewer" && reviewerId) base.reviewerId = reviewerId;
    return base;
  }, [appliedFilters, pageSize, role, reviewerId]);

  const seedFinal = useMemo(() => {
    const enforced = { ...seed };
    if (isAppraiser) {
      enforced.appraiserId = internalUserId || null;
      enforced.assignedAppraiserId = null;
    }
    if (process.env.NODE_ENV === "development" && isAppraiser) {
      console.debug("[UnifiedOrdersTable] seedFinal (appraiser)", enforced);
    }
    return enforced;
  }, [seed, isAppraiser, internalUserId]);

  const [refreshTick, setRefreshTick] = useState(0);

  const {
    data = [],
    count = 0,
    loading,
    error,
    filters: tableFilters,
    setFilters: setTableFilters,
  } = useOrders(
    useMemo(() => ({ ...seedFinal, _tick: refreshTick }), [seedFinal, refreshTick]),
    {
      mode,
      reviewerId,
      scope,
      enabled: !roleLoading && (isAdminLike || isReviewer || (isAppraiser && Boolean(internalUserId))),
    }
  );

  const totalPages = Math.max(1, Math.ceil((count || 0) / (tableFilters.pageSize || pageSize)));
  const [expandedId, setExpandedId] = useState(null);

  const refresh = useCallback(() => setRefreshTick((x) => x + 1), []);
  const go = (p) => setTableFilters((f) => ({ ...f, page: Math.min(Math.max(0, p), totalPages - 1) }));

  const handleSendToReview = useCallback(
    async (order) => {
      const orderPk = orderPkOf(order);
      if (!orderPk) {
        toast({ title: "Error", description: "Missing order id.", tone: "error" });
        return;
      }

      try {
        await sendOrderToReview(orderPk, sessionUser?.id); // ✅ correct signature
        refresh();
        toast({
          title: "Sent to review",
          description: `Order ${order.order_number || orderPk} was sent to review.`,
          tone: "success",
        });
      } catch (err) {
        console.error("Failed to send to review", err);
        toast({
          title: "Error",
          description: err?.message ? `Failed to send to review: ${err.message}` : "Failed to send order to review.",
          tone: "error",
        });
      }
    },
    [sessionUser?.id, refresh, toast]
  );

  const handleSendBackToAppraiser = useCallback(
    async (order) => {
      const orderPk = orderPkOf(order);
      if (!orderPk) {
        toast({ title: "Error", description: "Missing order id.", tone: "error" });
        return;
      }

      try {
        await sendOrderBackToAppraiser(orderPk, sessionUser?.id);
        refresh();
        toast({
          title: "Sent back to appraiser",
          description: `Revisions requested for order ${order.order_number || orderPk}.`,
          tone: "success",
        });
      } catch (err) {
        console.error("Failed to send back to appraiser", err);
        toast({
          title: "Error",
          description: err?.message ? `Could not send back: ${err.message}` : "Could not send order back to appraiser.",
          tone: "error",
        });
      }
    },
    [sessionUser?.id, refresh, toast]
  );

  const handleCompleteOrder = useCallback(
    async (order) => {
      const orderPk = orderPkOf(order);
      if (!orderPk) {
        toast({ title: "Error", description: "Missing order id.", tone: "error" });
        return;
      }

      try {
        await completeOrder(orderPk, sessionUser?.id);
        refresh();
        toast({
          title: "Order completed",
          description: `Order ${order.order_number || orderPk} was marked complete.`,
          tone: "success",
        });
      } catch (err) {
        console.error("Failed to complete order", err);
        toast({
          title: "Error",
          description: err?.message ? `Could not complete: ${err.message}` : "Could not mark order complete.",
          tone: "error",
        });
      }
    },
    [sessionUser?.id, refresh, toast]
  );

  const handleReadyForClient = useCallback(
    async (order) => {
      const orderPk = orderPkOf(order);
      if (!orderPk) {
        toast({ title: "Error", description: "Missing order id.", tone: "error" });
        return;
      }

      try {
        await markReadyForClient(orderPk, sessionUser?.id);
        refresh();
        toast({
          title: "Marked ready for client",
          description: `Order ${order.order_number || orderPk} moved to client queue.`,
          tone: "success",
        });
      } catch (err) {
        console.error("Failed to mark ready for client", err);
        toast({
          title: "Error",
          description: err?.message ? `Could not mark ready: ${err.message}` : "Could not mark ready for client.",
          tone: "error",
        });
      }
    },
    [sessionUser?.id, refresh, toast]
  );

  const columnActions = useMemo(
    () => ({
      onSendToReview: handleSendToReview,
      onSendBackToAppraiser: handleSendBackToAppraiser,
      onComplete: handleCompleteOrder,
      onReadyForClient: handleReadyForClient,
    }),
    [handleSendToReview, handleSendBackToAppraiser, handleCompleteOrder, handleReadyForClient]
  );

  const columns = useColumnsConfig(normalizedRole, columnActions);
  const template = columns.map((c) => c.width).join(" ");

  const stickyHeader = "bg-white sticky left-0 z-20 pr-4 border-r border-slate-200";
  const stickyCell = "bg-white sticky left-0 z-10 pr-4 border-slate-200";

  return (
    <div className={`bg-white border rounded-xl overflow-x-auto ${className}`} style={style}>
      {error && (
        <div className="px-3 py-2 text-sm text-rose-700 bg-rose-50 border-b">
          Failed to load orders: {error.message}
        </div>
      )}

      {/* header */}
      <div className="overflow-x-auto">
        <div
          className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b px-2 py-2 text-[11px] uppercase tracking-wide text-slate-500"
          style={{ display: "grid", gridTemplateColumns: template, columnGap: ".25rem", minWidth: "900px" }}
        >
          {columns.map((c, idx) => (
            <div key={c.key} className={`px-2 py-1 ${idx === 0 ? stickyHeader : ""}`}>
              <div className="truncate">{c.header()}</div>
            </div>
          ))}
        </div>

        {/* rows */}
        <div className="divide-y" style={{ minWidth: "900px" }}>
          {loading ? (
            [...Array(tableFilters.pageSize || pageSize)].map((_, i) => (
              <div key={i} className="px-4 py-3 text-sm text-slate-500">
                Loading...
              </div>
            ))
          ) : !data?.length ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">No orders.</div>
          ) : (
            data.map((o, idx) => {
              const rowKey = o.order_id || o.id || o.order_number || `row-${tableFilters?.page ?? 0}-${idx}`;
              const orderPk = orderPkOf(o);

              const drawerNode = (
                <div data-no-drawer>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold">Order {orderNumberOf(o)}</div>
                    <OrderOpenFullLink orderId={orderPk} />
                  </div>
                  <OrderDrawerContent orderId={orderPk} order={o} onRefresh={refresh} />
                </div>
              );

              return (
                <OrdersTableRow
                  key={rowKey}
                  order={o}
                  isOpen={expandedId === rowKey}
                  onToggle={() => setExpandedId((x) => (x === rowKey ? null : rowKey))}
                  className="py-2.5"
                  renderCells={() => (
                    <div
                      className="items-start text-sm text-slate-800"
                      style={{ display: "grid", gridTemplateColumns: template, columnGap: ".25rem" }}
                    >
                      {columns.map((c, cIdx) => {
                        // Status column special rendering
                        if (c.key === "status") {
                          const rawStatus = normalizeOrderStatus(o.status_normalized || o.status);
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

                        // Default cell
                        return (
                          <div key={c.key} className={cIdx === 0 ? stickyCell : ""}>
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
      <div className="border-t bg-slate-50/80 px-2 py-1.5 flex items-center justify-between text-xs text-slate-600">
        <div>
          Page {tableFilters.page + 1} / {totalPages} — {count || 0} total
        </div>
        <OrdersTablePagination currentPage={tableFilters.page + 1} totalPages={totalPages} goToPage={(p) => go(p - 1)} />
      </div>
    </div>
  );
}
