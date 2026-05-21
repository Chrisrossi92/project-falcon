import supabase from "@/lib/supabaseClient";

export async function updateCompanyProfile(patch = {}) {
  const allowedPatch = {
    name: patch.name,
    timezone: patch.timezone,
    locale: patch.locale,
  };

  const { data, error } = await supabase.rpc("rpc_company_profile_update", {
    p_patch: allowedPatch,
  });

  if (error) throw error;
  return data ?? null;
}
