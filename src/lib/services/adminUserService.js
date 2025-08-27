// src/lib/services/adminUserService.js
import supabase from "@/lib/supabaseClient";
import rpcFirst from "@/lib/utils/rpcFirst";

/**
 * Minimal audit log for user changes.
 * Expects a Postgres function: rpc_log_event(entity, entity_id, event_type, message)
 * Fallback: no-op (but we still return the updated row).
 */
async function logUserEvent(userId, eventType, message) {
  try {
    await rpcFirst(
      () => supabase.rpc("rpc_log_event", {
        entity: "user",
        entity_id: userId,
        event_type: eventType,
        message
      }),
      async () => {
        // No-op fallback; you can optionally insert into an `activity_log` table here if desired.
        return { data: null, error: null };
      }
    );
  } catch {
    // Intentionally swallow audit failures in MVP
  }
}

/**
 * List users (admin scope). RPC-first, fallback to direct table read.
 * @param {{ includeInactive?: boolean }} opts
 */
export async function listUsers(opts = {}) {
  const includeInactive = !!opts.includeInactive;

  // RPC preferred: admin_list_users(include_inactive boolean)
  const { data, error } = await rpcFirst(
    () => supabase.rpc("admin_list_users", { include_inactive: includeInactive }),
    async () => {
      let query = supabase.from("users").select("*").order("display_name", { ascending: true });
      if (!includeInactive) query = query.eq("status", "active");
      return query;
    }
  );

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/**
 * Generic update (single row). RPC-first, fallback to direct update.
 * Accepts a subset of fields: { role, fee_split, status, email }
 */
export async function updateUserFields(userId, fields) {
  const allowed = ["role", "fee_split", "status", "email"];
  const payload = Object.fromEntries(
    Object.entries(fields || {}).filter(([k]) => allowed.includes(k))
  );
  if (!userId || Object.keys(payload).length === 0) {
    throw new Error("updateUserFields: missing userId or no valid fields");
  }

  // RPC preferred: admin_update_user(user_id uuid, patch jsonb) returns users
  const { data, error } = await rpcFirst(
    () => supabase.rpc("admin_update_user", { user_id: userId, patch: payload }),
    async () => {
      const { data: row, error: err } = await supabase
        .from("users")
        .update(payload)
        .eq("id", userId)
        .select("*")
        .single();
      return { data: row, error: err };
    }
  );

  if (error) throw error;

  // Audit
  const changed = Object.keys(payload).join(", ");
  await logUserEvent(userId, "user_updated", `Fields changed: ${changed}`);

  return data;
}

export async function updateRole(userId, role) {
  if (!role) throw new Error("updateRole: role required");
  return updateUserFields(userId, { role });
}

export async function updateFeeSplit(userId, feeSplit) {
  if (feeSplit == null) throw new Error("updateFeeSplit: feeSplit required");
  return updateUserFields(userId, { fee_split: feeSplit });
}

export async function updateStatus(userId, status) {
  if (!status) throw new Error("updateStatus: status required");
  return updateUserFields(userId, { status });
}

export async function updateEmail(userId, email) {
  if (!email) throw new Error("updateEmail: email required");
  return updateUserFields(userId, { email });
}
