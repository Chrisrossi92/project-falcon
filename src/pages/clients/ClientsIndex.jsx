// src/components/clients/ClientsIndex.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ClientCard from "@/components/clients/ClientCard";
import { WorkspaceContextTile } from "@/components/workspace/WorkspaceContext";
import { WorkspaceSection, WorkspaceSectionMeta } from "@/components/workspace/WorkspaceSection";
import {
  WorkspaceEmptyState,
  WorkspaceErrorState,
  WorkspaceLoadingState,
} from "@/components/workspace/WorkspaceState";
import { useCan } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { useShellProfile } from "@/lib/shell/useShellProfile";
import { SHELL_PROFILE_IDS } from "@/lib/shell/resolveShellProfile";
import {
  listAssignedOrderClients,
  listClientManagementClients,
} from "@/features/clients/clientManagementApi";

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

export default function ClientsIndex() {
  const canCreateClientsPermission = useCan(PERMISSIONS.CLIENTS_CREATE);
  const canCreateClients = canCreateClientsPermission.allowed;
  const shellProfile = useShellProfile();
  const isAppraiserClientsView = shellProfile.profileId === SHELL_PROFILE_IDS.MY_WORK;
  const appraiserId = shellProfile.appContext?.user_id || null;
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
        const rows = isAppraiserClientsView
          ? await listAssignedOrderClients({
              search,
              category: categoryFilter,
              sort,
              appraiserId,
            })
          : await listClientManagementClients({
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
  }, [search, categoryFilter, sort, isAppraiserClientsView, appraiserId]);

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
              {isAppraiserClientsView ? "Assigned Client Work" : "Relationship Management"}
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              {isAppraiserClientsView ? "Clients" : "Clients Workspace"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {isAppraiserClientsView
                ? "Clients connected to orders assigned to you."
                : "Find client, lender, and AMC relationships for current order coordination."}
            </p>
          </div>

          <div
            aria-label="Clients workspace context"
            className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[32rem]"
          >
            <WorkspaceContextTile
              label="Work view"
              value={isAppraiserClientsView ? "Assigned order clients" : "Client relationships"}
              valueClassName="mt-0.5 text-slate-900"
            />
            <WorkspaceContextTile
              label="Active filter"
              value={categoryLabels[categoryFilter]}
              valueClassName="mt-0.5 text-slate-900"
            />
            <WorkspaceContextTile
              label="Results"
              value={resultCountLabel}
              valueClassName="mt-0.5 text-slate-900"
            />
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
              {isAppraiserClientsView
                ? "Search clients from your assigned order history."
                : "Search and filter the current client relationship list."}
            </p>
          </div>

          {canCreateClients && !isAppraiserClientsView && (
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

      <WorkspaceSection
        title="Client Directory"
        titleId="client-directory-heading"
        description={`${activeSearchLabel} · ${categoryLabels[categoryFilter]} · ${sortLabels[sort]}`}
        meta={<WorkspaceSectionMeta>{resultCountLabel}</WorkspaceSectionMeta>}
        className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-5"
        headerClassName="mb-4 border-b border-slate-100 pb-4"
        headerContentClassName="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
      >
        {err ? (
          <WorkspaceErrorState message={err} />
        ) : loading ? (
          <WorkspaceLoadingState message="Loading client relationships..." />
        ) : gridRows.length === 0 ? (
          <WorkspaceEmptyState
            title="No clients match these filters"
            message="Adjust the search or category filter to broaden the relationship list."
          />
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
                  amc_id: row.amc_id,
                  amc_name: row.amc_name,
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
      </WorkspaceSection>
    </div>
  );
}
