import supabase from "@/lib/supabaseClient";

function normalizeSettings(row = {}) {
  return {
    user_id: row.user_id,
    email: row.email,
    display_name: row.display_name,
    full_name: row.full_name,
    phone: row.phone,
    avatar_url: row.avatar_url,
    display_color: row.display_color,
    color: row.color,
  };
}

export async function getCurrentUserSettings() {
  const { data, error } = await supabase.rpc("rpc_current_user_settings_get");
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeSettings(row) : null;
}

export async function updateCurrentUserSettings(patch = {}) {
  const { data, error } = await supabase.rpc("rpc_current_user_settings_update", {
    p_patch: patch,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeSettings(row) : null;
}
