// --- ADD THIS TO: src/lib/services/clientsService.js ---

import supabase from "@/lib/supabaseClient";
import { fetchClientsList } from "@/lib/services/clientsService"; // if this causes a circular import, just remove this line and call the function directly above

/**
 * Fetch clients plus lightweight metrics for the current page of clients.
 * - No relational embeds
 * - One page of clients -> one orders query filtered with .in('client_id', ids)
 * - Returns: [{ id, name, email, phone, orders_total, orders_open, last_update_at, next_due_at }]
 *
 * @param {Object} opts
 * @param {string} [opts.search]
 * @param {number} [opts.limit=50]
 * @param {number} [opts.offset=0]
 */
export async function fetchClientsWithMetrics({ search, limit = 50, offset = 0 } = {}) {
  // 1) Page of clients
  let clients = [];
  try {
    clients = await fetchClientsList({ search, limit, offset });
  } catch {
    // If clients table isn't ready yet, return empty list gracefully
    return [];
  }
  if (!clients.length) return [];

  // 2) Pull only orders for these client ids
  const ids = Array.from(new Set(clients.map((c) => c.id).filter(Boolean)));
  let orders = [];
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id, client_id, status, final_due_at, updated_at, created_at")
      .in("client_id", ids)
      .limit(2000); // generous page cap for metrics; adjust as needed
    if (error) throw error;
    orders = Array.isArray(data) ? data : [];
  } catch {
    // If orders table isn't available, just return clients with zeroed metrics
    return clients.map((c) => ({
      ...c,
      orders_total: 0,
      orders_open: 0,
      last_update_at: null,
      next_due_at: null,
    }));
  }

  // 3) Compute metrics per client (client-side merge)
  const OPEN_STATUSES = new Set([
    "in_progress",
    "in_review",
    "revisions",
    "ready_for_client",
    "ready_to_send",
  ]);

  const now = Date.now();
  const byClient = new Map();
  for (const o of orders) {
    const key = o.client_id;
    if (!byClient.has(key)) {
      byClient.set(key, {
        total: 0,
        open: 0,
        lastUpdate: null,
        nextDue: null,
      });
    }
    const acc = byClient.get(key);
    acc.total += 1;
    if (OPEN_STATUSES.has(String(o.status || "").toLowerCase())) acc.open += 1;

    // last update (fallback to created_at)
    const stamp = o.updated_at ? new Date(o.updated_at).getTime() : (o.created_at ? new Date(o.created_at).getTime() : 0);
    if (!acc.lastUpdate || stamp > acc.lastUpdate) acc.lastUpdate = stamp;

    // next due (final_due_at in the future, keep the soonest)
    if (o.final_due_at) {
      const dueTs = new Date(o.final_due_at).getTime();
      if (dueTs > now && (!acc.nextDue || dueTs < acc.nextDue)) acc.nextDue = dueTs;
    }
  }

  // 4) Attach metrics to each client row
  return clients.map((c) => {
    const m = byClient.get(c.id) || { total: 0, open: 0, lastUpdate: null, nextDue: null };
    return {
      ...c,
      orders_total: m.total,
      orders_open: m.open,
      last_update_at: m.lastUpdate ? new Date(m.lastUpdate).toISOString() : null,
      next_due_at: m.nextDue ? new Date(m.nextDue).toISOString() : null,
    };
  });
}



