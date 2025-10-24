// src/pages/Orders.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { Card } from "@/components/ui/Card.jsx";
import SectionHeader from "@/components/ui/SectionHeader";
import NewOrderButton from "@/components/orders/NewOrderButton";

import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import useSession from "@/lib/hooks/useSession";
import useRole from "@/lib/hooks/useRole";
import { ORDER_STATUS } from "@/lib/constants/orderStatus";

/* ===== utilities ===== */
const PAGE_SIZE = 50;
function useDebounce(v, delay = 300) {
  const [x, setX] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setX(v), delay);
    return () => clearTimeout(t);
  }, [v, delay]);
  return x;
}

/* ================= Top filter bar (unchanged UI) ================= */
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
      // column-like filters (if your API supports them)
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
  const showAppraiserPicker = !!(isAdmin || isReviewer);

  const [clients, setClients] = useState([]);
  const [appraisers, setAppraisers] = useState([]);

  // page-level filters (passed directly to the unified table)
  const [filters, setFilters] = useState({
    search: "",
    statusIn: [],
    clientId: null,
    appraiserId: null,
    from: "",
    to: "",
    activeOnly: true,
    page: 0,
    pageSize: PAGE_SIZE,
    orderBy: "date_ordered",
    ascending: false,
    lazy: false,

    // optional “column-like” filters (your API can honor these if desired)
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

  // load dropdown data
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

  // role → what role we pass to the table
  const role = isAdmin ? "admin" : isReviewer ? "reviewer" : "appraiser";

  return (
    <div className="p-4 space-y-4">
      <SectionHeader
        title="Orders"
        subtitle="Search, filter, and export orders"
        actions={
          <div className="flex items-center gap-2">
            <NewOrderButton />
            {/* CSV export button lives inside the table now or can be re-added here */}
          </div>
        }
      />

      <TopFilterBar
        filters={filters}
        onChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
        clients={clients}
        appraisers={appraisers}
        showAppraiserPicker={showAppraiserPicker}
      />

      {/* One table: same layout as dashboards; honors filters */}
      <Card className="p-0">
        <UnifiedOrdersTable
          role={role}
          initialFilters={filters}
          pageSize={filters.pageSize}
        />
      </Card>
    </div>
  );
}







































