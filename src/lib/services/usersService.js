// src/lib/services/usersService.js
import supabase from "@/lib/supabaseClient";

/* ============================== READS ============================== */

export async function listUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, display_name, role, fee_split, is_active, color, created_at, updated_at")
    .order("role", { ascending: true })
    .order("email", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Get user by primary key (auth user id) */
export async function getUserById(userId) {
  if (!userId) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  // PostgREST returns 406/empty result for .single() w/ no row
  if (error && (error.code === "PGRST116" || error.details?.includes("Results contain 0 rows"))) return null;
  if (error) throw error;
  return data;
}

/** Get user by email (case-insensitive) */
export async function getUserByEmail(email) {
  if (!email) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("email", email) // case-insensitive exact (no %)
    .maybeSingle?.() ?? { data: null, error: null }; // for older clients w/o maybeSingle
  if (error && (error.code === "PGRST116" || error.details?.includes("Results contain 0 rows"))) return null;
  if (error) throw error;
  return data;
}

/**
 * Get a user by auth id; if not found, optionally fall back to current session email
 * so legacy rows keyed by email still resolve under RLS.
 */
export async function getUserByAuthId(authId, { fallbackToEmail = true } = {}) {
  // Try by id first
  const byId = await getUserById(authId);
  if (byId || !fallbackToEmail) return byId;

  // Fallback: current session email (or the email claim if available)
  try {
    const { data: session } = await supabase.auth.getUser();
    const email = session?.user?.email || null;
    if (!email) return null;
    return await getUserByEmail(email);
  } catch {
    return null;
  }
}

/** Current signed-in user's row (or null) */
export async function getMyUser() {
  const { data: session } = await supabase.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) return null;
  return await getUserById(uid);
}

/* ============================== WRITES ============================== */

export async function setUserRole(userId, role) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setUserFeeSplit(userId, feeSplit) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ fee_split: feeSplit })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setUserActive(userId, isActive) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: !!isActive })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Add this alongside setUserRole / setUserFeeSplit / setUserActive / setUserColor
export async function setUserStatus(userId, status) {
  // Map UI string → boolean
  const isActive = String(status || "").toLowerCase() === "active";

  // 1) try by primary key id
  let { data, error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId)
    .select("*");

  if (error) throw error;
  if (Array.isArray(data) && data.length > 0) return data[0];

  // 2) fallback: some schemas carry an auth_id column (legacy)
  try {
    const res = await supabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("auth_id", userId)
      .select("*");
    if (res.error) throw res.error;
    if (Array.isArray(res.data) && res.data.length > 0) return res.data[0];
  } catch (_) { /* ignore and continue */ }

  // 3) ultimate fallback: if caller accidentally passed an email
  if (typeof userId === "string" && userId.includes("@")) {
    const res2 = await supabase
      .from("profiles")
      .update({ is_active: isActive })
      .ilike("email", userId) // case-insensitive equality (no % wildcard)
      .select("*");
    if (res2.error) throw res2.error;
    if (Array.isArray(res2.data) && res2.data.length > 0) return res2.data[0];
  }

  throw new Error("User not found to update status.");
}


/** 🎨 Allow setting the user's color (RLS should permit: admin any, non-admin self) */
export async function setUserColor(userId, color) {
  const safe = (color ?? "").trim();
  const { data, error } = await supabase
    .from("profiles")
    .update({ color: safe || null })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Keep public.profiles synced with session profile (display fields) */
export async function meUpsert(profile = {}) {
  const { error } = await supabase.rpc("rpc_me_upsert", { p_profile: profile });
  if (error) throw error;
  return true;
}

/* ============================== COMPAT / ALIASES ============================== */
// Legacy names some parts of the app may import
export const fetchUsers = listUsers;
export const fetchUserById = getUserById;
export const fetchUserByAuthId = getUserByAuthId;
export const getUser = getUserById;



