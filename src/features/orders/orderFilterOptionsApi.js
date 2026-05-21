import supabase from "@/lib/supabaseClient";

export async function listOrderFilterClients() {
  const { data, error } = await supabase.rpc("rpc_order_filter_clients");
  if (error) throw error;

  return Array.isArray(data)
    ? data.map((row) => ({
        id: row.client_id,
        name: row.client_name,
      }))
    : [];
}
