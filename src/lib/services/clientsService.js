import supabase from "@/lib/supabaseClient";

/** Fetch clients + compute basic metrics from orders in a single pass. */
export async function fetchClientsWithMetrics() {
  const { data: clients, error: errClients } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });
  if (errClients) throw errClients;

  const ids = (clients || []).map((c) => c.id);
  if (!ids.length) return [];

  const { data: orders, error: errOrders } = await supabase
    .from("orders")
    .select("client_id, base_fee, created_at, status")
    .in("client_id", ids);
  if (errOrders) throw errOrders;

  const byClient = new Map();
  for (const c of clients) byClient.set(c.id, []);
  for (const o of (orders || [])) byClient.get(o.client_id)?.push(o);

  return clients.map((c) => {
    const list = byClient.get(c.id) || [];
    const total = list.length;
    const active = list.filter((o) =>
      ["in_progress","in_review","ready_to_send","revisions"].includes(String(o.status || "").toLowerCase())
    ).length;
    const avg = total ? list.reduce((s, o) => s + (o.base_fee || 0), 0) / total : 0;
    const last = total ? list.map((o) => new Date(o.created_at)).sort((a,b) => b-a)[0].toISOString() : null;
    return { ...c, totalOrders: total, activeOrders: active, avgFee: avg, lastOrderDate: last };
  });
}

export async function fetchClientById(id) {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createClient(payload) {
  const { data, error } = await supabase.from("clients").insert([payload]).select().single();
  if (error) throw error;
  return data;
}

export async function updateClient(id, patch) {
  const { error } = await supabase.from("clients").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteClient(id) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

