// src/features/orders/UnifiedOrdersTable.jsx
import React, { useMemo, useState } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import { useRole } from "@/lib/hooks/useRole";
import { useSession } from "@/lib/hooks/useSession";

import OrdersTableHeader from "@/components/orders/table/OrdersTableHeader";
import OrdersTableRow from "@/components/orders/table/OrdersTableRow";
import OrdersTablePagination from "@/components/orders/table/OrdersTablePagination";
import OrderDrawerContent from "@/components/orders/drawer/OrderDrawerContent";
import AppointmentCell from "@/components/orders/drawer/AppointmentCell";
import StatusBadge from "@/features/orders/StatusBadge";
import { startReview, updateOrderDates } from "@/lib/services/ordersService";

const fmtDate = (d) => (!d ? "—" : isNaN(new Date(d)) ? "—" : new Date(d).toLocaleDateString());
function dateTone(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const days = Math.floor((d - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "text-red-600 font-medium";
  if (days <= 2) return "text-amber-600";
  return "text-muted-foreground";
}

export default function UnifiedOrdersTable({
  role: roleProp,                 // "admin" | "reviewer" | "appraiser" (optional)
  pageSize = 8,
  className = "",
  style = {},
  usersList = [],
  initialFilters = {},            // optional external defaults
}) {
  const { role: hookRole } = useRole() || {};
  const { user } = useSession() || {};
  const me = user?.id || user?.user_id || user?.uid || null;

  const role = (roleProp || hookRole || "").toLowerCase();
  const isAdminOrReviewer = role === "admin" || role === "reviewer";

  // seed filters; if not admin/reviewer -> pin to me
  const seedFilters = useMemo(() => {
    const base = {
      activeOnly: true,
      page: 0,
      pageSize,
      orderBy: "date_ordered",
      ascending: false,
      ...initialFilters,
    };
    if (!isAdminOrReviewer) base.appraiserId = me || null;
    return base;
  }, [isAdminOrReviewer, me, pageSize, initialFilters]);

  // Important: pass appraiserId in the initial call so the service filters server-side
  const {
    data = [],
    count = 0,
    loading,
    error,
    filters,
    setFilters,
  } = useOrders(seedFilters);

  const [expandedId, setExpandedId] = useState(null);
  const totalPages = Math.max(1, Math.ceil((count || 0) / (filters.pageSize || pageSize)));

  const goToPage = (next) =>
    setFilters((f) => ({ ...f, page: Math.min(Math.max(0, next), totalPages - 1) }));

  return (
    <div className={className} style={style}>
      {error && (
        <div className="mb-3 rounded-md border bg-red-50 text-red-700 px-3 py-2 text-sm">
          Failed to load orders: {error.message}
        </div>
      )}

      <OrdersTableHeader />

      <div>
        {loading ? (
          [...Array(filters.pageSize || pageSize)].map((_, i) => (
            <div key={i} className="px-4 py-2 border-b text-sm text-muted-foreground">Loading…</div>
          ))
        ) : data.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">No orders.</div>
        ) : (
          data.flatMap((o) => {
            const reviewDue = o.review_due_at ?? o.review_due_date ?? null;
            const finalDue  = o.final_due_at  ?? o.due_date ?? null;

            return [
              <OrdersTableRow
                key={o.id}
                order={o}
                onOpenDrawer={() => setExpandedId((x) => (x === o.id ? null : o.id))}
                className="py-2.5"
                renderCells={(order) => (
                  <div className="flex items-start gap-4 py-1">
                    {/* Order (status under number) */}
                    <div className="basis-28 shrink-0">
                      <div className="font-medium leading-5">
                        {order.order_no ?? order.order_number ?? order.id.slice(0, 8)}
                      </div>
                      <div className="mt-1">
                        <StatusBadge status={order.status} />
                      </div>
                    </div>

                    {/* Client / Address with due on right */}
                    <div className="grow min-w-0">
                      <div className="flex items-center justify-between gap-3 min-w-0">
                        <div className="font-medium truncate">{order.client_name ?? "—"}</div>
                        <div className="hidden md:block text-right text-xs whitespace-nowrap">
                          <span className={dateTone(finalDue)}>Final: {fmtDate(finalDue)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 min-w-0">
                        <div className="text-sm text-muted-foreground truncate">{order.address ?? "—"}</div>
                        <div className="hidden md:block text-right text-xs text-muted-foreground whitespace-nowrap">
                          <span className={dateTone(reviewDue)}>Review: {fmtDate(reviewDue)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Appointment */}
                    <div className="basis-40 shrink-0">
                      <AppointmentCell
                        siteVisitAt={order.site_visit_at}
                        onSetAppointment={(iso) =>
                          updateOrderDates(order.id, { site_visit_at: iso }).then(() =>
                            setFilters((f) => ({ ...f }))
                          )
                        }
                      />
                    </div>

                    {/* Send to review */}
                    <div className="basis-16 shrink-0">
                      <button
                        data-interactive
                        className="px-2 py-1 text-xs rounded border hover:bg-muted transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          startReview(order.id).then(() => setFilters((f) => ({ ...f })));
                        }}
                        disabled={
                          String(order.status || "").toLowerCase() === "in_review" ||
                          String(order.status || "").toLowerCase() === "complete"
                        }
                        title="Send this order to review"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              />,
              expandedId === o.id ? (
                <div key={o.id + "-exp"} className="px-4 py-3 bg-muted/30">
                  <OrderDrawerContent
                    orderId={o.id}
                    row={o}
                    onAfterChange={() => setFilters((f) => ({ ...f }))}
                  />
                </div>
              ) : null,
            ].filter(Boolean);
          })
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground">
        <div>Page {filters.page + 1} / {totalPages} • {count ?? 0} total</div>
        <OrdersTablePagination
          currentPage={filters.page + 1}
          totalPages={totalPages}
          goToPage={(p) => goToPage(p - 1)}
        />
      </div>
    </div>
  );
}




















