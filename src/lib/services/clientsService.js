// src/lib/services/clientsService.js
import supabase from "@/lib/supabaseClient";
import rpcFirst from "@/lib/utils/rpcFirst";

/**
 * Lightweight client list for selects / dashboards.
 * Returns: [{ id (bigint), name, status }]
 */
export async function listClients({ includeInactive = false } = {}) {
  const { data, error } = await rpcFirst(
    () => supabase.rpc("clients_list", { include_inactive: includeInactive }),
    async () => {
      let q = supabase
        .from("clients")
        .select("id, name, status")
        .order("name", { ascending: true });
      if (!includeInactive) q = q.eq("status", "active");
      return q;
    }
  );
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch one client by id (safe fields).
 */
export async function getClientById(id) {
  const { data, error } = await rpcFirst(
    () => supabase.rpc("clients_get_by_id", { client_id: id }),
    async () => {
      const { data: row, error: err } = await supabase
        .from("clients")
        .select("id, name, status")
        .eq("id", id)
        .single();
      return { data: row, error: err };
    }
  );
  if (error) throw error;
  return data || null;
}

/** 🔁 Back-compat alias so older code keeps working */
export async function fetchClientById(id) {
  return getClientById(id);
}

/**
 * Clients with metrics for dashboards.
 * Prefers RPC `clients_metrics(include_inactive bool)`, falls back to JS aggregation.
 */
export async function fetchClientsWithMetrics({ includeInactive = false } = {}) {
  const { data, error } = await rpcFirst(
    () => supabase.rpc("clients_metrics", { include_inactive: includeInactive }),
    async () => {
      // 1) Get clients
      const clients = await listClients({ includeInactive });
      if (!clients.length) return { data: [], error: null };

      // 2) Pull orders for these client ids (RLS applies)
      const ids = clients.map((c) => c.id);
      const { data: orders, error: errOrders } = await supabase
        .from("orders")
        .select("client_id, status, base_fee")
        .in("client_id", ids);

      if (errOrders) {
        // Graceful fallback if RLS prevents orders read
        return {
          data: clients.map((c) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            orders_count: 0,
            active_orders_count: 0,
            avg_base_fee: null,
          })),
          error: null,
        };
      }

      // 3) Aggregate in JS
      const bucket = new Map(); // client_id -> { total, active, sumFee, nFee }
      for (const o of orders || []) {
        const cid = o.client_id;
        if (!bucket.has(cid)) bucket.set(cid, { total: 0, active: 0, sumFee: 0, nFee: 0 });
        const agg = bucket.get(cid);
        agg.total += 1;
        const s = String(o.status || "").toLowerCase();
        if (s !== "complete") agg.active += 1;
        const fee = o.base_fee;
        if (typeof fee === "number") {
          agg.sumFee += fee;
          agg.nFee += 1;
        }
      }

      const rows = clients.map((c) => {
        const agg = bucket.get(c.id) || { total: 0, active: 0, sumFee: 0, nFee: 0 };
        const avg = agg.nFee > 0 ? agg.sumFee / agg.nFee : null;
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          orders_count: agg.total,
          active_orders_count: agg.active,
          avg_base_fee: avg,
        };
      });

      return { data: rows, error: null };
    }
  );

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/* ===========================
   Create / Update / Delete
   =========================== */

export async function createClient(patch = {}) {
  const name = (patch.name || "").trim();
  const status = (patch.status || "active").trim();
  if (!name) throw new Error("Client name is required");

  const payload = { name, status };

  const { data, error } = await rpcFirst(
    () => supabase.rpc("rpc_create_client", { patch: payload }),
    async () => {
      const { data: rows, error: err } = await supabase
        .from("clients")
        .insert(payload)
        .select("id, name, status");
      return { data: Array.isArray(rows) ? rows[0] : rows, error: err };
    }
  );

  if (error) throw error;
  return data;
}

export async function updateClient(id, patch = {}) {
  const payload = {};
  if (typeof patch.name === "string") payload.name = patch.name.trim();
  if (typeof patch.status === "string") payload.status = patch.status.trim();

  if (Object.keys(payload).length === 0) return await getClientById(id);

  const { data, error } = await rpcFirst(
    () => supabase.rpc("rpc_update_client", { client_id: id, patch: payload }),
    async () => {
      const { data: row, error: err } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", id)
        .select("id, name, status")
        .single();
      return { data: row, error: err };
    }
  );

  if (error) throw error;
  return data;
}

export async function deleteClient(id) {
  const { error } = await rpcFirst(
    () => supabase.rpc("rpc_delete_client", { client_id: id }),
    async () => {
      const { error: err } = await supabase.from("clients").delete().eq("id", id);
      return { data: null, error: err };
    }
  );
  if (error) throw error;
}








