// src/components/clients/ClientsIndex.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import ClientCard from "@/components/clients/ClientCard";

export default function ClientsIndex() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // UI controls
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("orders_count_desc"); // 'orders_count_desc' | 'orders_count_asc' | 'name_asc' | 'name_desc'

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // 1) Base metrics from the view
        let q = supabase.from("v_client_metrics").select("*", { count: "exact" });

        if (search?.trim()) {
          const like = `%${search.trim()}%`;
          q = q.ilike("name", like);
        }

        // Sorting
        if (sort === "orders_count_desc") {
          q = q.order("orders_count", { ascending: false }).order("name", { ascending: true });
        } else if (sort === "orders_count_asc") {
          q = q.order("orders_count", { ascending: true }).order("name", { ascending: true });
        } else if (sort === "name_asc") {
          q = q.order("name", { ascending: true });
        } else if (sort === "name_desc") {
          q = q.order("name", { ascending: false });
        }

        const { data: metrics, error } = await q;
        if (error) throw error;
        if (cancelled) return;

        // 2) Authoritative categories (from clients)
        const ids = (metrics || []).map((r) => r.client_id ?? r.id).filter(Boolean);
        let catMap = {};
        if (ids.length) {
          const { data: cats, error: cerr } = await supabase
            .from("clients")
            .select("id, category")
            .in("id", ids);
          if (cerr) throw cerr;
          for (const c of cats || []) catMap[c.id] = c.category;
        }

        // 3) Merge category into rows first
        let merged = (metrics || []).map((r) => {
          const id = r.client_id ?? r.id;
          return {
            ...r,
            id,
            _category: catMap[id] || r.category || r.client_type || null,
          };
        });

        // 4) Roll-up metrics (AMCs include their lenders)
        if (ids.length) {
          const { data: roll, error: rerr } = await supabase.rpc("client_metrics_rollup", {
            p_client_ids: ids,
          });
          if (rerr) throw rerr;

          const rm = Object.create(null);
          for (const row of roll || []) {
            rm[row.client_id] = {
              orders_count: Number(row.orders_count || 0),
              avg_fee: row.avg_fee == null ? null : Number(row.avg_fee),
              last_order_at: row.last_order_at || null,
            };
          }

          merged = merged.map((r) => {
            const m = rm[r.id];
            return m
              ? {
                  ...r,
                  _orders_count: m.orders_count,
                  _avg_fee: m.avg_fee,
                  _last_activity: m.last_order_at,
                }
              : r;
          });
        }

        setRows(merged);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load clients");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search, sort]);

  const grid = useMemo(() => rows || [], [rows]);

  return (
    <div className="p-4 md:p-6">
      {/* Page header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Clients</h1>

        <div className="flex items-center gap-2">
          <label className="hidden sm:block text-xs text-gray-500">Sort</label>
          <select
            className="rounded border px-3 py-1.5 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="orders_count_desc">Total Orders (desc)</option>
            <option value="orders_count_asc">Total Orders (asc)</option>
            <option value="name_asc">Name (A–Z)</option>
            <option value="name_desc">Name (Z–A)</option>
          </select>

          <Link to="/clients/new" className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
            + New Client
          </Link>
        </div>
      </div>

      {/* Local search */}
      <div className="mb-4">
        <input
          className="w-full max-w-xl rounded border px-3 py-2 text-sm"
          placeholder="Search client or AMC…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {err ? (
        <div className="text-sm text-rose-600">{err}</div>
      ) : loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {grid.map((r) => (
            <ClientCard
              key={r.id}
              client={{
                id: r.id,
                name: r.name,
                status: r.status,
                category: r._category, // authoritative category
                primary_contact: r.primary_contact,
              }}
              metrics={{
                total_orders:
                  r._orders_count ??
                  r.orders_count ??
                  r.total_orders ??
                  0,
                avg_fee:
                  r._avg_fee ??
                  (typeof r.avg_fee === "number" ? r.avg_fee : null),
                last_activity:
                  r._last_activity ??
                  r.last_activity ??
                  r.last_order_at ??
                  null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}






