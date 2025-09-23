// src/components/orders/dashboard/DashboardOrdersTable.jsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchOrdersWithFilters } from "@/lib/api/orders"; // v_orders_frontend-backed
import { useRole } from "@/lib/hooks/useRole";
import OrdersTableRow from "@/components/orders/table/OrdersTableRow.jsx";
import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge.jsx";
import AppointmentCell from "@/components/orders/drawer/AppointmentCell.jsx";
import QuickActionCell from "@/components/orders/table/QuickActionCell.jsx";
import OrdersTablePagination from "@/components/orders/table/OrdersTablePagination.jsx";
import OrderDrawerContent from "@/components/orders/drawer/OrderDrawerContent.jsx";
import OrderOpenFullLink from "@/components/orders/drawer/OrderOpenFullLink.jsx";

const PAGE_SIZE = 15;

// small colored due “pills”
const PILL = {
  review: "bg-amber-50 text-amber-700 border border-amber-200",
  final:  "bg-blue-50  text-blue-700  border border-blue-200",
};
const DuePill = ({ tone, children }) => (
  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>
    {children}
  </span>
);

export default function DashboardOrdersPanel() {
  const { isAdmin, isReviewer, userId } = useRole() || {};
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)),
    [count]
  );

  function normalizeAddress(raw = "", client = "") {
  const s = String(raw).trim();
  if (!s) return "—";

  // split on em–dash or hyphen patterns
  const parts = s.split(/\s*[—–-]\s*/g); // em dash, en dash, hyphen
  if (parts.length > 1) {
    const first = parts[0].trim().toLowerCase();
    const clientClean = String(client).trim().toLowerCase();
    if (clientClean && first === clientClean) {
      return parts.slice(1).join(" — ").trim() || "—";
    }
  }

  // remove a lone leading dash like "— 456 Oak Ave"
  return s.replace(/^\s*[—–-]\s*/, "").trim() || "—";
}


  async function load() {
    setLoading(true);
    const { rows, count } = await fetchOrdersWithFilters({
      search,
      activeOnly: true, // dashboard = active only
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

  const fmtD = (d) => (d ? new Date(d).toLocaleDateString() : "—");

  function renderCells(r) {
    const orderNo = r.order_no ?? String(r.id || "").slice(0, 8);
    const client  = r.client_name ?? "—";
    const streetRaw = r.property_address ?? r.address ?? "";
    const street    = normalizeAddress(streetRaw, client);
    const city    = r.city ?? "";
    const state   = r.state ?? "";
    const zip     = r.postal_code ?? r.zip ?? "";
    const cityLine = [city, state].filter(Boolean).join(", ") + (zip ? ` ${zip}` : "");
    const type    = r.property_type ?? "—";

    const siteAt  = r.site_visit_at;
    const revAt   = r.review_due_at ?? r.due_for_review;
    const finAt   = r.final_due_at ?? r.due_to_client ?? r.due_date;

    return (
      <div className="grid grid-cols-[120px_220px_minmax(320px,1fr)_140px_220px_220px] gap-4 py-2 items-start">
        {/* Order / Status */}
        <div className="text-sm">
          <div className="font-medium leading-tight">{orderNo}</div>
          <div className="mt-1"><OrderStatusBadge status={r.status} /></div>
        </div>

        {/* Client (single spot, no duplicate) */}
        <div className="text-sm truncate">
          <div className="font-medium truncate">{client}</div>
          <div className="text-xs text-muted-foreground truncate">{r.appraiser_name ?? ""}</div>
        </div>

        {/* Address (two lines) */}
        <div className="text-sm min-w-0">
          <div className="truncate">{street}</div>
          <div className="text-xs text-muted-foreground truncate">
            {cityLine || (r.display_subtitle ?? "")}
          </div>
        </div>

        {/* Property Type */}
        <div className="text-sm truncate">{type}</div>

        {/* Appointment cell (admin/reviewer can set; appraiser sees quick actions) */}
        <div className="text-sm" data-no-drawer>
          {(isAdmin || isReviewer)
            ? (
              <AppointmentCell
                siteVisitAt={siteAt}
                onSetAppointment={async (iso) => {
                  // if you have a service, swap this call in; otherwise update via RPC/table inside the component
                  // then refresh:
                  await load();
                }}
              />
            )
            : <QuickActionCell order={r} onChanged={load} />}
        </div>

        {/* Dues (color for readability) */}
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

      {/* header row matching the grid */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-y px-4 py-2 text-[12px] uppercase tracking-wide text-muted-foreground grid grid-cols-[120px_220px_minmax(320px,1fr)_140px_220px_220px] gap-4">
        <div>Order / Status</div>
        <div>Client</div>
        <div>Address</div>
        <div>Type</div>
        <div>Appointment</div>
        <div>Due</div>
      </div>

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
            {(isAdmin || isReviewer) ? "No active orders." : "No active orders assigned to you."}
          </div>
        )}
      </div>

      {/* pagination */}
      <div className="pb-3">
        <OrdersTablePagination currentPage={page} totalPages={totalPages} goToPage={goToPage} />
      </div>
    </div>
  );
}


