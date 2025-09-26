// src/components/clients/ClientsIndex.jsx
import React, { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabaseClient";
import ClientCard from "@/components/clients/ClientCard";

export default function ClientsIndex() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("orders_count_desc"); // same default
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // fetch metrics then merge categories in one extra query
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // 1) pull metrics (existing view)
        let q = supabase.from("v_client_metrics")
          .select("*", { count: "exact" });

        if (search?.trim()) {
          const like = `%${search.trim()}%`;
          q = q.ilike("name", like);
        }

        // sorting
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

        // 2) fetch categories for these ids from clients (single round-trip)
        const ids = (metrics || []).map(r => r.client_id || r.id).filter(Boolean);
        let catMap = {};
        if (ids.length) {
          const { data: cats, error: cerr } = await supabase
            .from("clients")
            .select("id, category")
            .in("id", ids);
          if (cerr) throw cerr;
          for (const c of (cats || [])) catMap[c.id] = c.category;
        }

        // 3) merge category onto card rows
        const merged = (metrics || []).map(r => {
          const id = r.client_id ?? r.id;
          return { ...r, id, _category: catMap[id] || r.category || r.client_type || null };
        });

        setRows(merged);
      } catch (e) {
        if (!cancelled) setErr(e.message || "Failed to load clients");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [search, sort]);

  const grid = useMemo(() => rows || [], [rows]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Clients</h1>
        {/* keep your existing controls */}
      </div>

      {/* search + sort UI (keep whatever you already have) */}
      {/* ... */}

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
                category: r._category,           // <-- authoritative category
                // keep anything else ClientCard expects:
                primary_contact: r.primary_contact,
              }}
              metrics={{
                total_orders: r.orders_count ?? r.total_orders ?? 0,
                avg_fee: r.avg_fee ?? null,
                last_activity: r.last_activity ?? r.last_order_at ?? null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}




