import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { fetchOrdersWithFilters } from "@/lib/api/orders"; // v_orders_frontend-backed
import { useRole } from "@/lib/hooks/useRole";
import OrdersTableHeader from "@/components/orders/table/OrdersTableHeader.jsx";
import OrdersTableRow from "@/components/orders/table/OrdersTableRow.jsx";
import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge.jsx";
import AppointmentCell from "@/components/orders/drawer/AppointmentCell.jsx";
import QuickActionCell from "@/components/orders/table/QuickActionCell.jsx";
import OrdersTablePagination from "@/components/orders/table/OrdersTablePagination.jsx";
import OrderDrawerContent from "@/components/orders/drawer/OrderDrawerContent.jsx";

const PAGE_SIZE = 15;

export default function DashboardOrdersPanel() {
  const { isAdmin, isReviewer, userId } = useRole() || {};
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawerOrder, setDrawerOrder] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)),
    [count]
  );

  async function load() {
    setLoading(true);
    const { rows, count } = await fetchOrdersWithFilters({
      search,
      activeOnly: true,                         // dashboard = active only
      appraiserId: (isAdmin || isReviewer) ? null : userId, // role-aware
      page: page - 1,
      pageSize: PAGE_SIZE,
      orderBy: "date_ordered",
      ascending: false,
    });
    setRows(rows || []);
    setCount(count || 0);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search, page, isAdmin, isReviewer, userId]);

  function goToPage(next) {
    if (next < 1 || next > totalPages) return;
    setPage(next);
  }

  function toggleRow(id) {
  setExpandedId((cur) => (cur === id ? null : id));
}

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      {/* table header (sticky) */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <h3 className="font-semibold">Active Orders</h3>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Search order # / address"
            className="border rounded px-2 py-1 text-sm"
          />
          <div className="text-sm text-muted-foreground">{count} total</div>
        </div>
      </div>

      <OrdersTableHeader /> {/* columns: Order | Client/Address (Due) | Appointment | Send */}

      {/* rows */}
      <div className="divide-y">
        {loading
          ? [...Array(PAGE_SIZE)].map((_, i) => (
              <div key={i} className="px-4 py-3 text-sm text-muted-foreground">Loading…</div>
            ))
          : rows.map((o) => (
              <OrdersTableRow
  key={o.id}
  order={o}
  onOpenDrawer={() => setDrawerOrder(o)}
  renderCells={(r) => {
    const fmtD = (d) => (d ? new Date(d).toLocaleDateString() : "—");
    return (
      <div className="grid grid-cols-[120px_180px_minmax(320px,1fr)_140px_180px_130px_70px] gap-4 py-2 items-start">
        {/* Order / Status (stacked) */}
        <div className="text-sm">
          <div className="font-medium leading-tight">{r.order_no ?? "—"}</div>
          <div className="mt-1">
            <OrderStatusBadge status={r.status} /> {/* pill */} {/* :contentReference[oaicite:2]{index=2} */}
          </div>
        </div>

        {/* Client */}
        <div className="text-sm truncate">
          <div className="font-medium truncate">{r.client_name ?? "—"}</div>
          <div className="text-xs text-muted-foreground truncate">{r.appraiser_name ?? ""}</div>
        </div>

        {/* Address (wide) */}
        <div className="text-sm min-w-0">
          <div className="truncate">{r.address ?? "—"}</div>
          <div className="text-xs text-muted-foreground truncate">{r.display_subtitle ?? ""}</div>
        </div>

        {/* Property Type (fixed) */}
        <div className="text-sm truncate">
          {r.property_type ?? "—"}
        </div>

        {/* Appointment cell (admin can set; appraiser sees quick actions) */}
        <div className="text-sm">
          {(isAdmin || isReviewer)
            ? (
              <AppointmentCell
                siteVisitAt={r.site_visit_at}
                onSetAppointment={async (iso) => {
                  // keep your existing service if you prefer
                  await updateSiteVisitAt(r.id, iso, { address: r.address, appraiserId: r.appraiser_id });
                  await load();  // refresh
                }}
              />
            )
            : <QuickActionCell order={r} onChanged={load} />} {/* :contentReference[oaicite:3]{index=3} :contentReference[oaicite:4]{index=4} */}
        </div>

        {/* Due (stacked, fixed width) */}
        <div className="text-[12px] leading-tight">
          <div><span className="text-muted-foreground">Site</span>  — {fmtD(r.site_visit_at)}</div>
          <div><span className="text-muted-foreground">Review</span>— {fmtD(r.review_due_at)}</div>
          <div><span className="text-muted-foreground">Final</span> — {fmtD(r.final_due_at ?? r.due_date)}</div>
        </div>

        {/* Send column (kept for alignment; your QuickActionCell already has "Send") */}
        <div className="text-right text-sm text-muted-foreground" data-no-drawer> </div>
      </div>
    );
  }}
/>

            ))}
        {!loading && rows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {(isAdmin || isReviewer) ? "No active orders." : "No active orders assigned to you."}
          </div>
        )}
      </div>

      {/* pagination */}
      <div className="pb-3">
        <OrdersTablePagination currentPage={page} totalPages={totalPages} goToPage={goToPage} />
      </div>

      {/* drawer (portal) */}
      {drawerOrder &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/30" onClick={()=>setDrawerOrder(null)}>
            <div
              className="absolute right-0 top-0 h-full w-[540px] bg-white shadow-xl p-3"
              onClick={(e)=>e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="font-semibold">{drawerOrder.display_title || drawerOrder.order_no}</div>
                <button className="text-sm text-muted-foreground" onClick={()=>setDrawerOrder(null)}>Close</button>
              </div>
              <div className="pt-3">
                <OrderDrawerContent orderId={drawerOrder.id} order={drawerOrder} compact onRefresh={load} />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

