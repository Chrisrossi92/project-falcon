import supabase from "@/lib/supabaseClient";

const ACTIVE_INPUT_COLUMNS = [
  "id",
  "order_id",
  "input_type",
  "actor_user_id",
  "actor_role",
  "note",
  "source",
  "created_at",
  "expires_at",
].join(", ");

export async function listActiveOrderOperationalInputs(orderId, { now = new Date() } = {}) {
  if (!orderId) return [];

  const nowIso = now instanceof Date ? now.toISOString() : new Date(now).toISOString();

  const { data, error } = await supabase
    .from("order_operational_inputs")
    .select(ACTIVE_INPUT_COLUMNS)
    .eq("order_id", orderId)
    .is("cleared_at", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}
