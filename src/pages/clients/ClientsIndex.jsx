// src/pages/clients/ClientsIndex.jsx
import React, { useEffect, useMemo, useState } from "react";
import { listClients } from "@/lib/services/clientsService";
import { useRole } from "@/lib/hooks/useRole";
import { useSession } from "@/lib/hooks/useSession";
import { useNavigate, Link } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import ClientCard from "@/components/clients/ClientCard";

const usd0 = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";

// ---- Category helpers (same logic ClientCard uses)
function inferCategory(c = {}) {
  const t = (c.type || c.client_type || c.category || c.kind || "").toString().toLowerCase();
  if (t.includes("amc")) return "amc";
  if (t.includes("lender")) return "lender";
  const name = (c.name || c.client_name || "").toLowerCase();
  if (/\b(amc|appraisal management)\b/.test(name)) return "amc";
  if (/\b(bank|credit union|mortgage|finance|financial|banc|bancorp|savings|loan)\b/.test(name)) return "lender";
  return "other";
}

// Try RPC first, then fall back to Orders → Clients join
async function fetchLendersForAmc(amcId) {
  // 1) RPC (if you have it)
  try {
    const { data, error } = await supabase.rpc("rpc_lenders_for_amc", { p_amc_id: amcId });
    if (!error && Array.isArray(data)) return data;
  } catch (_) {}

  // 2) Fallback: orders.managing_amc_id -> client ids -> clients table
  try {
    const { data: orderRows, error: e1 } = await supabase
      .from("orders")
      .select("client_id")
      .eq("managing_amc_id", amcId);
    if (e1) throw e1;

    const ids = [...new Set((orderRows || []).map((r) => r.client_id).filter(Boolean))];
    if (!ids.length) return [];

    // Pull just the fields the card needs
    const { data: clients, error: e2 } = await supabase
      .from("clients")
      .select(
        "id, name, contact_name, primary_contact, avg_base_fee, last_ordered_at, type, client_type, category, kind, orders_count"
      )
      .in("id", ids);
    if (e2) throw e2;
    return clients || [];
  } catch (e) {
    console.warn("Associated lender fetch failed", e.message || e);
    return [];
  }
}

export default function ClientsIndex() {
  const nav = useNavigate();
  const { user } = useSession();
  const { isAdmin, isReviewer } = useRole() || {};
  const mineOnly = !(isAdmin || isReviewer);
  const userId = user?.id || user?.user_id || user?.uid || null;

  // 'orders' | 'name' | 'last'
  const [sortBy, setSortBy] = useState("orders"); // default: Most orders first
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // search
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const svcSort = useMemo(() => {
    if (sortBy === "orders") return { orderBy: "orders_count", descending: true };
    if (sortBy === "last") return { orderBy: "last_ordered_at", descending: true };
    return { orderBy: "name", descending: false };
  }, [sortBy]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // Prefer server-side; gracefully fall back to client filtering
        const { rows: serverRows = [] } = await listClients({
          ...svcSort,
          mineOnly,
          userId,
          q: debouncedQ || undefined, // if your service supports it
        });

        let base = serverRows;

        // If service doesn't support q, filter locally
        if (debouncedQ && !serverRows.length) {
          const { rows: allRows = [] } = await listClients({ ...svcSort, mineOnly, userId });
          base = allRows.filter((r) =>
            (r.name || "").toLowerCase().includes(debouncedQ.toLowerCase())
          );
        }

        // AMC expansion: if query looks like an AMC, append lenders managed by that AMC
        let expanded = base;
        if (debouncedQ) {
          const amcCandidates = base
            .filter((c) => inferCategory(c) === "amc")
            .filter((c) => (c.name || "").toLowerCase().includes(debouncedQ.toLowerCase()));

          // pick the strongest AMC (most orders)
          const topAmc = amcCandidates.sort(
            (a, b) => (b.orders_count ?? 0) - (a.orders_count ?? 0)
          )[0];

          if (topAmc?.id) {
            const lenders = await fetchLendersForAmc(topAmc.id);
            if (lenders.length) {
              const byId = new Map(expanded.map((c) => [c.id, c]));
              for (const l of lenders) byId.set(l.id, { ...byId.get(l.id), ...l });
              expanded = Array.from(byId.values());
            }
          }
        }

        setRows(expanded);
      } catch (e) {
        setErr(e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [svcSort, mineOnly, userId, debouncedQ]);

  // unified client-side sort (also covers AMC expansion dataset)
  const clients = useMemo(() => {
    const a = [...rows];
    if (sortBy === "orders") a.sort((x, y) => (y.orders_count ?? 0) - (x.orders_count ?? 0));
    if (sortBy === "name") a.sort((x, y) => (x.name || "").localeCompare(y.name || ""));
    if (sortBy === "last")
      a.sort((x, y) => new Date(y.last_ordered_at || 0) - new Date(x.last_ordered_at || 0));
    return a;
  }, [rows, sortBy]);

  function openClient(id) {
    nav(`/clients/${id}`);
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold">Clients</h1>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/* Search */}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search client or AMC…"
            className="text-sm border rounded px-3 py-1.5 w-full sm:w-72"
          />

          {/* Sort + New */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Sort</label>
            <select
              className="text-sm border rounded px-2 py-1"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="orders">Total Orders (desc)</option>
              <option value="name">Name (A–Z)</option>
              <option value="last">Last Order (newest)</option>
            </select>
            <Link to="/clients/new" className="ml-2 text-sm border rounded px-2 py-1 hover:bg-gray-50">
              + New Client
            </Link>
          </div>
        </div>
      </div>

      {/* Optional hint when AMC expansion kicks in */}
      {debouncedQ && !loading && (
        <div className="mb-2 text-xs text-muted-foreground">
          Tip: searching an <span className="font-medium">AMC</span> will also show lenders associated
          via managed orders.
        </div>
      )}

      {err && <div className="text-red-600 text-sm mb-2">Failed to load clients: {err.message}</div>}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : clients.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          {mineOnly ? "You have no clients yet." : "No clients found."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {clients.map((c) => (
            <ClientCard key={c.id} client={c} onOpen={() => openClient(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}



