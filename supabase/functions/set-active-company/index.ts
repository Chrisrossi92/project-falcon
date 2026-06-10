import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ErrorCode =
  | "unauthenticated"
  | "invalid_company_id"
  | "app_user_not_found"
  | "company_not_found"
  | "company_inactive"
  | "company_membership_required"
  | "membership_inactive"
  | "metadata_update_failed"
  | "audit_write_failed";

type RequestBody = {
  company_id?: unknown;
  active_company_id?: unknown;
  reason?: unknown;
  request_id?: unknown;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json",
    },
  });
}

function errorResponse(code: ErrorCode, message: string, status: number) {
  return jsonResponse({ ok: false, code, message }, status);
}

function bearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function activeCompanyClaim(appMetadata: Record<string, unknown>) {
  const active = appMetadata.active_company_id;
  const current = appMetadata.current_company_id;
  return {
    active_company_id: typeof active === "string" ? active : null,
    current_company_id: typeof current === "string" ? current : null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse("invalid_company_id", "Use POST with a valid company id.", 405);
  }

  const token = bearerToken(req);
  if (!token) {
    return errorResponse("unauthenticated", "Sign in before switching companies.", 401);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return errorResponse("invalid_company_id", "A valid company id is required.", 400);
  }

  const requestedCompanyId = body.company_id ?? body.active_company_id;

  if (!isUuid(requestedCompanyId)) {
    return errorResponse("invalid_company_id", "A valid company id is required.", 400);
  }

  const companyId = requestedCompanyId.trim().toLowerCase();
  const reason = optionalText(body.reason, 240);
  const requestId = optionalText(body.request_id, 120);

  const { data: authData, error: authError } = await serviceClient.auth.getUser(token);
  const authUser = authData?.user ?? null;

  if (authError || !authUser) {
    return errorResponse("unauthenticated", "Sign in before switching companies.", 401);
  }

  const { data: appUser, error: appUserError } = await serviceClient
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (appUserError) {
    console.error("[set-active-company] app user lookup failed", appUserError);
    return errorResponse("app_user_not_found", "Your Falcon user profile could not be resolved.", 403);
  }

  if (!appUser?.id) {
    return errorResponse("app_user_not_found", "Your Falcon user profile could not be resolved.", 403);
  }

  const { data: company, error: companyError } = await serviceClient
    .from("companies")
    .select("id, slug, name, status")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) {
    console.error("[set-active-company] company lookup failed", companyError);
    return errorResponse("company_not_found", "That company could not be found.", 404);
  }

  if (!company?.id) {
    return errorResponse("company_not_found", "That company could not be found.", 404);
  }

  if (company.status !== "active") {
    return errorResponse("company_inactive", "That company is not active.", 403);
  }

  const { data: membership, error: membershipError } = await serviceClient
    .from("company_memberships")
    .select("id, status")
    .eq("company_id", companyId)
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (membershipError) {
    console.error("[set-active-company] membership lookup failed", membershipError);
    return errorResponse("company_membership_required", "You do not have access to that company.", 403);
  }

  if (!membership?.id) {
    return errorResponse("company_membership_required", "You do not have access to that company.", 403);
  }

  if (membership.status !== "active") {
    return errorResponse("membership_inactive", "Your access to that company is not active.", 403);
  }

  const previousAppMetadata = (authUser.app_metadata ?? {}) as Record<string, unknown>;
  const previousActiveCompany = activeCompanyClaim(previousAppMetadata);
  const nextAppMetadata = {
    ...previousAppMetadata,
    active_company_id: companyId,
    current_company_id: companyId,
  };

  const { error: metadataError } = await serviceClient.auth.admin.updateUserById(authUser.id, {
    app_metadata: nextAppMetadata,
  });

  if (metadataError) {
    console.error("[set-active-company] metadata update failed", metadataError);
    return errorResponse("metadata_update_failed", "Company switch could not be saved.", 500);
  }

  const { error: auditError } = await serviceClient.from("company_audit_events").insert({
    company_id: companyId,
    actor_user_id: appUser.id,
    actor_auth_id: authUser.id,
    actor_kind: "service_role",
    event_type: "company.active_company_changed",
    target_type: "company",
    target_id: companyId,
    metadata: {
      previous_active_company_claim: previousActiveCompany,
      target_company_slug: company.slug,
      target_company_name: company.name,
      reason,
      request_id: requestId,
    },
    idempotency_key: requestId,
  });

  if (auditError) {
    console.error("[set-active-company] audit write failed", auditError);
    return errorResponse("audit_write_failed", "Company switch was saved, but audit logging failed.", 500);
  }

  return jsonResponse({
    ok: true,
    company_id: company.id,
    company_slug: company.slug,
    company_name: company.name,
    company_status: company.status,
    membership_id: membership.id,
    session_refresh_required: true,
  });
});
