// src/components/orders/dashboard/DashboardOrdersTable.jsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchOrdersWithFilters } from "@/lib/api/orders";
import { useRole } from "@/lib/hooks/useRole";
import OrdersTableRow from "@/components/orders/table/OrdersTableRow.jsx";
import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge.jsx";
import AppointmentCell from "@/components/orders/drawer/AppointmentCell.jsx";
import QuickActionCell from "@/components/orders/table/QuickActionCell.jsx";
import OrdersTablePagination from "@/components/orders/table/OrdersTablePagination.jsx";
import OrderDrawerContent from "@/components/orders/drawer/OrderDrawerContent.jsx";
import OrderOpenFullLink from "@/components/orders/drawer/OrderOpenFullLink.jsx";

const PAGE_SIZE = 15;

const PILL = {
  review: "bg-amber-50 text-amber-700 border border-amber-200",
  final:  "bg-blue-50  text-blue-700  border border-blue-200",
};
const DuePill = ({ tone, children }) => (
  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>{children}</span>
);

// fee normalizer (covers your view & raw orders)
 const pickFee = (r) => {
   // prefer fee_amount; fall through to fee/base_fee/etc.
   const tries = [r?.fee_amount, r?.fee, r?.base_fee, r?.fee_total];
   return tries.find((v) => v !== null && v !== undefined);
};

const fmtMoney = (n) =>
  n == null ? "—" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtD = (d) => (d ? new Date(d).toLocaleDateString() : "—");

export default function DashboardOrdersPanel() {
  const { isAdmin, isReviewer, userId } = useRole() || {};
  const isMgr = isAdmin || isReviewer;
  const appraiserView = !isMgr;

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)), [count]);

  console.log("role flags", { isAdmin, isReviewer, userId, appraiserView: !isAdmin && !isReviewer });

  async function load() {
    setLoading(true);
    const { rows, count } = await fetchOrdersWithFilters({
      search,
      activeOnly: true,
      appraiserId: appraiserView ? userId : null, // appraisers -> only mine
      page: page - 1,
      pageSize: PAGE_SIZE,
      orderBy: "date_ordered",
      ascending: false,
    });
    setRows(rows || []);
    setCount(count || 0);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search, page, appraiserView, userId]);

  function goToPage(next) { if (next < 1 || next > totalPages) return; setPage(next); }

  // fixed tracks so the table stays balanced
  // Admin/Reviewer: Order | Client | Address | Fee/Type | Appraiser | Actions | Due
  // Appraiser:      Order | Client | Address | Fee/Type | Actions   | Due
  const GRID = isMgr
    ? "grid grid-cols-[120px_220px_360px_180px_180px_160px_200px] gap-4"
    : "grid grid-cols-[120px_220px_420px_180px_160px_200px] gap-4";

  function renderCells(r) {
    const orderNo   = r.order_no ?? r.order_number ?? String(r.id || "").slice(0, 8);
    const client    = r.client_name ?? "—";
    const streetRaw = r.property_address ?? r.address ?? "";
    const street    = streetRaw.replace(/^\s*[—–-]\s*/, ""); // strip any leading dash
    const city      = r.city ?? "";
    const state     = r.state ?? "";
    const zip       = r.postal_code ?? r.zip ?? "";
    const cityLine  = [city, state].filter(Boolean).join(", ") + (zip ? ` ${zip}` : "");
    const type      = r.property_type ?? "—";
    const appraiser = r.appraiser_name ?? "—";
    const siteAt    = r.site_visit_at;
    const revAt     = r.review_due_at ?? r.due_for_review;
    const finAt     = r.final_due_at ?? r.due_to_client ?? r.due_date;
    const fee       = pickFee(r);

    return (
      <div className={`${GRID} py-2 items-start`}>
        {/* Order / Status */}
        <div className="text-sm">
          <div className="font-medium leading-tight">{orderNo}</div>
          <div className="mt-1"><OrderStatusBadge status={r.status} /></div>
        </div>

        {/* Client */}
        <div className="text-sm truncate">
          <div className="font-medium truncate">{client}</div>
        </div>

        {/* Address: street top, city/state/zip bottom */}
        <div className="text-sm min-w-0">
          <div className="truncate">{street || "—"}</div>
          <div className="text-xs text-muted-foreground truncate">{cityLine}</div>
        </div>

        {/* Fee / Type (fills right of address) */}
        <div className="text-sm">
          <div className="font-medium">{fmtMoney(fee)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{type}</div>
        </div>

        {/* Appraiser (admin/reviewer only) */}
        {isMgr && <div className="text-sm truncate">{appraiser}</div>}

        {/* Actions / Appointment */}
        <div className="text-sm" data-no-drawer>
          {isMgr ? (
            <AppointmentCell siteVisitAt={siteAt} onSetAppointment={load} />
          ) : (
            <QuickActionCell order={r} onChanged={load} />
          )}
        </div>

        {/* Due */}
        <div className="text-[12px] leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Review</span>
            <DuePill tone={PILL.review}>{fmtD(revAt)}</DuePill>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-muted-foreground">Final</span>
            <DuePill tone={PILL.final}>{fmtD(finAt)}</DuePill>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      {/* header */}
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

      {/* sticky header row */}
      <div className={`sticky top-0 z-10 bg-white/90 backdrop-blur border-y px-4 py-2 text-[12px] uppercase tracking-wide text-muted-foreground ${GRID}`}>
        <div>Order / Status</div>
        <div>Client</div>
        <div>Address</div>
        <div>Fee / Type</div>
        {isMgr && <div>Appraiser</div>}
        <div>{isMgr ? "Appointment" : "Actions"}</div>
        <div>Due</div>
      </div>

      {/* rows */}
      <div className="divide-y">
        {loading
          ? [...Array(PAGE_SIZE)].map((_, i) => <div key={i} className="px-4 py-3 text-sm text-muted-foreground">Loading…</div>)
          : rows.map((o) => (
              <OrdersTableRow
                key={o.id}
                order={o}
                isOpen={expandedId === o.id}
                onToggle={() => setExpandedId((cur) => (cur === o.id ? null : o.id))}
                renderCells={renderCells}
                drawer={
                  <div data-no-drawer>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold">
                        Order {o.display_title || o.order_no || String(o.id || "").slice(0,8)}
                      </div>
                      <OrderOpenFullLink orderId={o.id} />
                    </div>
                    <OrderDrawerContent orderId={o.id} order={o} compact onRefresh={load} />
                  </div>
                }
              />
            ))}
        {!loading && rows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {isMgr ? "No active orders." : "No active orders assigned to you."}
          </div>
        )}
      </div>

      {/* pagination (unchanged) */}
      <div className="pb-3">
        <OrdersTablePagination currentPage={page} totalPages={totalPages} goToPage={goToPage} />
      </div>
    </div>
  );
}





