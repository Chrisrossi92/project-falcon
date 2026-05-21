// src/components/clients/ClientsIndex.jsx
import React, { useEffect, useMemo, useState } from "react";
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

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Clients</h1>
          <p className="mt-1 text-xs text-gray-500">
            Ranked by total orders so your biggest relationships float to the
            top.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="hidden sm:block text-xs text-gray-500">Sort</label>
          <select
            className="rounded border px-3 py-1.5 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="orders_desc">Total Orders (desc)</option>
            <option value="orders_asc">Total Orders (asc)</option>
            <option value="name_asc">Name (A–Z)</option>
            <option value="name_desc">Name (Z–A)</option>
          </select>

          {canCreateClients && (
            <Link
              to="/clients/new"
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              + New Client
            </Link>
          )}
        </div>
      </div>

      {/* Filters + search */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`rounded-full border px-3 py-1 ${
              categoryFilter === "all"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("amc")}
            className={`rounded-full border px-3 py-1 ${
              categoryFilter === "amc"
                ? "bg-violet-700 text-white border-violet-700"
                : "bg-white text-gray-700 hover:bg-violet-50 border-violet-200"
            }`}
          >
            AMCs
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("lender")}
            className={`rounded-full border px-3 py-1 ${
              categoryFilter === "lender"
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-white text-gray-700 hover:bg-blue-50 border-blue-200"
            }`}
          >
            Lenders
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("client")}
            className={`rounded-full border px-3 py-1 ${
              categoryFilter === "client"
                ? "bg-green-700 text-white border-green-700"
                : "bg-white text-gray-700 hover:bg-green-50 border-green-200"
            }`}
          >
            Direct Clients
          </button>
        </div>

        <div className="w-full md:w-auto">
          <input
            className="w-full md:min-w-[260px] rounded border px-3 py-2 text-sm"
            placeholder="Search client or contact…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Body */}
      {err ? (
        <div className="text-sm text-rose-600">{err}</div>
      ) : loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : gridRows.length === 0 ? (
        <div className="text-sm text-gray-500">
          No clients match those filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    </div>
  );
}
