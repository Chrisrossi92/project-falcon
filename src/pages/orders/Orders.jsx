// src/pages/Orders.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { Card } from "@/components/ui/Card.jsx";
import SectionHeader from "@/components/ui/SectionHeader";
import { fetchOrdersWithFilters } from "@/lib/api/orders";

import OrdersTableHeader from "@/components/orders/table/OrdersTableHeader";
import OrdersTableRow from "@/components/orders/table/OrdersTableRow";
import OrderInlineDrawer from "@/components/orders/table/OrderInlineDrawer";
import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge";
import OrdersTablePagination from "@/components/orders/table/OrdersTablePagination";
import NewOrderButton from "@/components/orders/NewOrderButton";

import { ORDER_STATUS } from "@/lib/constants/orderStatus";
import { useSession } from "@/lib/hooks/useSession";
import { useRole } from "@/lib/hooks/useRole";

/* ===== compact grid used by header + rows (keep in sync with header file) ===== */
// Order/Status 100 | Fee 100 | Client/Type/Address 360+ | Appraiser 140 | Dates 200
const GRID = "grid grid-cols-[100px_100px_minmax(360px,1fr)_140px_200px]";
const TABLE_MIN_W = 900; // 100 + 100 + 360 + 140 + 200 = 900

const PAGE_SIZE = 50;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtMoney = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });

function useDebounce(v, delay = 300) {
  const [x, setX] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setX(v), delay);
    return () => clearTimeout(t);
  }, [v, delay]);
  return x;
}
const getUserId = (user) => user?.id || user?.user_id || user?.auth_id || user?.uid || null;

const Tone = ({ children, tone }) => (
  <span
    className={
      tone === "green"
        ? "text-emerald-700"
        : tone === "yellow"
        ? "text-amber-600"
        : tone === "red"
        ? "text-rose-600"
        : ""
    }
  >
    {children}
  </span>
);

