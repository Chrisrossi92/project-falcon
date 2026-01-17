// src/lib/services/usersService.js
import supabase from "@/lib/supabaseClient";

/* ============================== READS ============================== */

export async function listUsers(opts = {}) {
  const includeInactive = !!opts.includeInactive;
  let query = supabase
    .from("users")
    .select("id, email, display_name, full_name, role, fee_split, is_active, status, color, phone, avatar_url, updated_at")
    .order("display_name", { ascending: true });
  if (!includeInactive) {
    query = query.or("is_active.is.true,status.eq.active");
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Lightweight directory for assignment dropdowns.
 * Returns only active users (status != inactive, is_active !== false), including admins/owners.
 */
export async function listAssignableUsers({ roles, includeInactive = false } = {}) {
  let query = supabase
    .from("users")
    .select("id, email, name, display_name, full_name, role, status, is_active, fee_split, split, phone, color, display_color")
    .order("display_name", { ascending: true })
    .order("name", { ascending: true })
    .order("email", { ascending: true });

  if (Array.isArray(roles) && roles.length > 0) {
    query = query.in("role", roles);
  }

  // ✅ simplest + most reliable
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  // ✅ final guardrail (keeps “inactive” out even if data is messy)
  return (data || []).filter((u) => {
    const status = String(u.status || "").toLowerCase();
    return u.is_active !== false && status !== "inactive";
  });
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
  const { error } = await supabase.rpc("rpc_admin_users_update", {
    p_user_id: userId,
    p_patch: { role },
  });
  if (error) throw error;
  return true;
}

export async function setUserFeeSplit(userId, feeSplit) {
  const { error } = await supabase.from("users").update({ fee_split: feeSplit }).eq("id", userId);
  if (error) throw error;
  return true;
}

export async function setUserActive(userId, isActive) {
  const { error } = await supabase.rpc("rpc_admin_users_set_active", {
    p_user_id: userId,
    p_is_active: !!isActive,
  });
  if (error) throw error;
  return true;
}

// Add this alongside setUserRole / setUserFeeSplit / setUserActive / setUserColor
export async function setUserStatus(userId, status) {
  // Map UI string → boolean
  const isActive = String(status || "").toLowerCase() === "active";

  const { error } = await supabase
    .from("users")
    .update({ is_active: isActive, status: status || null })
    .eq("id", userId);
  if (error) throw error;
  return true;
}


/** 🎨 Allow setting the user's color (RLS should permit: admin any, non-admin self) */
export async function setUserColor(userId, color) {
  const safe = (color ?? "").trim();
  const { error } = await supabase.from("users").update({ color: safe || null, display_color: safe || null }).eq("id", userId);
  if (error) throw error;
  return true;
}

/** Keep public.profiles synced with session profile (display fields) */
export async function meUpsert(profile = {}) {
  const { error } = await supabase.rpc("rpc_me_upsert", { p_profile: profile });
  if (error) throw error;
  return true;
}

export async function updateUserProfile(userId, patch = {}) {
  const { display_name, full_name, name, color, avatar_url, fee_split, split, split_pct, is_active, status, email, phone } = patch || {};
  const hasStatus = Object.prototype.hasOwnProperty.call(patch, "status");
  const hasIsActive = Object.prototype.hasOwnProperty.call(patch, "is_active");
  let nextStatus = status ?? null;
  let nextIsActive = typeof is_active === "boolean" ? is_active : null;
  if (hasStatus && !hasIsActive) {
    const s = String(status || "").toLowerCase();
    if (s === "active") nextIsActive = true;
    else if (s === "inactive") nextIsActive = false;
  }
  if (hasIsActive && !hasStatus) {
    nextStatus = is_active ? "active" : "inactive";
  }
  const update = {
    display_name: display_name ?? name ?? null,
    full_name: full_name ?? null,
    color: color ?? null,
    display_color: color ?? null,
    avatar_url: avatar_url ?? null,
    fee_split: fee_split ?? split ?? split_pct ?? null,
    is_active: typeof nextIsActive === "boolean" ? nextIsActive : null,
    status: nextStatus ?? null,
    email: email ?? null,
    phone: phone ?? null,
  };
  Object.keys(update).forEach((k) => update[k] === null && delete update[k]);
  const { error } = await supabase.rpc("rpc_admin_users_update", {
    p_user_id: userId,
    p_patch: update,
  });
  if (error) throw error;
  return true;
}

export async function createUserRecord(payload = {}) {
  const {
    display_name = null,
    full_name = null,
    email = null,
    role = null,
    fee_split = null,
    split = null,
    phone = null,
    status = "active",
    is_active = true,
    color = null,
    display_color = null,
  } = payload || {};

  const feeSplitVal = fee_split ?? split ?? null;
  const derivedName = String(display_name || full_name || email || "").trim();
  const safeName = derivedName || String(email || "New User").trim();

  const insertRow = {
    name: safeName,
    display_name: safeName,
    full_name: safeName,
    email,
    role,
    fee_split: feeSplitVal,
    split: feeSplitVal,
    phone: phone || null,
    status: status || "active",
    is_active: typeof is_active === "boolean" ? is_active : true,
    color: color || display_color || null,
    display_color: display_color || color || null,
    auth_id: null,
  };

  const { data, error } = await supabase.from("users").insert(insertRow).select().maybeSingle();
  if (error) throw error;
  return data;
}

/* ============================== COMPAT / ALIASES ============================== */
// Legacy names some parts of the app may import
export const fetchUsers = listUsers;
export const fetchUserById = getUserById;
export const fetchUserByAuthId = getUserByAuthId;
export const getUser = getUserById;
