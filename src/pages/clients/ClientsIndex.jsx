// src/components/clients/ClientsIndex.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ClientCard from "@/components/clients/ClientCard";
import { useCan } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { listClientManagementClients } from "@/features/clients/clientManagementApi";

const normalizeCategory = (raw) => {
  const v = (raw || "").toLowerCase();
  if (!v) return "Client";
  if (v === "amc") return "AMC";
  if (v === "lender" || v === "bank") return "Lender";
  return raw;
};

const categoryLabels = {
  all: "All relationships",
  amc: "AMCs",
  lender: "Lenders",
  client: "Direct clients",
};

const sortLabels = {
  orders_desc: "Total Orders (desc)",
  orders_asc: "Total Orders (asc)",
  name_asc: "Name (A-Z)",
  name_desc: "Name (Z-A)",
};

function ContextPill({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-medium text-slate-900">
        {value}
      </div>
    </div>
  );
}

export default function ClientsIndex() {
  const canCreateClientsPermission = useCan(PERMISSIONS.CLIENTS_CREATE);
  const canCreateClients = canCreateClientsPermission.allowed;
  const [baseRows, setBaseRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // UI controls
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("orders_desc"); // 'orders_desc' | 'orders_asc' | 'name_asc' | 'name_desc'
  const [categoryFilter, setCategoryFilter] = useState("all"); // 'all' | 'amc' | 'lender' | 'client'

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const rows = await listClientManagementClients({
          search,
          category: categoryFilter,
          sort,
        });

        if (!cancelled) {
          setBaseRows(rows.map((row) => ({
            ...row,
            category: normalizeCategory(row.category),
          })));
        }
      } catch (e) {
        console.error("Failed to load clients", e);
        if (!cancelled) setErr(e?.message || "Failed to load clients");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [search, categoryFilter, sort]);

  const gridRows = useMemo(() => {
    let out = [...baseRows];

    if (sort === "orders_asc") {
      const asc = sort === "orders_asc";
      out.sort((a, b) =>
        asc ? a.total_orders - b.total_orders : b.total_orders - a.total_orders
      );
    }

    return out;
  }, [baseRows, sort]);

  const resultCountLabel = loading
    ? "Loading"
    : `${gridRows.length} ${gridRows.length === 1 ? "client" : "clients"}`;
  const activeSearchLabel = search.trim() ? `Search: ${search.trim()}` : "No search";

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4 shadow-sm md:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Relationship Management
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Clients Workspace
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Find client, lender, and AMC relationships for current order
              coordination.
            </p>
          </div>

          <div
            aria-label="Clients workspace context"
            className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[32rem]"
          >
            <ContextPill label="Work view" value="Client relationships" />
            <ContextPill
              label="Active filter"
              value={categoryLabels[categoryFilter]}
            />
            <ContextPill label="Results" value={resultCountLabel} />
          </div>
        </div>
      </header>

      <section
        aria-labelledby="client-controls-heading"
        className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-5"
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2
              id="client-controls-heading"
              className="text-base font-semibold text-slate-950"
            >
              Relationship Controls
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Search and filter the current client relationship list.
            </p>
          </div>

          {canCreateClients && (
            <Link
              to="/clients/new"
              className="inline-flex items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              New Client
            </Link>
          )}
        </div>

        <div className="grid gap-4 pt-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="space-y-3">
            <label
              htmlFor="client-search"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Search
            </label>
            <input
              id="client-search"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Search client or contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label
              htmlFor="client-sort"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Sort
            </label>
            <select
              id="client-sort"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {Object.entries(sortLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <div
              aria-label="Client category filters"
              className="flex flex-wrap gap-2 text-xs"
            >
              <button
                type="button"
                aria-pressed={categoryFilter === "all"}
                onClick={() => setCategoryFilter("all")}
                className={`rounded-full border px-3 py-1.5 font-medium transition ${
                  categoryFilter === "all"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                All
              </button>
              <button
                type="button"
                aria-pressed={categoryFilter === "amc"}
                onClick={() => setCategoryFilter("amc")}
                className={`rounded-full border px-3 py-1.5 font-medium transition ${
                  categoryFilter === "amc"
                    ? "border-violet-700 bg-violet-700 text-white"
                    : "border-violet-200 bg-white text-slate-700 hover:bg-violet-50"
                }`}
              >
                AMCs
              </button>
              <button
                type="button"
                aria-pressed={categoryFilter === "lender"}
                onClick={() => setCategoryFilter("lender")}
                className={`rounded-full border px-3 py-1.5 font-medium transition ${
                  categoryFilter === "lender"
                    ? "border-blue-700 bg-blue-700 text-white"
                    : "border-blue-200 bg-white text-slate-700 hover:bg-blue-50"
                }`}
              >
                Lenders
              </button>
              <button
                type="button"
                aria-pressed={categoryFilter === "client"}
                onClick={() => setCategoryFilter("client")}
                className={`rounded-full border px-3 py-1.5 font-medium transition ${
                  categoryFilter === "client"
                    ? "border-green-700 bg-green-700 text-white"
                    : "border-green-200 bg-white text-slate-700 hover:bg-green-50"
                }`}
              >
                Direct Clients
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="client-directory-heading"
        className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-5"
      >
        <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="client-directory-heading"
              className="text-base font-semibold text-slate-950"
            >
              Client Directory
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {activeSearchLabel} · {categoryLabels[categoryFilter]} ·{" "}
              {sortLabels[sort]}
            </p>
          </div>
          <div className="text-sm font-medium text-slate-600">
            {resultCountLabel}
          </div>
        </div>

        {err ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {err}
          </div>
        ) : loading ? (
          <div
            role="status"
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
          >
            Loading client relationships...
          </div>
        ) : gridRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <h3 className="text-sm font-semibold text-slate-900">
              No clients match these filters
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Adjust the search or category filter to broaden the relationship
              list.
            </p>
          </div>
        ) : (
          <div
            aria-label="Client relationship cards"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {gridRows.map((row) => (
              <ClientCard
                key={row.id}
                client={{
                  id: row.id,
                  name: row.name,
                  status: row.status,
                  category: row.category,
                  primary_contact: row.primary_contact,
                  phone: row.phone,
                }}
                metrics={{
                  total_orders: row.total_orders,
                  avg_fee: row.avg_fee,
                  last_activity: row.last_activity,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