/* ================= Top filter bar (all filters up here) ================= */
function TopFilterBar({ filters, onChange, clients, appraisers, showAppraiserPicker }) {
  const [local, setLocal] = useState(filters);
  useEffect(() => setLocal(filters), [filters]);
  const apply = () => onChange({ ...local, page: 0 });
  const clear = () =>
    onChange({
      search: "",
      statusIn: [],
      clientId: null,
      appraiserId: showAppraiserPicker ? null : filters.appraiserId ?? null,
      from: "",
      to: "",
      activeOnly: true,
      page: 0,
      pageSize: PAGE_SIZE,
      orderBy: "date_ordered",
      ascending: false,
      lazy: filters.lazy,
      // column-like filters (optional; supported by fetchOrdersWithFilters)
      orderNo: "",
      feeMin: "",
      feeMax: "",
      colClient: "",
      colType: "",
      colAddress: "",
      colAppraiser: "",
      apptFrom: "",
      apptTo: "",
      reviewFrom: "",
      reviewTo: "",
      dueFrom: "",
      dueTo: "",
    });

  return (
    <Card className="p-4">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-4">
          <label className="block text-xs text-muted-foreground mb-1">Search</label>
          <input
            className="w-full border rounded px-2 py-1"
            placeholder="Order # / Title / Address"
            value={local.search}
            onChange={(e) => setLocal((v) => ({ ...v, search: e.target.value }))}
          />
        </div>

        <div className="col-span-6 lg:col-span-3">
          <label className="block text-xs text-muted-foreground mb-1">Client</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={local.clientId ?? ""}
            onChange={(e) => setLocal((v) => ({ ...v, clientId: e.target.value ? Number(e.target.value) : null }))}
          >
            <option value="">All</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {showAppraiserPicker && (
          <div className="col-span-6 lg:col-span-3">
            <label className="block text-xs text-muted-foreground mb-1">Appraiser</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={local.appraiserId ?? ""}
              onChange={(e) => setLocal((v) => ({ ...v, appraiserId: e.target.value || null }))}
            >
              <option value="">All</option>
              {appraisers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="col-span-3 lg:col-span-1">
          <label className="block text-xs text-muted-foreground mb-1">From</label>
          <input
            type="date"
            className="w-full border rounded px-2 py-1"
            value={local.from ?? ""}
            onChange={(e) => setLocal((v) => ({ ...v, from: e.target.value }))}
          />
        </div>
        <div className="col-span-3 lg:col-span-1">
          <label className="block text-xs text-muted-foreground mb-1">To</label>
          <input
            type="date"
            className="w-full border rounded px-2 py-1"
            value={local.to ?? ""}
            onChange={(e) => setLocal((v) => ({ ...v, to: e.target.value }))}
          />
        </div>

        <div className="col-span-12">
          <label className="block text-xs text-muted-foreground mb-1">Status</label>
          <div className="flex flex-wrap gap-2 border rounded px-2 py-2">
            {Object.values(ORDER_STATUS).map((s) => {
              const checked = local.statusIn.includes(s);
              const label = s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setLocal((v) => ({
                      ...v,
                      statusIn: checked ? v.statusIn.filter((x) => x !== s) : [...v.statusIn, s],
                    }))
                  }
                  className={`px-2 py-1 rounded border text-xs ${
                    checked ? "bg-black text-white border-black" : "bg-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
            <div className="ml-auto flex gap-2">
              <button className="px-2 py-1 text-xs border rounded" onClick={() => setLocal((v) => ({ ...v, statusIn: [] }))}>
                Clear
              </button>
              <button
                className="px-2 py-1 text-xs border rounded"
                onClick={() => setLocal((v) => ({ ...v, statusIn: [...Object.values(ORDER_STATUS)] }))}
              >
                All
              </button>
            </div>
          </div>
        </div>

        <div className="col-span-12 flex items-center gap-6 mt-1">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!local.activeOnly}
              onChange={(e) => setLocal((v) => ({ ...v, activeOnly: e.target.checked }))}
            />
            Active only (exclude Completed)
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!local.lazy}
              onChange={(e) => onChange({ ...local, lazy: e.target.checked, page: 0 })}
            />
            Infinite scroll (lazy load)
          </label>

          <div className="ml-auto flex gap-2">
            <button className="border rounded px-3 py-1 text-sm" onClick={clear}>
              Clear
            </button>
            <button className="border rounded px-3 py-1 bg-black text-white text-sm" onClick={apply}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ========================== Page ========================== */
export default function OrdersPage() {
  const { user } = useSession();
  const { isAdmin, isReviewer } = useRole() || {};
  const me = getUserId(user);
  const showAppraiserPicker = !!(isAdmin || isReviewer);

  const [clients, setClients] = useState([]);
  const [appraisers, setAppraisers] = useState([]);

  const [filters, setFilters] = useState({
    search: "",
    statusIn: [],
    clientId: null,
    appraiserId: (!isAdmin && !isReviewer && me) ? String(me) : null,
    from: "",
    to: "",
    activeOnly: true,
    page: 0,
    pageSize: PAGE_SIZE,
    orderBy: "date_ordered",
    ascending: false,
    lazy: false,

    // optional “column-like” filters supported by fetchOrdersWithFilters
    orderNo: "",
    feeMin: "",
    feeMax: "",
    colClient: "",
    colType: "",
    colAddress: "",
    colAppraiser: "",
    apptFrom: "",
    apptTo: "",
    reviewFrom: "",
    reviewTo: "",
    dueFrom: "",
    dueTo: "",
  });
  const debouncedSearch = useDebounce(filters.search, 300);

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const sentinelRef = useRef(null);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((count || 0) / (filters.pageSize || PAGE_SIZE))),
    [count, filters.pageSize]
  );

  useEffect(() => {
    (async () => {
      const [{ data: cl }, { data: aps }] = await Promise.all([
        supabase.from("clients").select("id,name").order("name", { ascending: true }),
        supabase.from("users").select("id,full_name").order("full_name", { ascending: true }),
      ]);
      setClients(cl ?? []);
      setAppraisers(aps ?? []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { rows: data, count: c } = await fetchOrdersWithFilters({
        ...filters,
        search: debouncedSearch,
      });
      setCount(c || 0);
      if (filters.lazy && filters.page > 0) setRows((prev) => [...(prev || []), ...(data || [])]);
      else setRows(data || []);
      setLoading(false);
    })();
  }, [
    debouncedSearch,
    filters.statusIn.join("|"),
    filters.clientId,
    filters.appraiserId,
    filters.from,
    filters.to,
    filters.activeOnly,
    filters.page,
    filters.pageSize,
    filters.orderBy,
    filters.ascending,
    filters.lazy,

    // if you wire the detailed filters in your API, these will also refetch:
    filters.orderNo,
    filters.feeMin,
    filters.feeMax,
    filters.colClient,
    filters.colType,
    filters.colAddress,
    filters.colAppraiser,
    filters.apptFrom,
    filters.apptTo,
    filters.reviewFrom,
    filters.reviewTo,
    filters.dueFrom,
    filters.dueTo,
  ]);

  useEffect(() => {
    if (!filters.lazy) return;
    if (filters.page + 1 >= totalPages) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((ents) =>
      ents.forEach((e) => e.isIntersecting && setFilters((f) => ({ ...f, page: f.page + 1 })))
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [filters.lazy, filters.page, totalPages]);

  const goToPage = (p) => setFilters((f) => ({ ...f, page: Math.max(0, Math.min(p - 1, totalPages - 1)) }));

  /* ===== Row cells (compact, uniform widths; no overflow) ===== */
  function renderCells(o) {
    const id = o.id;
    const orderNo = o.order_no ?? o.order_number ?? "—";
    const fee = fmtMoney(o.fee_amount);

    // Address
    const line1 = o.address_line1 || o.address || (o.display_subtitle || "").replace(/^.*—\s*/, "") || "";
    const city = o.city || "";
    const state = o.state || "";
    const zip = o.zip || o.postal_code || "";
    const fullAddress = [line1, [city, state].filter(Boolean).join(", "), zip].filter(Boolean).join(" ").trim();
    const mapsHref = fullAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
      : undefined;

    const type = o.property_type || o.asset_type || "";
    const appraiser = o.appraiser_name || "—";

    const appt = o.site_visit_at ? fmtDate(o.site_visit_at) : "—";
    const review = o.review_due_at ? fmtDate(o.review_due_at) : "—";
    const due = o.final_due_at ? fmtDate(o.final_due_at) : fmtDate(o.due_date);

    return (
      <div className={`${GRID} items-center gap-3 py-2.5 px-4`} role="row" aria-controls={`drawer-${id}`}>
        {/* Order / Status (black order #) */}
        <div className="min-w-0 leading-tight">
          <div className="font-medium text-gray-900 truncate">{orderNo}</div>
          <OrderStatusBadge status={o.status} className="mt-1" />
        </div>

        {/* Fee */}
        <div className="text-right leading-tight">{fee}</div>

        {/* Client / Type / Address (slightly narrower, still readable) */}
        <div className="min-w-0 leading-tight">
          <div className="font-medium truncate">
            {o.client_name || "—"} {type ? <span className="text-muted-foreground">/ {type}</span> : null}
          </div>
          {fullAddress ? (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-blue-700 hover:underline block truncate"
              title={fullAddress}
            >
              {line1}
              {(city || state || zip) && (
                <span className="text-muted-foreground">
                  {" "}
                  — {[city, state].filter(Boolean).join(", ")} {zip}
                </span>
              )}
            </a>
          ) : (
            <div className="text-[13px] text-muted-foreground truncate">{o.display_subtitle || "—"}</div>
          )}
        </div>

        {/* Appraiser */}
        <div className="truncate leading-tight">{appraiser}</div>

        {/* Dates (stacked, color-coded, no wrap) */}
        <div className="grid grid-cols-3 gap-2 text-right leading-tight whitespace-nowrap">
          <div>
            <div className="text-[11px] text-muted-foreground">Appt</div>
            <Tone tone="green">{appt}</Tone>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Review</div>
            <Tone tone="yellow">{review}</Tone>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Due</div>
            <Tone tone="red">{due}</Tone>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <SectionHeader
        title="Orders"
        subtitle="Search, filter, and export orders"
        actions={
          <div className="flex items-center gap-2">
            <NewOrderButton />
            <button
              className="border rounded px-3 py-1 text-sm"
              onClick={async () => {
                const { rows: data } = await fetchOrdersWithFilters({ ...filters, page: 0, pageSize: 1000 });
                const cols = [
                  { header: "Order #", accessor: (r) => r.order_no ?? r.order_number ?? "" },
                  { header: "Client", accessor: (r) => r.client_name ?? "" },
                  { header: "Address", accessor: (r) => r.address ?? r.display_subtitle ?? "" },
                  { header: "Status", accessor: (r) => String(r.status ?? "").replace(/_/g, " ") },
                  { header: "Due", accessor: (r) => (r.due_date ? new Date(r.due_date).toLocaleDateString() : "") },
                  { header: "Fee", accessor: (r) => (r.fee_amount == null ? "" : r.fee_amount) },
                  { header: "Appraiser", accessor: (r) => r.appraiser_name ?? "" },
                  { header: "Ordered", accessor: (r) => (r.date_ordered ? new Date(r.date_ordered).toLocaleDateString() : "") },
                ];
                const { toCsv, downloadCsv } = await import("@/lib/utils/csv");
                downloadCsv({ filename: "orders.csv", data: toCsv(data, cols) });
              }}
            >
              Export CSV
            </button>
          </div>
        }
      />

      {/* Top filters only */}
      <TopFilterBar
        filters={filters}
        onChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
        clients={clients}
        appraisers={appraisers}
        showAppraiserPicker={showAppraiserPicker}
      />

      {/* Scroll-safe table (min width small enough to avoid overflow on typical screens) */}
      <Card className="p-0 overflow-hidden">
        <div className="relative overflow-x-auto">
          <div style={{ minWidth: TABLE_MIN_W }}>
            <OrdersTableHeader GRID={GRID} />
            <div role="rowgroup">
              {loading
                ? [...Array(Math.min(PAGE_SIZE, 10))].map((_, i) => (
                    <div key={i} className="border-b py-3 px-4">
                      <div className="h-3 bg-muted rounded w-24 mb-2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  ))
                : rows.map((o) => (
                    <OrdersTableRow
                      key={o.id}
                      order={o}
                      isOpen={expandedId === o.id}
                      onToggle={() => setExpandedId((prev) => (prev === o.id ? null : o.id))}
                      renderCells={renderCells}
                      drawer={<OrderInlineDrawer order={o} isAdmin={isAdmin} />}
                      className="border-b hover:bg-slate-50 cursor-pointer"
                    />
                  ))}
            </div>
          </div>
        </div>

        {/* Pagination / lazy sentinel */}
        {!filters.lazy && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-white">
            <div className="text-sm text-muted-foreground">
              {count.toLocaleString()} result{count === 1 ? "" : "s"}
            </div>
            <OrdersTablePagination
              currentPage={filters.page + 1}
              totalPages={Math.max(1, Math.ceil((count || 0) / (filters.pageSize || PAGE_SIZE)))}
              goToPage={(p) => goToPage(p)}
            />
          </div>
        )}
        {filters.lazy && filters.page + 1 < Math.max(1, Math.ceil((count || 0) / (filters.pageSize || PAGE_SIZE))) && (
          <div ref={sentinelRef} className="h-8 w-full" />
        )}
      </Card>
    </div>
  );
}






































