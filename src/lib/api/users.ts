// src/lib/api/users.ts
import supabase from "@/lib/supabaseClient";

export type UserPreferences = {
  default_calendar_view?: "month" | "week" | "2w";
};

export async function fetchMyProfileAndSettings(userId: string) {
  const [u, s] = await Promise.all([
    supabase.from("users").select("id, name, email").eq("id", userId).single(),
    supabase.from("user_settings").select("phone, preferences").eq("user_id", userId).maybeSingle(),
  ]);

  if (u.error) throw new Error(u.error.message);
  if (s.error && s.error.code !== "PGRST116") throw new Error(s.error.message); // ignore "No rows" error

  return {
    id: u.data.id,
    name: u.data.name as string | null,
    email: u.data.email as string | null,
    phone: s.data?.phone ?? "",
    preferences: (s.data?.preferences as UserPreferences) ?? {},
  };
}

export async function saveProfileBasic({
  userId,
  name,
  email,
}: {
  userId: string;
  name?: string | null;
  email?: string | null;
}) {
  const { error } = await supabase.rpc("update_user_profile_basic", {
    p_user_id: userId,
    p_name: name ?? null,
    p_email: email ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function saveSettings({
  userId,
  phone,
  preferences,
}: {
  userId: string;
  phone?: string | null;
  preferences?: UserPreferences | null;
}) {
  const { error } = await supabase.rpc("upsert_user_settings", {
    p_user_id: userId,
    p_phone: phone ?? null,
    p_preferences: (preferences ?? null) as any,
  });
  if (error) throw new Error(error.message);
}

