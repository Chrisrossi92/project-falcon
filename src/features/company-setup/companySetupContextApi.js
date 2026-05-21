import supabase from "@/lib/supabaseClient";

const JSON_OBJECT_FALLBACK = Object.freeze({});
const JSON_ARRAY_FALLBACK = Object.freeze([]);

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

function normalizeBoolean(value) {
  return Boolean(value);
}

function normalizeNumber(value) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : JSON_OBJECT_FALLBACK;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : JSON_ARRAY_FALLBACK;
}

export function isCompanySetupPermissionDeniedError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");

  return (
    code === "42501" ||
    /setup_read_permission_missing|current_company_membership_required|company_inactive|company_not_found|app_user_not_found/i.test(
      message,
    )
  );
}

export function normalizeCompanySetupContext(row = {}) {
  return {
    company_id: row.company_id ?? null,
    company_slug: row.company_slug ?? null,
    company_name: row.company_name ?? null,
    company_type: row.company_type ?? null,
    company_status: row.company_status ?? null,
    timezone: row.timezone ?? null,
    locale: row.locale ?? null,
    active_company_claim_id: row.active_company_claim_id ?? null,
    active_company_context_valid: normalizeBoolean(row.active_company_context_valid),
    profile_complete: normalizeBoolean(row.profile_complete),
    owner_invariant_ok: normalizeBoolean(row.owner_invariant_ok),
    active_owner_count: normalizeNumber(row.active_owner_count),
    active_member_count: normalizeNumber(row.active_member_count),
    active_role_assignment_count: normalizeNumber(row.active_role_assignment_count),
    role_presets_ready: normalizeBoolean(row.role_presets_ready),
    owner_role_ready: normalizeBoolean(row.owner_role_ready),
    relationship_readiness: normalizeObject(row.relationship_readiness),
    assignment_readiness: normalizeObject(row.assignment_readiness),
    dashboard_readiness: normalizeObject(row.dashboard_readiness),
    audit_readiness: normalizeObject(row.audit_readiness),
    setup_complete: normalizeBoolean(row.setup_complete),
    setup_blockers: normalizeArray(row.setup_blockers),
    checklist: normalizeArray(row.checklist),
  };
}

export async function getCompanySetupContext() {
  const { data, error } = await supabase.rpc("rpc_company_setup_context");
  if (error) throw error;

  const row = firstRow(data);
  return row ? normalizeCompanySetupContext(row) : null;
}
