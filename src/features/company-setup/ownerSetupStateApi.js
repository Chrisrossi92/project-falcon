import supabase from "@/lib/supabaseClient";

export async function getOwnerSetupState() {
  const { data, error } = await supabase.rpc("rpc_owner_setup_state_get");

  if (error) throw error;
  return data ?? null;
}

export async function completeOwnerSetup() {
  const { data, error } = await supabase.rpc("rpc_owner_setup_mark_complete");

  if (error) throw error;
  return data ?? null;
}
