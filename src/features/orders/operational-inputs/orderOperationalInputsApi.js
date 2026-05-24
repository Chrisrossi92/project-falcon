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

export async function createOrderOperationalInput(orderId, inputType, { note = null } = {}) {
  if (!orderId) throw new Error("Order id is required.");
  if (!inputType) throw new Error("Operational context type is required.");

  const { data, error } = await supabase.rpc("rpc_order_operational_input_create", {
    p_order_id: orderId,
    p_input_type: inputType,
    p_note: note || null,
    p_payload: {},
    p_source: "manual",
  });

  if (error) throw error;
  return data || null;
}

export async function clearOrderOperationalInput(inputId, { note = null } = {}) {
  if (!inputId) throw new Error("Operational context id is required.");

  const { data, error } = await supabase.rpc("rpc_order_operational_input_clear", {
    p_input_id: inputId,
    p_note: note || null,
  });

  if (error) throw error;
  return data || null;
}
